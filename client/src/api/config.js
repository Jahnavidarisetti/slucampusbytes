export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const config = {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  };

  if (options.body && typeof options.body !== "string") {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message = payload?.error || payload?.message || res.statusText;
    throw new Error(message);
  }

  return payload;
}
