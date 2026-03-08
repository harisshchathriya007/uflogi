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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fallbackPredictCost(orderPayload) {
  const distanceKm = toNumber(orderPayload.distance_km, 0);
  const weight = toNumber(orderPayload.weight, 0);
  const volume = toNumber(orderPayload.volume, 0);
  const priorityNum = toNumber(orderPayload.priority_num, 1);
  const fuelUsed = toNumber(orderPayload.fuel_used, 0);
  const timeRemainingHr = toNumber(orderPayload.time_remaining_hr, 0);

  const baseFare = 45;
  const distanceCost = distanceKm * 9.5;
  const weightCost = weight * 0.22;
  const volumeCost = volume * 11;
  const fuelCost = fuelUsed * 80;
  const urgencyCost = Math.max(0, priorityNum - 1) * 35;
  const deadlineFactor = timeRemainingHr > 0 ? Math.max(0, (6 - timeRemainingHr) * 6) : 0;

  const raw = baseFare + distanceCost + weightCost + volumeCost + fuelCost + urgencyCost + deadlineFactor;
  const predictedCost = Number(Math.max(raw, baseFare).toFixed(2));

  return {
    predicted_cost: predictedCost,
    currency: "INR",
    model: "js-fallback",
    note: "Python runtime unavailable in current deployment. Using fallback estimator.",
  };
}

export async function predictCost(req, res) {
  try {
    const orderData = req.body;
    if (!orderData || typeof orderData !== "object") {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }

    const isVercel = process.env.VERCEL === "1";
    const forceFallback = process.env.ML_FALLBACK_ONLY === "1";
    const useFallbackByDefault = isVercel && process.env.ENABLE_PYTHON_ON_VERCEL !== "1";

    let prediction;
    if (forceFallback || useFallbackByDefault) {
      prediction = fallbackPredictCost(orderData);
    } else {
      try {
        prediction = await runPredictScript(orderData);
      } catch (_error) {
        prediction = fallbackPredictCost(orderData);
      }
    }

    if (prediction.error) {
      return res.status(400).json({ error: prediction.error });
    }

    return res.json(prediction);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Prediction failed." });
  }
}
