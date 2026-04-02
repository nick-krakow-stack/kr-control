import { CASE_TYPE_LABELS } from "./config.js";

function fmt(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function openTicket(caseData) {
  const c = caseData;
  const locationName = c.location?.name || "–";
  const typeLabel = CASE_TYPE_LABELS[c.case_type] || c.case_type;
  const isSelfControl = c.case_type === "self_control_ticket" || c.case_type === "self_control_direct";

  const deadlineBox = isSelfControl && c.recall_deadline ? `
    <div class="deadline-box">
      <div class="deadline-label">Widerrufsfrist</div>
      <div class="deadline-value">${fmt(c.recall_deadline)} Uhr</div>
      <div class="deadline-hint">Sie können diesen Fall bis zu diesem Zeitpunkt widerrufen.</div>
    </div>` : c.payment_deadline ? `
    <div class="deadline-box">
      <div class="deadline-label">Zahlungsfrist</div>
      <div class="deadline-value">${fmt(c.payment_deadline)} Uhr</div>
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <title>KR Control – Ticket #${c.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
      font-size: 12px;
      line-height: 1.4;
    }
    @page { size: A6 portrait; margin: 10mm; }
    @media screen {
      body { max-width: 105mm; margin: 24px auto; padding: 10mm; border: 1px solid #bbb; border-radius: 4px; }
    }

    /* Header */
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .brand { font-size: 20px; font-weight: 900; letter-spacing: 3px; }
    .brand-sub { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-top: 1px; }
    .doc-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; border-top: 1px solid #ccc; padding-top: 5px; }

    /* Case ID */
    .case-id { text-align: right; font-size: 8px; color: #888; margin-bottom: 6px; }

    /* Plate */
    .plate-wrap { text-align: center; margin: 12px 0; }
    .plate {
      display: inline-flex;
      align-items: stretch;
      border: 3px solid #1a1a1a;
      border-radius: 6px;
      overflow: hidden;
    }
    .plate-eu {
      background: #003399;
      color: #fff;
      width: 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 0;
      flex-shrink: 0;
    }
    .plate-eu svg { display: block; }
    .plate-eu-d { font-size: 8px; font-weight: 900; letter-spacing: 0.5px; line-height: 1; }
    .plate-divider { width: 2px; background: #1a1a1a; flex-shrink: 0; }
    .plate-text {
      font-family: 'Arial Black', Impact, sans-serif;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 3px;
      padding: 4px 10px;
      background: #fff;
      color: #000;
    }

    /* Fields */
    .fields { margin: 10px 0; }
    .field { display: flex; gap: 6px; margin-bottom: 5px; align-items: baseline; }
    .field-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #666; font-weight: bold; min-width: 58px; flex-shrink: 0; }
    .field-value { font-size: 12px; font-weight: 500; }

    /* Divider */
    hr { border: none; border-top: 1px solid #ddd; margin: 8px 0; }

    /* Deadline box */
    .deadline-box {
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 7px 10px;
      margin: 10px 0;
      text-align: center;
    }
    .deadline-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .deadline-value { font-size: 15px; font-weight: 900; margin: 3px 0 1px; }
    .deadline-hint { font-size: 8px; color: #666; }

    /* Footer */
    .footer {
      border-top: 1px solid #ddd;
      padding-top: 7px;
      margin-top: 10px;
      font-size: 8px;
      color: #888;
      text-align: center;
      line-height: 1.5;
    }

    @media print {
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="case-id">Fall-Nr. #${c.id}</div>

  <div class="header">
    <div class="brand">KR CONTROL</div>
    <div class="brand-sub">Parkplatzkontrolle</div>
    <div class="doc-title">Parkverstoß-Protokoll</div>
  </div>

  <div class="plate-wrap">
    <div class="plate">
      <div class="plate-eu">
        <svg viewBox="0 0 12 12" width="14" height="14">
          <circle cx="6" cy="1.5" r="0.7" fill="#FFCC00"/>
          <circle cx="8.6" cy="2.4" r="0.7" fill="#FFCC00"/>
          <circle cx="10.5" cy="4.4" r="0.7" fill="#FFCC00"/>
          <circle cx="11" cy="6.9" r="0.7" fill="#FFCC00"/>
          <circle cx="9.9" cy="9.3" r="0.7" fill="#FFCC00"/>
          <circle cx="7.8" cy="10.9" r="0.7" fill="#FFCC00"/>
          <circle cx="5.2" cy="11.2" r="0.7" fill="#FFCC00"/>
          <circle cx="2.8" cy="10.2" r="0.7" fill="#FFCC00"/>
          <circle cx="1.1" cy="8.2" r="0.7" fill="#FFCC00"/>
          <circle cx="0.7" cy="5.7" r="0.7" fill="#FFCC00"/>
          <circle cx="1.7" cy="3.3" r="0.7" fill="#FFCC00"/>
          <circle cx="3.7" cy="1.7" r="0.7" fill="#FFCC00"/>
        </svg>
        <span class="plate-eu-d">D</span>
      </div>
      <div class="plate-divider"></div>
      <div class="plate-text">${c.license_plate}</div>
    </div>
  </div>

  <div class="fields">
    <div class="field">
      <span class="field-label">Standort</span>
      <span class="field-value">${locationName}</span>
    </div>
    <div class="field">
      <span class="field-label">Datum</span>
      <span class="field-value">${fmtDate(c.reported_at)}</span>
    </div>
    <div class="field">
      <span class="field-label">Uhrzeit</span>
      <span class="field-value">${fmtTime(c.reported_at)} Uhr</span>
    </div>
    <div class="field">
      <span class="field-label">Art</span>
      <span class="field-value">${typeLabel}</span>
    </div>
    ${c.notes ? `
    <div class="field">
      <span class="field-label">Notiz</span>
      <span class="field-value">${c.notes}</span>
    </div>` : ""}
  </div>

  <hr/>
  ${deadlineBox}

  <div class="footer">
    Dieses Protokoll wurde automatisch durch KR Control erstellt.<br/>
    Fall-Nr. #${c.id} · ${fmt(c.reported_at)} Uhr
  </div>

  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=480,height=680,menubar=no,toolbar=no,location=no");
  if (!win) { alert("Bitte Pop-ups für diese Seite erlauben, um das Ticket zu drucken."); return; }
  win.document.write(html);
  win.document.close();
}
