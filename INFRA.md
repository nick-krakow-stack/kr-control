# KR Control — Infrastruktur-Referenz

> Dieses Dokument ist die einzige Quelle für alle Pfade, Zugangsdaten, Deployment-Befehle und Infrastruktur-Details.
> Wird von Claude und Sub-Agents als Referenz verwendet. Bitte nach jeder relevanten Änderung aktualisieren.

---

## Verzeichnisse

| Bezeichnung       | Pfad                                      |
|-------------------|-------------------------------------------|
| Projekt-Root      | `c:\Users\email\kr-control`               |
| Worker (Backend)  | `c:\Users\email\kr-control\worker`        |
| Frontend          | `c:\Users\email\kr-control\frontend`      |
| Memory            | `C:\Users\email\.claude\projects\c--Users-email-kr-control\memory\` |

---

## Laufzeitumgebung (Windows)

| Tool      | Pfad / Befehl                                              |
|-----------|------------------------------------------------------------|
| Node.js   | `C:\Program Files\nodejs`                                  |
| npm / npx | über Node.js PATH (ggf. `$env:PATH += ";C:\Program Files\nodejs"` in PowerShell) |
| Wrangler  | `npx wrangler` (kein globales Install nötig, via npx)      |
| Shell     | PowerShell (Windows) oder bash via Git Bash                |

**Wichtig:** Vor Wrangler-Befehlen in PowerShell immer prüfen ob Node im PATH ist:
```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd c:\Users\email\kr-control\worker
```

---

## Cloudflare

| Ressource        | Name / ID                                      |
|------------------|------------------------------------------------|
| Account ID       | `88ec96f4b844479d68df37f96624ba55`             |
| Worker Name      | `kr-control-api`                               |
| Worker URL       | `https://kr-control-api.gndnick.workers.dev`   |
| D1 Database Name | `kr-control-db`                                |
| D1 Database ID   | `b7ac8fc8-fc79-4bec-99d7-cbe842b72f91`         |
| R2 Bucket        | `kr-control-uploads`                           |
| Pages Project    | `kr-control`                                   |
| Pages URL        | `https://kr-control.pages.dev`                 |

---

## Git

| Einstellung    | Wert                                                        |
|----------------|-------------------------------------------------------------|
| Haupt-Branch   | `main`                                                      |
| Remote         | GitHub (nick-krakow-stack Organisation)                     |
| Deploy-Branch  | Cloudflare Pages trackt `main` automatisch (direkte CLI-Uploads per wrangler) |

---

## Deployment-Befehle

### Worker deployen
```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd c:\Users\email\kr-control\worker
npx wrangler deploy
```

### Pages (Frontend) deployen
```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd c:\Users\email\kr-control\worker
npx wrangler pages deploy ../frontend --project-name kr-control
```

### D1 Migration ausführen (production)
```powershell
$env:PATH += ";C:\Program Files\nodejs"
cd c:\Users\email\kr-control\worker
npx wrangler d1 execute kr-control-db --remote --command "ALTER TABLE ..."
```

### D1 Migration lokal (dev)
```powershell
npx wrangler d1 execute kr-control-db --local --command "..."
```

---

## Service Worker Cache-Versionen

| Version        | Wann                              |
|----------------|-----------------------------------|
| kr-control-v22 | Aktuell (Stand: 2026-04-10) — Fahrzeugtypen-Feature (vehicle_types, vehicle_type_location_priority, admin-vehicle-types.js) |
| kr-control-v21 | Gebührenstufen (case_fees, followup_cost_templates, fee settings), Stufen-Block in Fall-Detail, Zahlungs-Modal |
| kr-control-v20 | Tatbestände (violations + violation_location_priority), Violation-Picker in Fallerfassung, Standort-Priorisierung |
| kr-control-v19 | (übersprungen / war lokal) |
| kr-control-v18 | Mobile Bottom Nav, Arbeitszeiten, Second-Chance-Request, Admin Panel Hub |
| kr-control-v17 | Kontrolle-Workflow, Kunden, Whitelist, Second-Chance, Schichten-Stats |
| kr-control-v16 | Datenschutz, Halterdaten, Buchhaltung-Rolle |
| kr-control-v15 | Live-Suche, Gebühren-Fix |
| kr-control-v14 | Auswertung / Report-Endpoint |
| kr-control-v13 | Audit-Log / case_events |

