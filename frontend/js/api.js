import { API_BASE } from "./config.js";

const getToken = () => localStorage.getItem("kr_token");

async function request(method, path, body = null, isForm = false) {
  const token = getToken();
  const headers = {};

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const opts = { method, headers };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    localStorage.removeItem("kr_token");
    window.location.hash = "#/login";
    throw new Error("Nicht authentifiziert");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Serverfehler");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  async login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) throw new Error("Login fehlgeschlagen");
    return res.json();
  },

  // Stats
  getStats: () => request("GET", "/api/stats/"),

  // Locations
  getLocations: () => request("GET", "/api/locations/"),
  getLocation: (id) => request("GET", `/api/locations/${id}`),
  createLocation: (data) => request("POST", "/api/locations/", data),
  updateLocation: (id, data) => request("PUT", `/api/locations/${id}`, data),
  deleteLocation: (id) => request("DELETE", `/api/locations/${id}`),

  // Cases
  getCases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request("GET", `/api/cases/${q ? "?" + q : ""}`);
  },
  getCase: (id) => request("GET", `/api/cases/${id}`),
  createCase: (formData) => request("POST", "/api/cases/", formData, true),
  updateStatus: (id, data) => request("PATCH", `/api/cases/${id}/status`, data),
  deleteCase: (id) => request("DELETE", `/api/cases/${id}`),

  imageUrl: (filename) => `${API_BASE}/uploads/${filename}`,
};
