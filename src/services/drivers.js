import API_BASE_URL from "../config/api";

export async function getDrivers() {
  const res = await fetch(`${API_BASE_URL}/api/drivers`);
  return res.json();
}
