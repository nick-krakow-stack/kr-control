import { api } from "../api.js";
import { STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS, isSelfControl, isStaff, isBuchhaltungOrAdmin, isAdmin } from "../config.js";
import { openTicket } from "../ticket.js";

export async function renderCaseDetail(id) {
  return `
    <div class="p-6 lg:p-8 max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-8">
        <a href="#/cases" class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Fall #${id}</h1>
          <p class="text-slate-500 text-sm mt-0.5">Details & Bearbeitung</p>
        </div>
      </div>
      <div id="caseDetailContent" class="space-y-6">
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center text-slate-400">
          Lade Fall...
        </div>
      </div>
    </div>
  `;
}

export async function initCaseDetail(id) {
  try {
    const [caseData, locations, events, caseFees, feeSettings] = await Promise.all([
      api.getCase(id),
      api.getLocations(),
      api.getCaseEvents(id).catch(() => []),
      api.caseFees.list(id).catch(() => []),
      api.getSettings().catch(() => ({})),
    ]);
    const location = locations.find((l) => l.id === caseData.location_id);
    renderDetail(caseData, location, events, caseFees, feeSettings);
  } catch (err) {
    document.getElementById("caseDetailContent").innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">Fehler: ${err.message}</div>
    `;
  }
}

function calcCurrentFee(c, settings) {
  const stage = c.current_fee_stage ?? 0;
  const feeOffer = settings.fee_offer ?? 17.85;
  const feeFull = settings.fee_full ?? 30.00;
  const surcharge = settings.fee_holder_surcharge ?? 5.10;
  const feeFullEffective = (c.violation_fee_override != null) ? c.violation_fee_override : feeFull;
  if (stage === 0) return feeOffer;
  if (stage === 1) return feeFullEffective;
  if (stage === 2) return feeFullEffective + surcharge;
  return null;
}

function formatUnixDate(ts) {
  if (!ts) return "–";
  return new Date(ts * 1000).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderDetail(c, location, events = [], caseFees = [], feeSettings = {}) {
  const isDeadlineOver = c.payment_deadline && new Date(c.payment_deadline) < new Date();
  const isOpen = ["new", "ticket_issued", "in_progress"].includes(c.status);
  const canRecall = c.status === "pending" && c.recall_deadline && new Date(c.recall_deadline) > new Date();
  const selfControl = isSelfControl();
  const staff = isStaff();
  const canSeeOwner = isBuchhaltungOrAdmin();

  // Widerruf-Countdown
  let recallCountdown = "";
  if (c.status === "pending" && c.recall_deadline) {
    const msLeft = new Date(c.recall_deadline) - new Date();
    if (msLeft > 0) {
      const hoursLeft = Math.floor(msLeft / 3600000);
      const minsLeft = Math.floor((msLeft % 3600000) / 60000);
      recallCountdown = `${hoursLeft}h ${minsLeft}min`;
    }
  }

  document.getElementById("caseDetailContent").innerHTML = `
    <!-- Header Card -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="text-3xl font-mono font-bold text-slate-800">${c.license_plate}</span>
            <span class="text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}">
              ${STATUS_LABELS[c.status] || c.status}
            </span>
          </div>
          <div class="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>📍 ${location?.name || "Unbekannt"}</span>
            <span>🕐 ${formatDateTime(c.reported_at)}</span>
            <span>📋 ${CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
            ${c.ticket_number ? `<span>🎫 Ticket: ${c.ticket_number}</span>` : ""}
          </div>
          <div class="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
            <span class="flex items-center gap-1">
              🚗
              <span id="vehicleTypeDisplay">${(c.vehicle_type_number && c.vehicle_type_name) ? `[${c.vehicle_type_number}] ${c.vehicle_type_name}` : "—"}</span>
              ${isAdmin() ? `
                <button id="btnEditVehicleType" title="Fahrzeugtyp ändern"
                  class="ml-1 p-0.5 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-600">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
              ` : ""}
            </span>
            ${(c.violation_code || c.violation_description) ? `
              <span>⚠ <span class="font-medium">${c.violation_code || ""}</span>${c.violation_description ? ` — ${c.violation_description}` : ""}</span>
            ` : ""}
          </div>
        </div>

        <div class="flex gap-2 flex-wrap">
          <button id="btnPrintTicket"
            class="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Ticket drucken
          </button>
          ${canRecall && selfControl ? `
            <button id="btnRecall"
              class="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium px-4 py-1.5 rounded-lg transition-colors">
              ↩ Fall widerrufen
              ${recallCountdown ? `<span class="text-xs opacity-70 ml-1">(noch ${recallCountdown})</span>` : ""}
            </button>
          ` : ""}
          ${(c.recall_deadline && new Date(c.recall_deadline) > new Date() && !["closed", "paid", "recalled", "second_chance"].includes(c.status)) ? `
            <button id="btnSecondChance"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
              Second Chance
            </button>
          ` : ""}
          ${!c.anonymized_at && isAdmin() ? `
            <button onclick="confirmAnonymizeCase(${c.id})"
              class="text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
              Anonymisieren
            </button>
          ` : ""}
          ${staff ? `
            <button onclick="showDeleteDialog(${c.id})"
              class="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Fall löschen
            </button>
          ` : ""}
        </div>
      </div>

      ${c.status === "pending" && recallCountdown ? `
        <div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⏳ Dieser Fall kann noch <strong>${recallCountdown}</strong> widerrufen werden.
          Danach wird er automatisch an KR Control übergeben.
        </div>
      ` : ""}

      ${c.status === "recalled" ? `
        <div class="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
          ↩ Dieser Fall wurde${c.recalled_at ? " am " + formatDateTime(c.recalled_at) : ""} widerrufen.
        </div>
      ` : ""}

      <!-- Timeline -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
        <div>
          <div class="text-xs text-slate-400 mb-0.5">Gemeldet</div>
          <div class="text-sm font-medium text-slate-700">${formatDateTime(c.reported_at)}</div>
        </div>
        <div>
          <div class="text-xs text-slate-400 mb-0.5">Zahlungsfrist</div>
          <div class="text-sm font-medium ${isDeadlineOver && isOpen ? "text-red-500" : "text-slate-700"}">
            ${c.payment_deadline ? formatDateTime(c.payment_deadline) : "–"}
            ${isDeadlineOver && isOpen ? " ⚠" : ""}
          </div>
        </div>
        <div>
          <div class="text-xs text-slate-400 mb-0.5">Ordnungsamt</div>
          <div class="text-sm font-medium text-slate-700">${c.ordnungsamt_requested_at ? formatDateTime(c.ordnungsamt_requested_at) : "–"}</div>
        </div>
        <div>
          <div class="text-xs text-slate-400 mb-0.5">Brief versandt</div>
          <div class="text-sm font-medium text-slate-700">${c.letter_sent_at ? formatDateTime(c.letter_sent_at) : "–"}</div>
        </div>
        ${c.status === "paid" && c.paid_amount != null ? `
          <div>
            <div class="text-xs text-slate-400 mb-0.5">Bezahlter Betrag</div>
            <div class="text-sm font-medium text-green-700">${Number(c.paid_amount).toFixed(2)} €</div>
          </div>
        ` : ""}
        ${c.anonymized_at ? `
          <div class="md:col-span-4">
            <div class="text-xs text-slate-400">Anonymisiert am ${formatDateTime(c.anonymized_at)}</div>
          </div>
        ` : ""}
      </div>
    </div>

    <!-- Gebühren-Block (Staff + Buchhaltung) -->
    ${(staff || canSeeOwner) ? (() => {
      const stage = c.current_fee_stage ?? 0;
      const currentFee = calcCurrentFee(c, feeSettings);
      const stageDefs = [
        { n: 0, label: "Sofortangebot", color: "bg-green-100 text-green-700", ring: "ring-green-400" },
        { n: 1, label: "Vollpreis", color: "bg-blue-100 text-blue-700", ring: "ring-blue-400" },
        { n: 2, label: "+Halterabfrage", color: "bg-orange-100 text-orange-700", ring: "ring-orange-400" },
        { n: 3, label: "Folgekosten", color: "bg-red-100 text-red-700", ring: "ring-red-400" },
      ];

      return `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100" id="feesBlock">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-800">Gebühren</h2>
          <div class="flex gap-1.5 flex-wrap">
            ${stageDefs.map((s) => `
              <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${s.color} ${stage === s.n ? `ring-2 ring-offset-1 ${s.ring}` : "opacity-50"}">
                ${s.n}: ${s.label}
              </span>
            `).join("")}
          </div>
        </div>

        <!-- Fälligkeiten -->
        <div class="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div class="bg-green-50 rounded-xl px-4 py-3 ${stage === 0 ? "ring-1 ring-green-300" : ""}">
            <div class="text-xs text-green-600 font-medium mb-0.5">Stufe 0 — Sofort</div>
            <div class="font-bold text-green-800">${(feeSettings.fee_offer ?? 17.85).toFixed(2)} €</div>
            <div class="text-xs text-green-600">ab Fallanlage</div>
          </div>
          <div class="bg-blue-50 rounded-xl px-4 py-3 ${stage === 1 ? "ring-1 ring-blue-300" : ""}">
            <div class="text-xs text-blue-600 font-medium mb-0.5">Stufe 1 — Vollpreis</div>
            <div class="font-bold text-blue-800">${(feeSettings.fee_full ?? 30.00).toFixed(2)} €</div>
            <div class="text-xs text-blue-600">ab ${formatUnixDate(c.offer_expires_at)}</div>
          </div>
          <div class="bg-orange-50 rounded-xl px-4 py-3 ${stage === 2 ? "ring-1 ring-orange-300" : ""}">
            <div class="text-xs text-orange-600 font-medium mb-0.5">Stufe 2 — +Halter</div>
            <div class="font-bold text-orange-800">${((feeSettings.fee_full ?? 30.00) + (feeSettings.fee_holder_surcharge ?? 5.10)).toFixed(2)} €</div>
            <div class="text-xs text-orange-600">ab ${formatUnixDate(c.stage_2_due_at)}</div>
          </div>
        </div>

        <!-- Aktueller Betrag + Aktionen -->
        <div class="flex flex-wrap items-center gap-3">
          ${currentFee != null ? `
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-400 mb-0.5">Aktuell fälliger Betrag</div>
              <div class="text-2xl font-bold text-slate-800">${currentFee.toFixed(2)} €</div>
            </div>
          ` : `
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-400 mb-0.5">Aktuell fälliger Betrag</div>
              <div class="text-sm text-slate-500 font-medium">Folgekosten — individuell</div>
            </div>
          `}
          <div class="flex gap-2 flex-wrap">
            ${c.status !== "paid" && c.status !== "closed" && c.status !== "recalled" ? `
              <button id="btnBookPayment"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Zahlung buchen
              </button>
            ` : ""}
            ${isAdmin() ? `
              <button id="btnChangeStage"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                Stufe wechseln
              </button>
              <button id="btnAddFollowup"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                Folgekosten +
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Case Fees Historie -->
        ${caseFees.length ? `
          <div class="mt-4 pt-4 border-t border-slate-100">
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Gebühren-Historie</div>
            <div class="space-y-1.5">
              ${caseFees.map((f) => {
                const stageColors = ["text-green-700 bg-green-50", "text-blue-700 bg-blue-50", "text-orange-700 bg-orange-50", "text-red-700 bg-red-50"];
                const sc = stageColors[Math.min(f.stage, 3)] || "text-slate-700 bg-slate-50";
                return `
                  <div class="flex items-center gap-3 text-sm py-1.5">
                    <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${sc} flex-shrink-0">S${f.stage}</span>
                    <span class="text-slate-600 flex-1">${f.label || "—"}</span>
                    <span class="font-semibold text-slate-800">${Number(f.amount).toFixed(2)} €</span>
                    <span class="text-xs text-slate-400 flex-shrink-0">${formatUnixDate(f.recorded_at)}</span>
                    ${f.username ? `<span class="text-xs text-slate-400 flex-shrink-0">${f.username}</span>` : ""}
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        ` : ""}
      </div>
      `;
    })() : ""}

    <!-- Status Update (nur für Staff) -->
    ${staff ? `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 class="font-semibold text-slate-800 mb-4">Status aktualisieren</h2>
        <div class="flex flex-wrap gap-2 mb-4">
          ${Object.entries(STATUS_LABELS)
            .filter(([val]) => !["pending", "recalled"].includes(val))
            .map(([val, label]) => `
              <button onclick="setStatus('${val}', ${c.id})"
                class="px-3 py-1.5 text-sm rounded-xl border transition-colors font-medium
                  ${c.status === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }">
                ${label}
              </button>
            `).join("")}
        </div>
        <div class="flex gap-3">
          <input id="ticketNumberInput" type="text" placeholder="Ticket-Nummer (optional)"
            class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            value="${c.ticket_number || ""}"/>
          <input id="statusNoteInput" type="text" placeholder="Notiz (optional)"
            class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
        </div>
        <div id="statusUpdateMsg" class="hidden mt-3 text-sm text-green-600 font-medium">Status aktualisiert ✓</div>
      </div>
    ` : ""}

    <!-- Halterdaten (nur admin/buchhaltung) -->
    ${canSeeOwner ? `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100" id="ownerCard">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-800">Halterdaten</h2>
          ${!c.anonymized_at ? `
            <button id="btnEditOwner" class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">Bearbeiten</button>
          ` : ""}
        </div>
        <div id="ownerDisplay">
          ${(c.owner_first_name || c.owner_last_name) ? `
            <div class="space-y-1 text-sm text-slate-700">
              <div class="font-medium">${[c.owner_first_name, c.owner_last_name].filter(Boolean).join(" ")}</div>
              ${c.owner_street ? `<div>${c.owner_street}</div>` : ""}
              ${(c.owner_zip || c.owner_city) ? `<div>${[c.owner_zip, c.owner_city].filter(Boolean).join(" ")}</div>` : ""}
            </div>
          ` : `
            <div class="text-sm text-slate-400">Noch keine Halterdaten erfasst.</div>
          `}
        </div>
        ${!c.anonymized_at ? `
          <div id="ownerForm" class="hidden space-y-3 mt-2">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Vorname</label>
                <input id="ownerFirstName" type="text" value="${c.owner_first_name || ""}"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Nachname</label>
                <input id="ownerLastName" type="text" value="${c.owner_last_name || ""}"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Straße</label>
              <input id="ownerStreet" type="text" value="${c.owner_street || ""}"
                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">PLZ</label>
                <input id="ownerZip" type="text" value="${c.owner_zip || ""}"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-slate-600 mb-1">Ort</label>
                <input id="ownerCity" type="text" value="${c.owner_city || ""}"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button id="btnSaveOwner"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                Speichern
              </button>
              <button id="btnCancelOwner"
                class="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <span id="ownerSaveMsg" class="hidden text-sm text-green-600 font-medium self-center ml-1">Gespeichert ✓</span>
            </div>
          </div>
        ` : ""}
      </div>
    ` : ""}

    <!-- Notizen -->
    ${c.notes ? `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 class="font-semibold text-slate-800 mb-3">Notizen</h2>
        <pre class="text-sm text-slate-600 whitespace-pre-wrap font-sans">${c.notes}</pre>
      </div>
    ` : ""}

    <!-- Verlauf -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 class="font-semibold text-slate-800 mb-4">Verlauf</h2>
      ${events.length ? `
        <div class="space-y-0">
          ${events.map((ev, i) => {
            const isLast = i === events.length - 1;
            const { icon, color, label } = eventMeta(ev);
            return `
              <div class="flex gap-3 ${isLast ? "" : "pb-4"}">
                <div class="flex flex-col items-center flex-shrink-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm ${color}">${icon}</div>
                  ${isLast ? "" : `<div class="w-0.5 flex-1 bg-slate-100 mt-1"></div>`}
                </div>
                <div class="flex-1 min-w-0 pt-1.5">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="text-sm font-medium text-slate-800">${label}</span>
                    ${ev.username ? `<span class="text-xs text-slate-400">${ev.username}</span>` : ""}
                  </div>
                  ${ev.notes ? `<p class="text-xs text-slate-500 mt-0.5">${ev.notes}</p>` : ""}
                  <p class="text-xs text-slate-400 mt-0.5">${formatDateTime(ev.created_at)}</p>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="text-slate-400 text-sm text-center py-4">Noch keine Ereignisse</div>
      `}
    </div>

    <!-- Fotos -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 class="font-semibold text-slate-800 mb-4">
        Fotos <span class="text-slate-400 font-normal text-sm">(${c.images.length})</span>
      </h2>
      ${c.images.length ? `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          ${c.images.map((img) => `
            <a href="${api.imageUrl(img.filename)}" target="_blank"
              class="relative group aspect-square block overflow-hidden rounded-xl border border-slate-200 hover:border-blue-400 transition-colors">
              <img src="${api.imageUrl(img.filename)}" alt="Foto"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
              <div class="absolute bottom-2 left-2 right-2">
                <span class="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">${img.image_type}</span>
              </div>
            </a>
          `).join("")}
        </div>
      ` : `
        <div class="text-slate-400 text-sm text-center py-6 border border-dashed border-slate-200 rounded-xl">
          Keine Fotos vorhanden
        </div>
      `}
    </div>
  `;

  // Ticket drucken
  document.getElementById("btnPrintTicket").addEventListener("click", () => openTicket(c));

  // Zahlung buchen
  const btnBookPayment = document.getElementById("btnBookPayment");
  if (btnBookPayment) {
    btnBookPayment.addEventListener("click", () => openPaymentModal(c, feeSettings, caseFees));
  }

  // Stufe wechseln (admin)
  const btnChangeStage = document.getElementById("btnChangeStage");
  if (btnChangeStage) {
    btnChangeStage.addEventListener("click", () => openStageModal(c, feeSettings, caseFees, location, events));
  }

  // Folgekosten hinzufügen (admin)
  const btnAddFollowup = document.getElementById("btnAddFollowup");
  if (btnAddFollowup) {
    btnAddFollowup.addEventListener("click", () => openFollowupModal(c, feeSettings, caseFees, location, events));
  }

  async function refreshDetail(caseId) {
    const [updated, locs, evts, fees, feeS] = await Promise.all([
      api.getCase(caseId),
      api.getLocations(),
      api.getCaseEvents(caseId).catch(() => []),
      api.caseFees.list(caseId).catch(() => []),
      api.getSettings().catch(() => ({})),
    ]);
    renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts, fees, feeS);
  }

  // Widerruf-Button
  const recallBtn = document.getElementById("btnRecall");
  if (recallBtn) {
    recallBtn.addEventListener("click", async () => {
      if (!confirm("Fall wirklich widerrufen? KR Control wird diesen Fall dann nicht weiter bearbeiten.")) return;
      try {
        await api.recallCase(c.id);
        await refreshDetail(c.id);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  }

  // Second Chance button
  const secondChanceBtn = document.getElementById("btnSecondChance");
  if (secondChanceBtn) {
    secondChanceBtn.addEventListener("click", async () => {
      if (!confirm("Second Chance gewähren? Der Fall wird als 'Second Chance' markiert.")) return;
      try {
        await api.updateStatus(c.id, { status: "second_chance" });
        await refreshDetail(c.id);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  }

  window.setStatus = async (status, caseId) => {
    if (status === "paid") {
      openPaymentModal(c, feeSettings, caseFees);
      return;
    }
    try {
      const ticket = document.getElementById("ticketNumberInput")?.value.trim();
      const note = document.getElementById("statusNoteInput")?.value.trim();
      await api.updateStatus(caseId, { status, ticket_number: ticket || null, notes: note || null });
      const msg = document.getElementById("statusUpdateMsg");
      if (msg) { msg.classList.remove("hidden"); setTimeout(() => msg.classList.add("hidden"), 2000); }
      await refreshDetail(caseId);
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };

  // Halterdaten bearbeiten
  const btnEditOwner = document.getElementById("btnEditOwner");
  if (btnEditOwner) {
    btnEditOwner.addEventListener("click", () => {
      document.getElementById("ownerDisplay").classList.add("hidden");
      document.getElementById("ownerForm").classList.remove("hidden");
    });
    document.getElementById("btnCancelOwner").addEventListener("click", () => {
      document.getElementById("ownerForm").classList.add("hidden");
      document.getElementById("ownerDisplay").classList.remove("hidden");
    });
    document.getElementById("btnSaveOwner").addEventListener("click", async () => {
      try {
        await api.updateCaseOwner(c.id, {
          owner_first_name: document.getElementById("ownerFirstName").value.trim() || null,
          owner_last_name: document.getElementById("ownerLastName").value.trim() || null,
          owner_street: document.getElementById("ownerStreet").value.trim() || null,
          owner_zip: document.getElementById("ownerZip").value.trim() || null,
          owner_city: document.getElementById("ownerCity").value.trim() || null,
        });
        const msg = document.getElementById("ownerSaveMsg");
        msg.classList.remove("hidden");
        setTimeout(() => msg.classList.add("hidden"), 2000);
        await refreshDetail(c.id);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  }

  // Fahrzeugtyp bearbeiten (Admin)
  const btnEditVehicleType = document.getElementById("btnEditVehicleType");
  if (btnEditVehicleType) {
    btnEditVehicleType.addEventListener("click", async () => {
      let allTypes = [];
      try {
        allTypes = await api.vehicleTypes.list();
      } catch (err) {
        alert("Fehler beim Laden der Fahrzeugtypen: " + err.message);
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "_vehicleTypeModal";
      overlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";
      overlay.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-slate-800">Fahrzeugtyp ändern</h3>
            <button id="_btnCloseVtModal" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <select id="_vtSelect" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
            ${allTypes.map(vt => `<option value="${vt.id}" ${(c.vehicle_type_number === vt.number) ? "selected" : ""}>[${vt.number}] ${vt.name}</option>`).join("")}
          </select>
          <div id="_vtModalError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-3"></div>
          <div class="flex gap-3">
            <button id="_btnCancelVt" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
              Abbrechen
            </button>
            <button id="_btnSaveVt" class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
              Speichern
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const closeModal = () => overlay.remove();
      overlay.querySelector("#_btnCloseVtModal").addEventListener("click", closeModal);
      overlay.querySelector("#_btnCancelVt").addEventListener("click", closeModal);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

      overlay.querySelector("#_btnSaveVt").addEventListener("click", async () => {
        const selectedId = parseInt(overlay.querySelector("#_vtSelect").value);
        const saveBtn = overlay.querySelector("#_btnSaveVt");
        const errEl = overlay.querySelector("#_vtModalError");
        saveBtn.disabled = true;
        saveBtn.textContent = "Speichern...";
        errEl.classList.add("hidden");
        try {
          await api.updateVehicleType(c.id, selectedId);
          closeModal();
          await refreshDetail(c.id);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove("hidden");
          saveBtn.disabled = false;
          saveBtn.textContent = "Speichern";
        }
      });
    });
  }

  window.showDeleteDialog = (caseId) => {
    const existing = document.getElementById("_caseActionDialog");
    if (existing) existing.remove();

    const adminActions = isAdmin() ? `
      <button id="_btnAnonymize"
        class="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors text-left">
        <svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <div>
          <div class="font-semibold text-amber-800 text-sm">Anonymisieren (empfohlen)</div>
          <div class="text-xs text-amber-600">DSGVO-konform — Kennzeichen & Halterdaten werden ersetzt, Fotos gelöscht. Fall bleibt erhalten.</div>
        </div>
      </button>
    ` : "";

    const overlay = document.createElement("div");
    overlay.id = "_caseActionDialog";
    overlay.className = "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm";
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3">
        <h3 class="font-bold text-slate-800 text-lg">Fall entfernen</h3>
        <p class="text-slate-500 text-sm">Was soll mit diesem Fall passieren?</p>
        ${adminActions}
        <button id="_btnDelete"
          class="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors text-left">
          <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <div>
            <div class="font-semibold text-red-700 text-sm">Endgültig löschen</div>
            <div class="text-xs text-red-500">Nicht wiederherstellbar — alle Daten werden unwiderruflich entfernt.</div>
          </div>
        </button>
        <button id="_btnCancelDialog"
          class="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
          Abbrechen
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#_btnCancelDialog").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    if (isAdmin()) {
      overlay.querySelector("#_btnAnonymize").addEventListener("click", async () => {
        overlay.remove();
        await window.confirmAnonymizeCase(caseId);
      });
    }

    overlay.querySelector("#_btnDelete").addEventListener("click", async () => {
      overlay.remove();
      if (!confirm("Wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
      try {
        await api.deleteCase(caseId);
        window.location.hash = "#/cases";
      } catch (err) {
        alert("Fehler beim Löschen: " + err.message);
      }
    });
  };

  window.confirmAnonymizeCase = async (caseId) => {
    if (!confirm("Fall wirklich anonymisieren?\n\nKennzeichen wird zu 'XX XX 111', Halterdaten werden überschrieben, Fotos werden gelöscht.\nDer Fall selbst bleibt erhalten. Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    try {
      await api.anonymizeCase(caseId);
      await refreshDetail(caseId);
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };
}

function openPaymentModal(c, feeSettings, caseFees) {
  const currentFee = calcCurrentFee(c, feeSettings);
  const existing = document.getElementById("_paymentModal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "_paymentModal";
  overlay.className = "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm";
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <h3 class="font-bold text-slate-800 text-lg">Zahlung buchen</h3>
      <p class="text-slate-500 text-sm">Gib den tatsächlich bezahlten Betrag ein.</p>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Bezahlter Betrag (€) *</label>
        <input id="_paymentAmount" type="number" min="0.01" step="0.01"
          value="${currentFee != null ? currentFee.toFixed(2) : ""}"
          placeholder="Betrag eingeben"
          class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition text-lg font-semibold"/>
        ${currentFee != null ? `<p class="text-xs text-slate-400 mt-1">Vorschlag Stufe ${c.current_fee_stage ?? 0}: ${currentFee.toFixed(2)} €</p>` : ""}
      </div>
      <div id="_paymentError" class="hidden text-sm text-red-600 px-3 py-2 bg-red-50 rounded-lg"></div>
      <div class="flex gap-3">
        <button id="_btnPaymentCancel" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
          Abbrechen
        </button>
        <button id="_btnPaymentConfirm" class="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-semibold">
          Bezahlt buchen
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#_btnPaymentCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector("#_btnPaymentConfirm").addEventListener("click", async () => {
    const amountVal = parseFloat(document.getElementById("_paymentAmount").value);
    const errEl = document.getElementById("_paymentError");
    if (!amountVal || amountVal <= 0) {
      errEl.textContent = "Bitte einen gültigen Betrag eingeben.";
      errEl.classList.remove("hidden");
      return;
    }
    const btn = overlay.querySelector("#_btnPaymentConfirm");
    btn.disabled = true;
    btn.textContent = "Wird gebucht…";
    try {
      await api.updateStatus(c.id, { status: "paid", paid_amount: amountVal });
      overlay.remove();
      const [updated, locs, evts, fees, feeS] = await Promise.all([
        api.getCase(c.id),
        api.getLocations(),
        api.getCaseEvents(c.id).catch(() => []),
        api.caseFees.list(c.id).catch(() => []),
        api.getSettings().catch(() => ({})),
      ]);
      renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts, fees, feeS);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Bezahlt buchen";
    }
  });
}

function openStageModal(c, feeSettings, caseFees, location, events) {
  const existing = document.getElementById("_stageModal");
  if (existing) existing.remove();

  const stage = c.current_fee_stage ?? 0;
  const stageDefs = [
    { n: 0, label: "0 — Sofortangebot", desc: `${(feeSettings.fee_offer ?? 17.85).toFixed(2)} €` },
    { n: 1, label: "1 — Vollpreis", desc: `${(feeSettings.fee_full ?? 30.00).toFixed(2)} €` },
    { n: 2, label: "2 — + Halterabfrage", desc: `${((feeSettings.fee_full ?? 30.00) + (feeSettings.fee_holder_surcharge ?? 5.10)).toFixed(2)} €` },
    { n: 3, label: "3 — Folgekosten", desc: "individuell" },
  ];

  const overlay = document.createElement("div");
  overlay.id = "_stageModal";
  overlay.className = "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm";
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3">
      <h3 class="font-bold text-slate-800 text-lg">Gebührenstufe wechseln</h3>
      <p class="text-slate-500 text-sm">Aktuell: Stufe ${stage}</p>
      <div class="space-y-2">
        ${stageDefs.map((s) => `
          <button data-stage="${s.n}"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${stage === s.n ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}">
            <span class="font-medium text-slate-800 text-sm">${s.label}</span>
            <span class="text-sm text-slate-500">${s.desc}</span>
          </button>
        `).join("")}
      </div>
      <button id="_btnStageCancel" class="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
        Abbrechen
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#_btnStageCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll("[data-stage]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const newStage = parseInt(btn.dataset.stage);
      if (newStage === stage) { overlay.remove(); return; }
      try {
        await api.updateFeeStage(c.id, newStage);
        overlay.remove();
        const [updated, locs, evts, fees, feeS] = await Promise.all([
          api.getCase(c.id),
          api.getLocations(),
          api.getCaseEvents(c.id).catch(() => []),
          api.caseFees.list(c.id).catch(() => []),
          api.getSettings().catch(() => ({})),
        ]);
        renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts, fees, feeS);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  });
}

async function openFollowupModal(c, feeSettings, caseFees, location, events) {
  const existing = document.getElementById("_followupModal");
  if (existing) existing.remove();

  let templates = [];
  try { templates = await api.caseFees.getTemplates(); } catch { /* ignore */ }

  const overlay = document.createElement("div");
  overlay.id = "_followupModal";
  overlay.className = "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm";
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <h3 class="font-bold text-slate-800 text-lg">Folgekosten hinzufügen</h3>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Template auswählen</label>
        <select id="_followupTemplate" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— Kein Template (Freifeld) —</option>
          ${templates.map((t) => `<option value="${t.id}" data-amount="${t.amount != null ? t.amount : ""}" data-label="${t.label}">${t.label}${t.amount != null ? " (" + Number(t.amount).toFixed(2) + " €)" : " (Freifeld)"}</option>`).join("")}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Bezeichnung</label>
        <input id="_followupLabel" type="text" placeholder="z.B. 1. Mahnung"
          class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Betrag (€) *</label>
        <input id="_followupAmount" type="number" min="0.01" step="0.01" placeholder="Betrag eingeben"
          class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Gebührenstufe</label>
        <input id="_followupStage" type="number" min="3" max="99" value="3"
          class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div id="_followupError" class="hidden text-sm text-red-600 px-3 py-2 bg-red-50 rounded-lg"></div>
      <div class="flex gap-3">
        <button id="_btnFollowupCancel" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
          Abbrechen
        </button>
        <button id="_btnFollowupSave" class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-semibold">
          Hinzufügen
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Template-Auswahl befüllt Felder automatisch
  overlay.querySelector("#_followupTemplate").addEventListener("change", (e) => {
    const opt = e.target.options[e.target.selectedIndex];
    const amount = opt.dataset.amount;
    const label = opt.dataset.label;
    if (label) document.getElementById("_followupLabel").value = label;
    if (amount) document.getElementById("_followupAmount").value = parseFloat(amount).toFixed(2);
    else document.getElementById("_followupAmount").value = "";
  });

  overlay.querySelector("#_btnFollowupCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector("#_btnFollowupSave").addEventListener("click", async () => {
    const amount = parseFloat(document.getElementById("_followupAmount").value);
    const label = document.getElementById("_followupLabel").value.trim();
    const stage = parseInt(document.getElementById("_followupStage").value) || 3;
    const errEl = document.getElementById("_followupError");

    if (!amount || amount <= 0) {
      errEl.textContent = "Betrag ist Pflichtfeld.";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = overlay.querySelector("#_btnFollowupSave");
    btn.disabled = true;
    btn.textContent = "Speichern…";

    try {
      await api.caseFees.addFollowup(c.id, { stage, amount, label: label || null });
      overlay.remove();
      const [updated, locs, evts, fees, feeS] = await Promise.all([
        api.getCase(c.id),
        api.getLocations(),
        api.getCaseEvents(c.id).catch(() => []),
        api.caseFees.list(c.id).catch(() => []),
        api.getSettings().catch(() => ({})),
      ]);
      renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts, fees, feeS);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Hinzufügen";
    }
  });
}

function eventMeta(ev) {
  const map = {
    created:        { icon: "✚", color: "bg-blue-100 text-blue-600",   label: "Fall erstellt" },
    status_changed: { icon: "→", color: "bg-slate-100 text-slate-600", label: `Status: ${STATUS_LABELS[ev.new_status] || ev.new_status}` },
    recalled:       { icon: "↩", color: "bg-amber-100 text-amber-600", label: "Fall widerrufen" },
    second_chance:  { icon: "★", color: "bg-purple-100 text-purple-600", label: "Second Chance gewährt" },
    deleted:        { icon: "✕", color: "bg-red-100 text-red-600",     label: "Fall gelöscht" },
    anonymized:     { icon: "⊘", color: "bg-amber-100 text-amber-600", label: "Fall anonymisiert" },
    owner_updated:  { icon: "✎", color: "bg-teal-100 text-teal-600",   label: "Halterdaten aktualisiert" },
  };
  return map[ev.action] ?? { icon: "•", color: "bg-slate-100 text-slate-500", label: ev.action };
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
