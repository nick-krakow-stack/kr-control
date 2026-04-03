import { api } from "../api.js";
import { CONTRACT_TYPE_LABELS, isAdmin } from "../config.js";

let allLocations = [];

export async function renderLocations() {
  const admin = isAdmin();
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Parkplätze</h1>
          <p class="text-slate-500 text-sm mt-1">Standorte verwalten</p>
        </div>
        ${admin ? `
          <div class="flex gap-2">
            <button id="btnSettings"
              class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Einstellungen
            </button>
            <button id="btnNewLocation"
              class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Neuer Parkplatz
            </button>
          </div>
        ` : ""}
      </div>

      <div class="mb-4">
        <input id="locationSearch" type="text" placeholder="Parkplatz suchen..."
          class="w-full max-w-sm px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white shadow-sm"/>
      </div>

      <div id="locationsGrid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${[1,2,3].map(() => `
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
            <div class="h-5 bg-slate-100 rounded w-2/3 mb-3"></div>
            <div class="h-4 bg-slate-100 rounded w-full mb-2"></div>
            <div class="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Modal (nur Admin) -->
    ${admin ? `
      <div id="locationModal" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="modalBackdrop"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 id="modalTitle" class="text-lg font-semibold text-slate-800">Neuer Parkplatz</h3>
              <button id="modalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form id="locationForm" class="p-6 space-y-4">
              <input type="hidden" id="editLocationId"/>
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplatz-Name *</label>
                  <input id="locName" type="text" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="z.B. Apotheke Musterstraße"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Adresse</label>
                  <input id="locAddress" type="text" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Musterstraße 1, 12345 Stadt"/>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Stellplätze</label>
                  <input id="locSpots" type="number" min="0" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="0"/>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Max. Parkdauer (Min.)</label>
                  <input id="locDuration" type="number" min="0" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="120"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Auftraggeber / Kunde</label>
                  <input id="locClient" type="text" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Name des Unternehmens"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Vertragstyp</label>
                  <select id="locContract" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    <option value="standard">Standard (KR-Kontrolle)</option>
                    <option value="self_control">Self-Control</option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Notizen</label>
                  <textarea id="locNotes" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" rows="3" placeholder="Interne Notizen..."></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Ticket-Gebühr (€)</label>
                  <input id="locFeeTicket" type="number" min="0" step="0.01" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Standard verwenden"/>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Brief-Gebühr (€)</label>
                  <input id="locFeeLetter" type="number" min="0" step="0.01" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Standard verwenden"/>
                </div>
              </div>
              <div id="locationFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
              <div class="flex gap-3 pt-2">
                <button type="button" id="btnModalCancel"
                  class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Abbrechen
                </button>
                <button type="submit" id="btnModalSave"
                  class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="settingsModal" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="settingsModalBackdrop"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-800">Globale Gebühren</h3>
              <button id="settingsModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form id="settingsForm" class="p-6 space-y-4">
              <p class="text-sm text-slate-500">Diese Standardwerte gelten, wenn für einen Standort keine eigene Gebühr festgelegt wurde.</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Standard Ticket-Gebühr (€)</label>
                <input id="settingsFeeTicket" type="number" min="0" step="0.01" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="z.B. 35"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Standard Brief-Gebühr (€)</label>
                <input id="settingsFeeLetter" type="number" min="0" step="0.01" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="z.B. 15"/>
              </div>
              <div id="settingsFormMsg" class="hidden text-sm text-green-600 font-medium">Einstellungen gespeichert ✓</div>
              <div class="flex gap-3 pt-2">
                <button type="button" id="btnSettingsCancel"
                  class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Abbrechen
                </button>
                <button type="submit" id="btnSettingsSave"
                  class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    ` : ""}
  `;
}

export async function initLocations() {
  await loadLocations();
  if (isAdmin()) setupModal();
}

async function loadLocations() {
  try {
    allLocations = await api.getLocations();
    renderGrid();
    setupSearch();
  } catch (err) {
    document.getElementById("locationsGrid").innerHTML = `
      <div class="col-span-full text-red-500 text-sm">Fehler beim Laden: ${err.message}</div>
    `;
  }
}

function setupSearch() {
  const input = document.getElementById("locationSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderGrid(allLocations);
      return;
    }
    const filtered = allLocations.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.address && l.address.toLowerCase().includes(q)) ||
      (l.client_name && l.client_name.toLowerCase().includes(q))
    );
    renderGrid(filtered);
  });
}

function renderGrid(locs = allLocations) {
  const grid = document.getElementById("locationsGrid");
  const admin = isAdmin();

  if (!locs.length) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
        <p class="text-slate-500 font-medium">Noch keine Parkplätze</p>
        ${admin ? `<p class="text-slate-400 text-sm mt-1">Legen Sie Ihren ersten Standort an.</p>` : ""}
      </div>
    `;
    return;
  }

  grid.innerHTML = locs.map((loc) => `
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-slate-800 truncate">${loc.name}</h3>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${
            loc.contract_type === "self_control" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          } mt-1 inline-block">
            ${CONTRACT_TYPE_LABELS[loc.contract_type] || loc.contract_type}
          </span>
        </div>
        ${admin ? `
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onclick="editLocation(${loc.id})"
              class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button onclick="deleteLocation(${loc.id}, '${loc.name.replace(/'/g, "\\'")}')"
              class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        ` : ""}
      </div>

      ${loc.address ? `<p class="text-sm text-slate-500 mb-3 truncate">${loc.address}</p>` : ""}
      ${loc.client_name ? `<p class="text-xs text-slate-400 mb-3">Kunde: ${loc.client_name}</p>` : ""}

      <div class="flex gap-4 pt-3 border-t border-slate-50">
        <div class="text-center">
          <div class="text-lg font-bold text-slate-800">${loc.cases_count || 0}</div>
          <div class="text-xs text-slate-400">Fälle</div>
        </div>
        ${loc.spots_count ? `
          <div class="text-center">
            <div class="text-lg font-bold text-slate-800">${loc.spots_count}</div>
            <div class="text-xs text-slate-400">Stellplätze</div>
          </div>
        ` : ""}
        ${loc.max_duration_minutes ? `
          <div class="text-center">
            <div class="text-lg font-bold text-slate-800">${loc.max_duration_minutes >= 60 ? (loc.max_duration_minutes / 60) + "h" : loc.max_duration_minutes + "min"}</div>
            <div class="text-xs text-slate-400">Max. Parkdauer</div>
          </div>
        ` : ""}
        ${loc.fee_ticket ? `
          <div class="text-center">
            <div class="text-lg font-bold text-slate-800">${loc.fee_ticket}€</div>
            <div class="text-xs text-slate-400">Ticket</div>
          </div>
        ` : ""}
        ${loc.fee_letter ? `
          <div class="text-center">
            <div class="text-lg font-bold text-slate-800">${loc.fee_letter}€</div>
            <div class="text-xs text-slate-400">Brief</div>
          </div>
        ` : ""}
      </div>
    </div>
  `).join("");
}

