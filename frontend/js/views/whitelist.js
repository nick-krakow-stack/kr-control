import { api } from "../api.js";
import { getUser } from "../config.js";

let allLocations = [];
let filterLocationId = "";

export async function renderWhitelist() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Whitelist</h1>
          <p class="text-slate-500 text-sm mt-1">Kennzeichen mit dauerhafter Parkberechtigung</p>
        </div>
        <button id="btnNewWhitelist"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Eintrag hinzufügen
        </button>
      </div>

      <!-- Filter bar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Parkplatz</label>
            <select id="wlFilterLocation"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Alle</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Kennzeichen</label>
            <input id="wlFilterPlate" type="text" placeholder="z.B. HL-VS 1234"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button id="btnWlFilter"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            Suchen
          </button>
        </div>
      </div>

      <div id="wlAlert" class="hidden mb-4"></div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div id="whitelistTable">
          <div class="p-8 text-center text-slate-400 text-sm">Lade Daten...</div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div id="wlModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="wlModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="wlModalTitle" class="text-lg font-semibold text-slate-800">Eintrag hinzufügen</h3>
            <button id="wlModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="wlForm" class="p-6 space-y-4">
            <input type="hidden" id="editWlId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplatz *</label>
              <select id="wlLocation" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">Parkplatz auswählen...</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Kennzeichen *</label>
              <input id="wlPlate" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono uppercase
                       focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. HL-VS 1234"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Gültig ab</label>
                <input id="wlValidFrom" type="date"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Gültig bis</label>
                <input id="wlValidUntil" type="date"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Notiz</label>
              <input id="wlNote" type="text"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Optional"/>
            </div>
            <div id="wlFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="btnWlCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnWlSave"
                class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                Speichern
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export async function initWhitelist() {
  const user = getUser();
  const isSelfControl = user?.role === "self_control_business" || user?.role === "self_control_private";

  try {
    allLocations = await api.getLocations();
  } catch {}

  // Populate location filter
  const filterSelect = document.getElementById("wlFilterLocation");
  allLocations.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    filterSelect.appendChild(opt);
  });

  // If self_control user with single location, pre-select it
  if (isSelfControl && allLocations.length === 1) {
    filterLocationId = String(allLocations[0].id);
    filterSelect.value = filterLocationId;
  }

  await loadWhitelist();

  document.getElementById("btnWlFilter").addEventListener("click", () => {
    filterLocationId = document.getElementById("wlFilterLocation").value;
    loadWhitelist();
  });

  setupModal();
}

