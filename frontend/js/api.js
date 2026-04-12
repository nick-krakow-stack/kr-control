import { API_BASE } from "./config.js";

const getToken = () => localStorage.getItem("kr_token");

function buildQuery(params) {
  if (!params) return '';
  const q = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? '?' + q : '';
}

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
  getMyPermissions: () => request("GET", "/api/auth/me/permissions"),

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
  getReport: (from, to) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return request("GET", `/api/stats/report${q.toString() ? "?" + q.toString() : ""}`);
  },

  // Locations
  getLocations: () => request("GET", "/api/locations"),
  getLocation: (id) => request("GET", `/api/locations/${id}`),
  createLocation: (data) => request("POST", "/api/locations", data),
  updateLocation: (id, data) => request("PUT", `/api/locations/${id}`, data),
  updateLocationFees: (id, data) => request("PATCH", `/api/locations/${id}/fees`, data),
  deleteLocation: (id) => request("DELETE", `/api/locations/${id}`),

  // Cases
  getCases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request("GET", `/api/cases${q ? "?" + q : ""}`);
  },
  getCase: (id) => request("GET", `/api/cases/${id}`),
  createCase: (formData) => request("POST", "/api/cases", formData, true),
  updateStatus: (id, data) => request("PATCH", `/api/cases/${id}/status`, data),
  updateCaseOwner: (id, data) => request("PATCH", `/api/cases/${id}/owner`, data),
  recallCase: (id) => request("POST", `/api/cases/${id}/recall`),
  deleteCase: (id) => request("DELETE", `/api/cases/${id}`),
  anonymizeCase: (id) => request("POST", `/api/cases/${id}/anonymize`, {}),
  getCaseEvents: (caseId) => request("GET", `/api/case-events/${caseId}`),

  // Users (self-service profile)
  getProfile: () => request("GET", "/api/users/me/profile"),
  updateProfile: (data) => request("PATCH", "/api/users/me/profile", data),

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

  shifts: {
    list: (params) => request("GET", "/api/shifts" + buildQuery(params)),
    create: (data) => request("POST", "/api/shifts", data),
    end: (id) => request("PATCH", "/api/shifts/" + id + "/end", {}),
    stats: () => request("GET", "/api/shifts/stats"),
  },
  customers: {
    list: () => request("GET", "/api/customers"),
    create: (data) => request("POST", "/api/customers", data),
    get: (id) => request("GET", "/api/customers/" + id),
    update: (id, data) => request("PUT", "/api/customers/" + id, data),
    delete: (id) => request("DELETE", "/api/customers/" + id),
    invite: (id) => request("POST", "/api/customers/" + id + "/invite", {}),
    getPermissions: (id) => request("GET", "/api/customers/" + id).then((d) => d.permissions ?? []),
    setPermissions: (id, permissions) => request("PUT", "/api/customers/" + id + "/permissions", { permissions }),
  },
  groups: {
    list: () => request("GET", "/api/groups"),
    create: (data) => request("POST", "/api/groups", data),
    update: (id, data) => request("PATCH", "/api/groups/" + id, data),
    delete: (id) => request("DELETE", "/api/groups/" + id),
    getMembers: (id) => request("GET", "/api/groups/" + id + "/members"),
  },
  assignUserGroups: (userId, group_ids) => request("PUT", "/api/users/" + userId + "/groups", { group_ids }),
  whitelist: {
    list: (params) => request("GET", "/api/whitelist" + buildQuery(params)),
    create: (data) => request("POST", "/api/whitelist", data),
    update: (id, data) => request("PUT", "/api/whitelist/" + id, data),
    delete: (id) => request("DELETE", "/api/whitelist/" + id),
  },
  workTimes: {
    list: () => request("GET", "/api/work-times"),
    create: (data) => request("POST", "/api/work-times", data),
    review: (id, data) => request("PATCH", "/api/work-times/" + id, data),
  },
  violations: {
    list: (params) => request("GET", "/api/violations" + buildQuery(params)),
    listAdmin: () => request("GET", "/api/violations/admin"),
    create: (data) => request("POST", "/api/violations", data),
    update: (id, data) => request("PATCH", "/api/violations/" + id, data),
    delete: (id) => request("DELETE", "/api/violations/" + id),
    getLocationPriority: (locationId) => request("GET", "/api/violations/location/" + locationId + "/priority"),
    setLocationPriority: (locationId, violation_ids) => request("PUT", "/api/violations/location/" + locationId + "/priority", { violation_ids }),
  },
  vehicleTypes: {
    list: (locationId) => request("GET", "/api/vehicle-types" + (locationId ? "?locationId=" + locationId : "")),
    listAll: () => request("GET", "/api/vehicle-types/all"),
    create: (data) => request("POST", "/api/vehicle-types", data),
    update: (id, data) => request("PATCH", "/api/vehicle-types/" + id, data),
    delete: (id) => request("DELETE", "/api/vehicle-types/" + id),
    getLocationPriority: (locationId) => request("GET", "/api/vehicle-types/location-priority/" + locationId),
    setLocationPriority: (data) => request("POST", "/api/vehicle-types/location-priority", data),
    deleteLocationPriority: (locationId, vehicleTypeId) => request("DELETE", "/api/vehicle-types/location-priority/" + locationId + "/" + vehicleTypeId),
  },
  updateVehicleType: (caseId, vehicleTypeId) => request("PATCH", "/api/cases/" + caseId + "/vehicle-type", { vehicle_type_id: vehicleTypeId }),
  caseFees: {
    list: (caseId) => request("GET", "/api/case-fees/case/" + caseId),
    addFollowup: (caseId, data) => request("POST", "/api/case-fees/case/" + caseId + "/followup", data),
    getTemplates: () => request("GET", "/api/case-fees/templates"),
    getAllTemplates: () => request("GET", "/api/case-fees/templates/all"),
    createTemplate: (data) => request("POST", "/api/case-fees/templates", data),
    updateTemplate: (id, data) => request("PATCH", "/api/case-fees/templates/" + id, data),
    deleteTemplate: (id) => request("DELETE", "/api/case-fees/templates/" + id),
  },
  updateFeeStage: (caseId, stage) => request("PATCH", "/api/cases/" + caseId + "/fee-stage", { stage }),
  secondChanceRequest: (data) => request("POST", "/api/cases/second-chance-request", data),
};
