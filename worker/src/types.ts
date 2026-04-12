export type Env = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SECRET_KEY: string;
  RESEND_API_KEY: string;
  FRONTEND_URL: string;
  SMTP_FROM: string;
  SMTP_FROM_NAME: string;
  FIRST_ADMIN_USERNAME: string;
  FIRST_ADMIN_EMAIL: string;
  FIRST_ADMIN_PASSWORD: string;
  DEFAULT_RECALL_HOURS: string;
  ACCESS_TOKEN_EXPIRE_MINUTES: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  hashed_password: string | null;
  role: string;
  is_active: number;
  email_verified: number;
  recall_hours: number;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
  created_by_id: number | null;
  location_ids?: number[];
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  hourly_rate: number | null;
};

export type Location = {
  id: number;
  name: string;
  address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  spots_count: number;
  max_duration_minutes: number;
  client_name: string | null;
  contract_type: string;
  notes: string | null;
  created_at: string;
  cases_count?: number;
  fee_ticket: number | null;
  fee_letter: number | null;
  customer_id: number | null;
  customer_name?: string | null;
};

export type Case = {
  id: number;
  location_id: number;
  license_plate: string;
  reported_at: string;
  notes: string | null;
  status: string;
  case_type: string;
  ticket_number: string | null;
  payment_deadline: string | null;
  ordnungsamt_requested_at: string | null;
  letter_sent_at: string | null;
  created_at: string;
  recall_deadline: string | null;
  recalled_at: string | null;
  reported_by_user_id: number | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_street: string | null;
  owner_zip: string | null;
  owner_city: string | null;
  anonymized_at: string | null;
  closed_reason: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  closed_at: string | null;
  shift_id: number | null;
  offer_expires_at?: number | null;
  stage_2_due_at?: number | null;
  current_fee_stage?: number;
  fee_stage_locked?: number;
  vehicle_type_number?: string | null;
  vehicle_type_name?: string | null;
  violation_code?: string | null;
  violation_description?: string | null;
  violation_fee_override?: number | null;
};

export type CaseImage = {
  id: number;
  case_id: number;
  filename: string;
  original_filename: string | null;
  image_type: string;
  gps_lat: number | null;
  gps_lng: number | null;
  captured_at: string | null;
  uploaded_at: string;
};

export type CaseEvent = {
  id: number;
  case_id: number;
  user_id: number | null;
  action: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  username?: string; // joined from users
};

export const SELF_CONTROL_ROLES = new Set(["self_control_business", "self_control_private"]);
export const STAFF_ROLES = new Set(["admin", "mitarbeiter", "buchhaltung"]);
export const VALID_ROLES = new Set(["admin", "mitarbeiter", "buchhaltung", "self_control_business", "self_control_private"]);
export const BUCHHALTUNG_ADMIN_ROLES = new Set(["admin", "buchhaltung"]);
export const VALID_STATUSES = new Set(["new", "pending", "recalled", "letter_sent", "ordnungsamt", "paid", "closed", "second_chance"]);

export interface Shift {
  id: number;
  user_id: number;
  location_id: number;
  started_at: string;
  ended_at: string | null;
  case_count: number;
  username?: string;
  location_name?: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  user_id: number | null;
  is_active: number;
  created_at: string;
  location_count?: number;
  email_verified?: number;
}

export interface WhitelistEntry {
  id: number;
  location_id: number;
  license_plate: string;
  valid_from: string | null;
  valid_until: string | null;
  note: string | null;
  created_at: string;
  location_name?: string;
}

export interface CaseFee {
  id: number;
  case_id: number;
  stage: number;
  amount: number;
  label: string | null;
  recorded_at: number;
  recorded_by: number | null;
}

export interface FollowupCostTemplate {
  id: number;
  label: string;
  amount: number | null;
  sort_order: number;
  is_active: number;
}

export interface Violation {
  id: number;
  code: string;
  description: string;
  fee_override: number | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  location_sort_order?: number | null;
}

export interface VehicleType {
  id: number;
  number: string;
  name: string;
  sort_order: number;
  is_active: number;
  effective_sort?: number;
}

export const ALL_PERMISSIONS = {
  // Kunden-Sichtbarkeit
  view_violator_details:  { label: "Falschparker-Details sehen (Kennzeichen, Fahrzeug)", roles: ["self_control_business", "self_control_private"] },
  view_case_images:       { label: "Fall-Fotos sehen", roles: ["self_control_business", "self_control_private"] },
  view_case_amounts:      { label: "Gebührenbeträge sehen", roles: ["self_control_business", "self_control_private", "buchhaltung"] },
  view_stats_basic:       { label: "Basis-Statistiken (Gesamtquoten)", roles: ["self_control_business", "self_control_private"] },
  view_stats_detailed:    { label: "Detaillierte Statistiken (nach Tatbestand/Fahrzeugtyp)", roles: ["self_control_business", "self_control_private"] },
  view_controller_times:  { label: "Kontrollzeiten der Mitarbeiter sehen", roles: ["self_control_business", "self_control_private"] },
  // Mitarbeiter-Berechtigungen
  edit_vehicle_types:     { label: "Fahrzeugtypen bearbeiten", roles: ["mitarbeiter"] },
  edit_violations:        { label: "Tatbestände bearbeiten", roles: ["mitarbeiter"] },
  edit_whitelist:         { label: "Whitelist verwalten", roles: ["mitarbeiter"] },
  view_reports:           { label: "Auswertungs-Dashboard", roles: ["mitarbeiter", "buchhaltung"] },
  manage_shifts:          { label: "Schichten verwalten", roles: ["mitarbeiter"] },
  // Buchhaltung
  export_data:            { label: "Daten exportieren", roles: ["buchhaltung"] },
} as const;

export type PermissionKey = keyof typeof ALL_PERMISSIONS;

export interface Group {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  permissions?: string[];
  member_count?: number;
}
