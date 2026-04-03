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
    localStorage.removeItem("kr_user");
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login fehlgeschlagen" }));
      throw new Error(err.detail || "Login fehlgeschlagen");
    }
    return res.json();
  },

  getMe: () => request("GET", "/api/auth/me"),

  async setupPassword(token, password) {
    const res = await fetch(`${API_BASE}/api/auth/setup-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Fehler" }));
      throw new Error(err.detail || "Fehler");
    }
    return res.json();
  },

  changePassword: (data) => request("POST", "/api/auth/change-password", data),
  forgotPassword: (email) => request("POST", "/api/auth/forgot-password", { email }),
  resetPassword: (token, password) => request("POST", "/api/auth/reset-password", { token, password }),

  // Stats
  getStats: () => request("GET", "/api/stats"),

  // Locations
  getLocations: () => request("GET", "/api/locations"),
  getLocation: (id) => request("GET", `/api/locations/${id}`),
  createLocation: (data) => request("POST", "/api/locations", data),
  updateLocation: (id, data) => request("PUT", `/api/locations/${id}`, data),
  deleteLocation: (id) => request("DELETE", `/api/locations/${id}`),

  // Cases
  getCases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request("GET", `/api/cases${q ? "?" + q : ""}`);
  },
  getCase: (id) => request("GET", `/api/cases/${id}`),
  createCase: (formData) => request("POST", "/api/cases", formData, true),
  updateStatus: (id, data) => request("PATCH", `/api/cases/${id}/status`, data),
  recallCase: (id) => request("POST", `/api/cases/${id}/recall`),
  deleteCase: (id) => request("DELETE", `/api/cases/${id}`),
  getCaseEvents: (caseId) => request("GET", `/api/case-events/${caseId}`),

  // Users (Admin)
  getUsers: () => request("GET", "/api/users"),
  getUser: (id) => request("GET", `/api/users/${id}`),
  createUser: (data) => request("POST", "/api/users", data),
  updateUser: (id, data) => request("PUT", `/api/users/${id}`, data),
  deleteUser: (id) => request("DELETE", `/api/users/${id}`),
  assignLocations: (id, location_ids) => request("PUT", `/api/users/${id}/locations`, { location_ids }),
  resendInvite: (id) => request("POST", `/api/users/${id}/resend-invite`),

  // Settings (Admin)
  getSettings: () => request("GET", "/api/settings"),
  updateSettings: (data) => request("PUT", "/api/settings", data),

  imageUrl: (filename) => `${API_BASE}/uploads/${filename}`,
};
