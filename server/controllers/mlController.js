import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const mlDir = path.join(projectRoot, "ml");
const predictScript = path.join(mlDir, "predict.py");

function spawnPython(command, args) {
  return spawn(command, args, { cwd: mlDir, windowsHide: true });
}

function runPredictScript(orderPayload) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(orderPayload);
    const explicitBin = process.env.PYTHON_BIN;
    const candidates = explicitBin ? [[explicitBin, [predictScript, "--stdin"]]] : [
      ["python", [predictScript, "--stdin"]],
      ["py", ["-3", predictScript, "--stdin"]],
    ];

    const attempt = (index) => {
      if (index >= candidates.length) {
        reject(new Error("Unable to execute Python. Set PYTHON_BIN environment variable."));
        return;
      }

      const [cmd, args] = candidates[index];
      const py = spawnPython(cmd, args);
      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      py.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      py.on("error", () => {
        attempt(index + 1);
      });

      py.stdin.on("error", () => {
        // Ignore broken pipe errors; process close handler will surface failures.
      });
      py.stdin.write(payload);
      py.stdin.end();

      py.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || stdout || `Python process exited with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (_error) {
          reject(new Error(`Could not parse Python output: ${stdout}`));
        }
      });
    };

    attempt(0);
  });
}

export async function predictCost(req, res) {
  try {
    const orderData = req.body;
    if (!orderData || typeof orderData !== "object") {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const prediction = await runPredictScript(orderData);

    if (prediction.error) {
      return res.status(400).json({ error: prediction.error });
    }

    return res.json(prediction);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Prediction failed." });
  }
}