function setupModal() {
  const modal = document.getElementById("locationModal");
  const form = document.getElementById("locationForm");
  const errorEl = document.getElementById("locationFormError");

  const open = () => modal.classList.remove("hidden");
  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editLocationId").value = "";
    document.getElementById("modalTitle").textContent = "Neuer Parkplatz";
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewLocation").addEventListener("click", open);
  document.getElementById("modalClose").addEventListener("click", close);
  document.getElementById("btnModalCancel").addEventListener("click", close);
  document.getElementById("modalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editLocationId").value;
    const btn = document.getElementById("btnModalSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const data = {
      name: document.getElementById("locName").value.trim(),
      address: document.getElementById("locAddress").value.trim() || null,
      spots_count: parseInt(document.getElementById("locSpots").value) || 0,
      max_duration_minutes: parseInt(document.getElementById("locDuration").value) || 120,
      client_name: document.getElementById("locClient").value.trim() || null,
      contract_type: document.getElementById("locContract").value,
      notes: document.getElementById("locNotes").value.trim() || null,
      fee_ticket: parseFloat(document.getElementById("locFeeTicket").value) || null,
      fee_letter: parseFloat(document.getElementById("locFeeLetter").value) || null,
    };

    try {
      if (editId) {
        await api.updateLocation(parseInt(editId), data);
      } else {
        await api.createLocation(data);
      }
      close();
      await loadLocations();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editLocation = (id) => {
    const loc = allLocations.find((l) => l.id === id);
    if (!loc) return;
    document.getElementById("editLocationId").value = id;
    document.getElementById("modalTitle").textContent = "Parkplatz bearbeiten";
    document.getElementById("locName").value = loc.name;
    document.getElementById("locAddress").value = loc.address || "";
    document.getElementById("locSpots").value = loc.spots_count || "";
    document.getElementById("locDuration").value = loc.max_duration_minutes || "";
    document.getElementById("locClient").value = loc.client_name || "";
    document.getElementById("locContract").value = loc.contract_type || "standard";
    document.getElementById("locNotes").value = loc.notes || "";
    document.getElementById("locFeeTicket").value = loc.fee_ticket ?? "";
    document.getElementById("locFeeLetter").value = loc.fee_letter ?? "";
    open();
  };

  window.deleteLocation = async (id, name) => {
    if (!confirm(`Parkplatz "${name}" wirklich löschen?\n\nAlle zugehörigen Fälle werden ebenfalls gelöscht!`)) return;
    try {
      await api.deleteLocation(id);
      await loadLocations();
    } catch (err) {
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  // Settings modal
  const settingsModal = document.getElementById("settingsModal");
  const settingsForm = document.getElementById("settingsForm");
  const settingsMsg = document.getElementById("settingsFormMsg");

  const openSettings = async () => {
    settingsModal.classList.remove("hidden");
    try {
      const s = await api.getSettings();
      document.getElementById("settingsFeeTicket").value = s.fee_ticket_default ?? "";
      document.getElementById("settingsFeeLetter").value = s.fee_letter_default ?? "";
    } catch {}
  };
  const closeSettings = () => {
    settingsModal.classList.add("hidden");
    settingsMsg.classList.add("hidden");
  };

  document.getElementById("btnSettings").addEventListener("click", openSettings);
  document.getElementById("settingsModalClose").addEventListener("click", closeSettings);
  document.getElementById("btnSettingsCancel").addEventListener("click", closeSettings);
  document.getElementById("settingsModalBackdrop").addEventListener("click", closeSettings);

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSettingsSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    try {
      await api.updateSettings({
        fee_ticket_default: parseFloat(document.getElementById("settingsFeeTicket").value) || 35,
        fee_letter_default: parseFloat(document.getElementById("settingsFeeLetter").value) || 15,
      });
      settingsMsg.classList.remove("hidden");
      setTimeout(() => settingsMsg.classList.add("hidden"), 2000);
    } catch (err) {
      alert("Fehler: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });
}