async function loadWhitelist() {
  const tableEl = document.getElementById("whitelistTable");
  tableEl.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">Lade...</div>`;

  const plateFilter = document.getElementById("wlFilterPlate")?.value.trim().toLowerCase() || "";

  try {
    const params = filterLocationId ? { location_id: filterLocationId } : {};
    let entries = await api.whitelist.list(params);

    if (plateFilter) {
      entries = entries.filter((e) => e.license_plate && e.license_plate.toLowerCase().includes(plateFilter));
    }

    if (!entries.length) {
      tableEl.innerHTML = `
        <div class="p-8 text-center border border-dashed border-slate-200 m-4 rounded-xl">
          <p class="text-slate-500 font-medium">Keine Einträge gefunden</p>
        </div>
      `;
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    tableEl.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">Kennzeichen</th>
              <th class="px-4 py-3 font-medium">Parkplatz</th>
              <th class="px-4 py-3 font-medium">Gültig ab</th>
              <th class="px-4 py-3 font-medium">Gültig bis</th>
              <th class="px-4 py-3 font-medium">Notiz</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            ${entries.map((e) => {
              const status = getWlStatus(e, today);
              const locationName = e.location_name || e.location?.name
                || allLocations.find((l) => l.id === e.location_id)?.name
                || `#${e.location_id}`;
              return `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-slate-800">${e.license_plate}</td>
                  <td class="px-4 py-3 text-slate-600">${locationName}</td>
                  <td class="px-4 py-3 text-slate-600">${e.valid_from || "–"}</td>
                  <td class="px-4 py-3 text-slate-600">${e.valid_until || "–"}</td>
                  <td class="px-4 py-3 text-slate-500 max-w-xs truncate">${e.note || "–"}</td>
                  <td class="px-4 py-3">${status.badge}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <button onclick="editWhitelistEntry(${e.id})"
                        class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button onclick="deleteWhitelistEntry(${e.id})"
                        class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Store entries for edit lookup
    window._wlEntries = entries;
  } catch (err) {
    tableEl.innerHTML = `<div class="p-8 text-center text-red-500 text-sm">Fehler: ${err.message}</div>`;
  }
}

function getWlStatus(entry, today) {
  const from = entry.valid_from;
  const until = entry.valid_until;

  if (until && until < today) {
    return { label: "Abgelaufen", badge: `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Abgelaufen</span>` };
  }
  if (from && from > today) {
    return { label: "Zukünftig", badge: `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Zukünftig</span>` };
  }
  return { label: "Aktiv", badge: `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span>` };
}

function showAlert(msg, type = "success") {
  const el = document.getElementById("wlAlert");
  if (!el) return;
  const colors = type === "success"
    ? "bg-green-50 border border-green-200 text-green-800"
    : "bg-red-50 border border-red-200 text-red-700";
  el.className = `rounded-xl px-4 py-3 text-sm ${colors}`;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function setupModal() {
  const modal = document.getElementById("wlModal");
  const form = document.getElementById("wlForm");
  const errorEl = document.getElementById("wlFormError");

  // Populate location select in modal
  const locSelect = document.getElementById("wlLocation");
  allLocations.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    locSelect.appendChild(opt);
  });

  const open = (entry = null) => {
    modal.classList.remove("hidden");
    errorEl.classList.add("hidden");
    if (entry) {
      document.getElementById("wlModalTitle").textContent = "Eintrag bearbeiten";
      document.getElementById("editWlId").value = entry.id;
      document.getElementById("wlLocation").value = entry.location_id || "";
      document.getElementById("wlPlate").value = entry.license_plate || "";
      document.getElementById("wlValidFrom").value = entry.valid_from || "";
      document.getElementById("wlValidUntil").value = entry.valid_until || "";
      document.getElementById("wlNote").value = entry.note || "";
    } else {
      document.getElementById("wlModalTitle").textContent = "Eintrag hinzufügen";
      document.getElementById("editWlId").value = "";
      form.reset();
      if (filterLocationId) document.getElementById("wlLocation").value = filterLocationId;
    }
  };

  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editWlId").value = "";
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewWhitelist").addEventListener("click", () => open(null));
  document.getElementById("wlModalClose").addEventListener("click", close);
  document.getElementById("btnWlCancel").addEventListener("click", close);
  document.getElementById("wlModalBackdrop").addEventListener("click", close);

  document.getElementById("wlPlate").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editWlId").value;
    const btn = document.getElementById("btnWlSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const data = {
      location_id: parseInt(document.getElementById("wlLocation").value),
      license_plate: document.getElementById("wlPlate").value.trim().toUpperCase(),
      valid_from: document.getElementById("wlValidFrom").value || null,
      valid_until: document.getElementById("wlValidUntil").value || null,
      note: document.getElementById("wlNote").value.trim() || null,
    };

    try {
      if (editId) {
        await api.whitelist.update(parseInt(editId), data);
      } else {
        await api.whitelist.create(data);
      }
      close();
      await loadWhitelist();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editWhitelistEntry = (id) => {
    const entries = window._wlEntries || [];
    const entry = entries.find((e) => e.id === id);
    if (entry) open(entry);
  };

  window.deleteWhitelistEntry = async (id) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    try {
      await api.whitelist.delete(id);
      await loadWhitelist();
      showAlert("Eintrag gelöscht.");
    } catch (err) {
      showAlert("Fehler: " + err.message, "error");
    }
  };
}
