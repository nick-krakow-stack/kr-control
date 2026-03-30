import { api } from "../api.js";
import { getUser } from "../config.js";

let selectedFiles = [];

export async function renderSelfControlReport() {
  const locations = await api.getLocations();
  const user = getUser();
  const isBusiness = user?.role === "self_control_business";

  const locationOptions = locations.map((l) =>
    `<option value="${l.id}">${l.name}</option>`
  ).join("");

  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return `
    <div class="p-6 lg:p-8 max-w-2xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">Verstoß melden</h1>
        <p class="text-slate-500 text-sm mt-1">
          Nach der Meldung haben Sie <strong>${user?.recall_hours || 24} Stunden</strong> Zeit,
          den Fall zu widerrufen.
        </p>
      </div>

      <form id="reportForm" class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h2 class="font-semibold text-slate-700 text-sm uppercase tracking-wide">Fahrzeugdaten</h2>

          ${locations.length > 1 ? `
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplatz *</label>
              <select id="reportLocation" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">Parkplatz auswählen...</option>
                ${locationOptions}
              </select>
            </div>
          ` : `
            <input type="hidden" id="reportLocation" value="${locations[0]?.id || ""}"/>
            <div class="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
              📍 ${locations[0]?.name || "Kein Standort zugewiesen"}
            </div>
          `}

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Kennzeichen *</label>
            <input id="reportPlate" type="text" required
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono uppercase
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-lg tracking-wider"
              placeholder="z.B. B-KR 1234" autocomplete="off" inputmode="text"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Datum & Uhrzeit *</label>
            <input id="reportDateTime" type="datetime-local" required
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value="${localISO}"/>
          </div>

          ${isBusiness ? `
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Ticket-Nummer</label>
              <input id="reportTicket" type="text"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. T-2024-001 (optional)"/>
            </div>
          ` : ""}

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Notiz (optional)</label>
            <textarea id="reportNotes" rows="2"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              placeholder="Zusätzliche Informationen..."></textarea>
          </div>
        </div>

        <!-- Fotos -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 class="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Fotos *</h2>

          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p class="text-sm font-medium text-amber-800 mb-1">Pflichtfotos</p>
            <ul class="text-xs text-amber-700 space-y-1">
              <li>📷 Fahrzeug <strong>von vorne</strong> (Kennzeichen sichtbar)</li>
              <li>📷 Fahrzeug <strong>von hinten</strong> (Kennzeichen sichtbar)</li>
              <li>📷 Schild <strong>intakt und lesbar</strong></li>
            </ul>
          </div>

          <div id="reportDropZone"
            class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer
                   hover:border-blue-400 hover:bg-blue-50/30 transition-all">
            <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <p class="text-sm text-slate-600 font-medium">Fotos aufnehmen oder hochladen</p>
            <p class="text-xs text-slate-400 mt-1">JPEG, PNG · Max. 20 MB</p>
            <input id="reportImageInput" type="file" accept="image/*" multiple capture="environment" class="hidden"/>
          </div>

          <div id="reportPreview" class="grid grid-cols-3 gap-3 mt-4 empty:hidden"></div>
        </div>

        <div id="reportError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>

        <button type="submit" id="btnReport"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm text-base">
          Verstoß melden
        </button>
      </form>
    </div>
  `;
}

export function initSelfControlReport() {
  selectedFiles = [];
  const dropZone = document.getElementById("reportDropZone");
  const imageInput = document.getElementById("reportImageInput");

  document.getElementById("reportPlate")?.addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  dropZone.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    addFiles(Array.from(imageInput.files));
    imageInput.value = "";
  });

  document.getElementById("reportForm").addEventListener("submit", submitReport);
}

function addFiles(files) {
  selectedFiles.push(...files.filter((f) => f.type.startsWith("image/")));
  renderPreview();
}

function renderPreview() {
  const preview = document.getElementById("reportPreview");
  if (!selectedFiles.length) { preview.innerHTML = ""; return; }
  preview.innerHTML = selectedFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="relative group aspect-square">
        <img src="${url}" class="w-full h-full object-cover rounded-xl border border-slate-200"/>
        <button type="button" onclick="window._removeReportFile(${i})"
          class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full
                 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">×</button>
      </div>
    `;
  }).join("");
  window._removeReportFile = (i) => { selectedFiles.splice(i, 1); renderPreview(); };
}

async function submitReport(e) {
  e.preventDefault();
  const errorEl = document.getElementById("reportError");
  const btn = document.getElementById("btnReport");
  errorEl.classList.add("hidden");

  const locationId = document.getElementById("reportLocation").value;
  const plate = document.getElementById("reportPlate").value.trim();
  const dateTime = document.getElementById("reportDateTime").value;

  if (!locationId || !plate || !dateTime) {
    errorEl.textContent = "Bitte alle Pflichtfelder ausfüllen.";
    errorEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Wird gemeldet...";

  try {
    const formData = new FormData();
    formData.append("location_id", locationId);
    formData.append("license_plate", plate);
    formData.append("reported_at", new Date(dateTime).toISOString());

    const ticket = document.getElementById("reportTicket")?.value.trim();
    if (ticket) formData.append("ticket_number", ticket);

    const notes = document.getElementById("reportNotes").value.trim();
    if (notes) formData.append("notes", notes);

    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    const created = await api.createCase(formData);
    window.location.hash = `#/cases/${created.id}`;
  } catch (err) {
    errorEl.textContent = "Fehler: " + err.message;
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Verstoß melden";
  }
}
