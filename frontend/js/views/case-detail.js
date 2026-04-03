import { api } from "../api.js";
import { STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS, isSelfControl, isStaff, isBuchhaltungOrAdmin } from "../config.js";
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
    const [caseData, locations, events] = await Promise.all([
      api.getCase(id),
      api.getLocations(),
      api.getCaseEvents(id).catch(() => []),
    ]);
    const location = locations.find((l) => l.id === caseData.location_id);
    renderDetail(caseData, location, events);
  } catch (err) {
    document.getElementById("caseDetailContent").innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">Fehler: ${err.message}</div>
    `;
  }
}

function renderDetail(c, location, events = []) {
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
          ${staff ? `
            <button onclick="confirmDeleteCase(${c.id})"
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

  // Widerruf-Button
  const recallBtn = document.getElementById("btnRecall");
  if (recallBtn) {
    recallBtn.addEventListener("click", async () => {
      if (!confirm("Fall wirklich widerrufen? KR Control wird diesen Fall dann nicht weiter bearbeiten.")) return;
      try {
        await api.recallCase(c.id);
        const updated = await api.getCase(c.id);
        const locs = await api.getLocations();
        const evts = await api.getCaseEvents(c.id).catch(() => []);
        renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  }

  window.setStatus = async (status, caseId) => {
    try {
      const ticket = document.getElementById("ticketNumberInput")?.value.trim();
      const note = document.getElementById("statusNoteInput")?.value.trim();
      await api.updateStatus(caseId, { status, ticket_number: ticket || null, notes: note || null });
      const msg = document.getElementById("statusUpdateMsg");
      if (msg) { msg.classList.remove("hidden"); setTimeout(() => msg.classList.add("hidden"), 2000); }
      const updated = await api.getCase(caseId);
      const locs = await api.getLocations();
      const evts = await api.getCaseEvents(caseId).catch(() => []);
      renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts);
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
        const updated = await api.getCase(c.id);
        const locs = await api.getLocations();
        const evts = await api.getCaseEvents(c.id).catch(() => []);
        renderDetail(updated, locs.find((l) => l.id === updated.location_id), evts);
      } catch (err) {
        alert("Fehler: " + err.message);
      }
    });
  }

  window.confirmDeleteCase = async (caseId) => {
    if (!confirm("Fall wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    try {
      await api.deleteCase(caseId);
      window.location.hash = "#/cases";
    } catch (err) {
      alert("Fehler beim Löschen: " + err.message);
    }
  };
}

function eventMeta(ev) {
  const map = {
    created:       { icon: "✚", color: "bg-blue-100 text-blue-600",   label: "Fall erstellt" },
    status_changed:{ icon: "→", color: "bg-slate-100 text-slate-600", label: `Status: ${STATUS_LABELS[ev.new_status] || ev.new_status}` },
    recalled:      { icon: "↩", color: "bg-amber-100 text-amber-600", label: "Fall widerrufen" },
    deleted:       { icon: "✕", color: "bg-red-100 text-red-600",     label: "Fall gelöscht" },
    owner_updated: { icon: "✎", color: "bg-teal-100 text-teal-600",   label: "Halterdaten aktualisiert" },
  };
  return map[ev.action] ?? { icon: "•", color: "bg-slate-100 text-slate-500", label: ev.action };
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
