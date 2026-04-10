import { api } from "../api.js";

let allVehicleTypes = [];

export async function renderAdminVehicleTypes() {
  return `
    <div class="p-6 lg:p-8 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Fahrzeugtypen</h1>
          <p class="text-slate-500 text-sm mt-1">Fahrzeugtypen verwalten</p>
        </div>
        <button id="btnNewVehicleType"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neuer Fahrzeugtyp
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div id="vehicleTypesTableWrap">
          <div class="p-8 text-center text-slate-400 text-sm">Wird geladen...</div>
        </div>
      </div>
    </div>

    <div id="vehicleTypeModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="vehicleTypeModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="vehicleTypeModalTitle" class="text-lg font-semibold text-slate-800">Neuer Fahrzeugtyp</h3>
            <button id="vehicleTypeModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="vehicleTypeForm" class="p-6 space-y-4">
            <input type="hidden" id="editVehicleTypeId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Nummer *</label>
              <input id="vtNumber" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. 1, 1a, 2"/>
              <p class="text-xs text-slate-400 mt-1">Eindeutige Kennziffer des Fahrzeugtyps</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input id="vtName" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. PKW"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Priorität (sort_order)</label>
              <input id="vtSortOrder" type="number" min="0" value="0"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0"/>
              <p class="text-xs text-slate-400 mt-1">Kleiner = weiter oben in der Liste</p>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="vtIsActive" type="checkbox" checked class="w-4 h-4 rounded accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Aktiv</span>
              </label>
            </div>
            <div id="vehicleTypeFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="btnVehicleTypeCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnVehicleTypeSave"
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

export async function initAdminVehicleTypes() {
  await loadVehicleTypes();
  setupModal();
}

async function loadVehicleTypes() {
  try {
    const data = await api.vehicleTypes.listAll();
    allVehicleTypes = data.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    renderTable();
  } catch (err) {
    document.getElementById("vehicleTypesTableWrap").innerHTML = `
      <div class="p-8 text-center text-red-500 text-sm">Fehler beim Laden: ${err.message}</div>
    `;
  }
}

function renderTable() {
  const wrap = document.getElementById("vehicleTypesTableWrap");
  if (!allVehicleTypes.length) {
    wrap.innerHTML = `
      <div class="p-12 text-center">
        <p class="text-slate-500 font-medium">Noch keine Fahrzeugtypen</p>
        <p class="text-slate-400 text-sm mt-1">Legen Sie den ersten Fahrzeugtyp an.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-100">
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Nummer</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Priorität</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
          <th class="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Aktionen</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        ${allVehicleTypes.map((vt) => `
          <tr class="${vt.is_active ? "" : "opacity-50"} hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3.5 font-mono font-semibold text-slate-700">${vt.number}</td>
            <td class="px-5 py-3.5 text-slate-700">${vt.name}</td>
            <td class="px-5 py-3.5 text-slate-500">${vt.sort_order}</td>
            <td class="px-5 py-3.5">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium ${vt.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}">
                ${vt.is_active ? "Aktiv" : "Inaktiv"}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex gap-1 justify-end">
                <button onclick="window.editVehicleType(${vt.id})"
                  class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button onclick="window.deleteVehicleType(${vt.id}, '${vt.name.replace(/'/g, "\\'")}')"
                  class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getNextNumberSuggestion() {
  const numericNumbers = allVehicleTypes
    .filter(vt => /^\d+$/.test(vt.number))
    .map(vt => parseInt(vt.number));
  if (!numericNumbers.length) return "1";
  return String(Math.max(...numericNumbers) + 1);
}

function setupModal() {
  const modal = document.getElementById("vehicleTypeModal");
  const form = document.getElementById("vehicleTypeForm");
  const errorEl = document.getElementById("vehicleTypeFormError");

  const open = () => modal.classList.remove("hidden");
  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editVehicleTypeId").value = "";
    document.getElementById("vehicleTypeModalTitle").textContent = "Neuer Fahrzeugtyp";
    document.getElementById("vtSortOrder").value = "0";
    document.getElementById("vtIsActive").checked = true;
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewVehicleType").addEventListener("click", () => {
    // Suggest next number
    document.getElementById("vtNumber").value = getNextNumberSuggestion();
    open();
  });
  document.getElementById("vehicleTypeModalClose").addEventListener("click", close);
  document.getElementById("btnVehicleTypeCancel").addEventListener("click", close);
  document.getElementById("vehicleTypeModalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editVehicleTypeId").value;
    const btn = document.getElementById("btnVehicleTypeSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const data = {
      number: document.getElementById("vtNumber").value.trim(),
      name: document.getElementById("vtName").value.trim(),
      sort_order: parseInt(document.getElementById("vtSortOrder").value) || 0,
      is_active: document.getElementById("vtIsActive").checked ? 1 : 0,
    };

    try {
      if (editId) {
        await api.vehicleTypes.update(parseInt(editId), data);
      } else {
        await api.vehicleTypes.create(data);
      }
      close();
      await loadVehicleTypes();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editVehicleType = (id) => {
    const vt = allVehicleTypes.find((x) => x.id === id);
    if (!vt) return;
    document.getElementById("editVehicleTypeId").value = id;
    document.getElementById("vehicleTypeModalTitle").textContent = "Fahrzeugtyp bearbeiten";
    document.getElementById("vtNumber").value = vt.number;
    document.getElementById("vtName").value = vt.name;
    document.getElementById("vtSortOrder").value = vt.sort_order;
    document.getElementById("vtIsActive").checked = !!vt.is_active;
    open();
  };

  window.deleteVehicleType = async (id, name) => {
    if (!confirm(`Fahrzeugtyp "${name}" wirklich löschen?`)) return;
    try {
      await api.vehicleTypes.delete(id);
      await loadVehicleTypes();
    } catch (err) {
      alert("Fehler beim Löschen: " + err.message);
    }
  };
}
