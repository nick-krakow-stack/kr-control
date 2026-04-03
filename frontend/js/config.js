// API-Konfiguration
export const API_BASE = "https://kr-control-api.gndnick.workers.dev";

export const STATUS_LABELS = {
  pending: "Ausstehend",
  new: "Neu",
  in_progress: "In Bearbeitung",
  ticket_issued: "Ticket ausgestellt",
  ordnungsamt: "Ordnungsamt angefragt",
  letter_sent: "Brief versandt",
  paid: "Bezahlt",
  closed: "Geschlossen",
  recalled: "Widerrufen",
};

export const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  ticket_issued: "bg-yellow-100 text-yellow-800",
  ordnungsamt: "bg-purple-100 text-purple-800",
  letter_sent: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  closed: "bg-slate-100 text-slate-600",
  recalled: "bg-rose-100 text-rose-700",
};

export const CASE_TYPE_LABELS = {
  standard: "Standard (KR)",
  self_control_ticket: "Self-Control + Ticket",
  self_control_direct: "Self-Control direkt",
};

export const CONTRACT_TYPE_LABELS = {
  standard: "Standard",
  self_control: "Self-Control",
};

export const ROLE_LABELS = {
  admin: "Administrator",
  mitarbeiter: "Mitarbeiter",
  buchhaltung: "Buchhaltung",
  self_control_business: "Self-Control Gewerbe",
  self_control_private: "Self-Control Privat",
};

export const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700",
  mitarbeiter: "bg-blue-100 text-blue-700",
  buchhaltung: "bg-teal-100 text-teal-700",
  self_control_business: "bg-purple-100 text-purple-700",
  self_control_private: "bg-slate-100 text-slate-600",
};

// Hilfsfunktionen
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("kr_user") || "null");
  } catch {
    return null;
  }
}

export function isAdmin() {
  return getUser()?.role === "admin";
}

export function isSelfControl() {
  const role = getUser()?.role;
  return role === "self_control_business" || role === "self_control_private";
}

export function isStaff() {
  const role = getUser()?.role;
  return role === "admin" || role === "mitarbeiter" || role === "buchhaltung";
}

export function isBuchhaltungOrAdmin() {
  const role = getUser()?.role;
  return role === "admin" || role === "buchhaltung";
}