Cache muss immer gebumpt werden wenn neue JS-Dateien in STATIC_ASSETS aufgenommen werden.

---

## Aktueller Schema-Stand

### Tabellen
- `users` — Auth, Rollen: admin, mitarbeiter, buchhaltung, self_control_business, self_control_private
- `user_locations` — N:M Zuweisung
- `locations` — Parkplätze, inkl. `fee_ticket`, `fee_letter` (REAL, nullable), `customer_id` (FK → customers)
- `cases` — Fälle mit Status-Flow; Felder: `owner_first_name/last_name/street/zip/city`, `paid_at`, `paid_amount`, `closed_at`, `closed_reason` (manual/abandoned), `anonymized_at`, `shift_id` (FK → shifts)
- `case_images` — Fotos (in R2), werden bei Anonymisierung gelöscht
- `settings` — Key/Value, aktuell: `fee_ticket_default=35`, `fee_letter_default=15`
- `case_events` — Audit-Log (actions: created, status_changed, recalled, deleted, owner_updated)
- `customers` — Kunden; Felder: name, email, phone, user_id (FK → users), is_active
- `shifts` — Kontroll-Schichten; Felder: user_id, location_id, started_at, ended_at, case_count
- `whitelist` — Berechtigte Kennzeichen; Felder: location_id, license_plate, valid_from, valid_until, note
- `work_time_requests` — Arbeitszeitanfragen; Felder: user_id, started_at, ended_at, note, status (pending/approved/rejected), reviewed_by, review_note
- `violations` — Tatbestände; Felder: code (UNIQUE), description, fee_override (REAL nullable), is_active (DEFAULT 1), sort_order (DEFAULT 0)
- `violation_location_priority` — Standort-spezifische Sortierung; Felder: violation_id (FK), location_id (FK), sort_order; UNIQUE(violation_id, location_id)
- `cases` hat zusätzlich: violation_id (FK → violations, nullable), offer_expires_at (INTEGER unix), stage_2_due_at (INTEGER unix), current_fee_stage (INTEGER DEFAULT 0), fee_stage_locked (INTEGER DEFAULT 0)
- `case_fees` — Gebühren-Snapshots/Folgekosten; Felder: case_id (FK), stage, amount, label, recorded_at (INTEGER unix), recorded_by (FK → users)
- `followup_cost_templates` — Folgekosten-Vorlagen; Felder: label, amount (REAL nullable = Freifeld), sort_order, is_active
- `settings` hat zusätzlich: fee_offer (17.85), fee_full (30.00), fee_holder_surcharge (5.10)
- `vehicle_types` — Fahrzeugtypen; Felder: number (TEXT UNIQUE), name (TEXT), sort_order (DEFAULT 0), is_active (DEFAULT 1); 21 Typen vorbelegt (PKW bis landw. Zugmaschine m. Anhänger)
- `vehicle_type_location_priority` — Standort-spezifische Sortierung; Felder: vehicle_type_id (FK), location_id (FK), sort_order; UNIQUE(vehicle_type_id, location_id)
- `cases` hat zusätzlich: vehicle_type_number (TEXT, Snapshot), vehicle_type_name (TEXT, Snapshot), violation_code (TEXT, Snapshot), violation_description (TEXT, Snapshot), violation_fee_override (REAL, Snapshot)

---

## Umgebungsvariablen (Worker Secrets)

Secrets werden über Cloudflare Dashboard oder `wrangler secret put` gesetzt — nicht in wrangler.toml:
- `SECRET_KEY` — JWT-Signierung
- `RESEND_API_KEY` — E-Mail-Versand via Resend
- `FIRST_ADMIN_PASSWORD` — Initial-Admin-Passwort (nur beim ersten Start relevant)

Vars (in wrangler.toml, kein Secret):
- `FRONTEND_URL = "https://kr-control.pages.dev"`
- `SMTP_FROM = "noreply@dragoncity.eu"`
- `SMTP_FROM_NAME = "KR Control"`
- `DEFAULT_RECALL_HOURS = "24"`
- `ACCESS_TOKEN_EXPIRE_MINUTES = "1440"`
