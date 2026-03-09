import { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";

export default function ApiTest() {
  const [status, setStatus] = useState("Checking backend...");
  const [details, setDetails] = useState("");

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        if (!active) return;
        setStatus(data?.status ? "Backend Connected" : "Backend Unavailable");
        setDetails(data?.status || "");
      } catch (_error) {
        if (!active) return;
        setStatus("Backend Unavailable");
        setDetails("Health check failed.");
      }
    }

    checkHealth();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">API Test</p>
        <h1 className="mt-3 text-3xl font-semibold">{status}</h1>
        <p className="mt-4 text-white/70">Backend URL: {API_BASE_URL}</p>
        {details ? <p className="mt-2 text-white/85">{details}</p> : null}
      </div>
    </div>
  );
}
