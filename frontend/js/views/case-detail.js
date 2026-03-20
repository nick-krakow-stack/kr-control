import { api } from "../api.js";
import { STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS } from "../config.js";

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
    const [caseData, locations] = await Promise.all([
      api.getCase(id),
      api.getLocations(),
    ]);
    const location = locations.find((l) => l.id === caseData.location_id);
    renderDetail(caseData, location);
  } catch (err) {
    document.getElementById("caseDetailContent").innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">Fehler: ${err.message}</div>
    `;
  }
}

function renderDetail(c, location) {
  const isDeadlineOver = c.payment_deadline && new Date(c.payment_deadline) < new Date();
  const isOpen = ["new", "ticket_issued", "in_progress"].includes(c.status);

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
        <button onclick="confirmDeleteCase(${c.id})"
          class="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
          Fall löschen
        </button>
      </div>

      <!-- Timeline info -->
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
      </div>
    </div>

    <!-- Status Update -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 class="font-semibold text-slate-800 mb-4">Status aktualisieren</h2>
      <div class="flex flex-wrap gap-2 mb-4">
        ${Object.entries(STATUS_LABELS).map(([val, label]) => `
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
          class="input flex-1" value="${c.ticket_number || ""}"/>
        <input id="statusNoteInput" type="text" placeholder="Notiz zum Status (optional)"
          class="input flex-1"/>
      </div>
      <div id="statusUpdateMsg" class="hidden mt-3 text-sm text-green-600 font-medium">Status aktualisiert ✓</div>
    </div>

    <!-- Notes -->
    ${c.notes ? `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 class="font-semibold text-slate-800 mb-3">Notizen</h2>
        <pre class="text-sm text-slate-600 whitespace-pre-wrap font-sans">${c.notes}</pre>
      </div>
    ` : ""}

    <!-- Images -->
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
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </div>
              <div class="absolute bottom-2 left-2 right-2">
                <span class="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                  ${img.image_type}
                </span>
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

  // Bind global functions
  window.setStatus = async (status, caseId) => {
    try {
      const ticket = document.getElementById("ticketNumberInput")?.value.trim();
      const note = document.getElementById("statusNoteInput")?.value.trim();
      await api.updateStatus(caseId, {
        status,
        ticket_number: ticket || null,
        notes: note || null,
      });
      const msg = document.getElementById("statusUpdateMsg");
      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 2000);
      // Reload
      const updated = await api.getCase(caseId);
      const locs = await api.getLocations();
      renderDetail(updated, locs.find((l) => l.id === updated.location_id));
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };

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

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
