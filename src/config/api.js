const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://urbanflow-logisticsnow.onrender.com";

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default API_BASE_URL;
