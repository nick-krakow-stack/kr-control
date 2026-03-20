// API-Konfiguration
// Für lokale Entwicklung: http://localhost:8000
// Für Produktion: https://deine-backend-url.railway.app
export const API_BASE = "http://localhost:8000";

export const STATUS_LABELS = {
  new: "Neu",
  in_progress: "In Bearbeitung",
  ticket_issued: "Ticket ausgestellt",
  ordnungsamt: "Ordnungsamt angefragt",
  letter_sent: "Brief versandt",
  paid: "Bezahlt",
  closed: "Geschlossen",
};

export const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  ticket_issued: "bg-yellow-100 text-yellow-800",
  ordnungsamt: "bg-purple-100 text-purple-800",
  letter_sent: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  closed: "bg-slate-100 text-slate-600",
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
