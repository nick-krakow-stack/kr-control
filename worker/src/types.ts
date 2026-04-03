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
export const STAFF_ROLES = new Set(["admin", "mitarbeiter"]);
export const VALID_ROLES = new Set(["admin", "mitarbeiter", "self_control_business", "self_control_private"]);
