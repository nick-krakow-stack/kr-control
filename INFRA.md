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
| kr-control-v14 | Aktuell (Stand: 2026-04-03) — Auswertung / Report-Endpoint (`GET /api/stats/report`) |
| kr-control-v13 | Audit-Log / case_events |
| kr-control-v12 | case-detail.js Statusaktualisierung |
| kr-control-v11 | Phase 1: ticket.js, password-*.js |

Cache muss immer gebumpt werden wenn neue JS-Dateien in STATIC_ASSETS aufgenommen werden.

---

## Aktueller Schema-Stand

### Tabellen
- `users` — Auth, Rollen, Einladungs-Tokens
- `user_locations` — N:M Zuweisung
- `locations` — Parkplätze, inkl. `fee_ticket`, `fee_letter` (REAL, nullable)
- `cases` — Fälle mit Status-Flow
- `case_images` — Fotos (in R2)
- `settings` — Key/Value, aktuell: `fee_ticket_default=35`, `fee_letter_default=15`
- `case_events` — Audit-Log (actions: created, status_changed, recalled, deleted)

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
