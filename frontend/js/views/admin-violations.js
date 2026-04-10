import { api } from "../api.js";

let allViolations = [];

export async function renderAdminViolations() {
  return `
    <div class="p-6 lg:p-8 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Tatbestände</h1>
          <p class="text-slate-500 text-sm mt-1">Verstoßgründe verwalten</p>
        </div>
        <button id="btnNewViolation"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neuer Tatbestand
        </button>
      </div>

      <div id="defaultFeeBar" class="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm text-blue-700">Stufe 1 — Vollpreis (ohne Sonderpreis):</span>
          <span id="defaultFeeValue" class="text-sm font-bold text-blue-800">wird geladen…</span>
        </div>
        <a href="#/settings" class="text-xs text-blue-600 hover:text-blue-800 font-medium underline">Anpassen →</a>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div id="violationsTableWrap">
          <div class="p-8 text-center text-slate-400 text-sm">Wird geladen...</div>
        </div>
      </div>
    </div>

    <div id="violationModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="violationModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="violationModalTitle" class="text-lg font-semibold text-slate-800">Neuer Tatbestand</h3>
            <button id="violationModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="violationForm" class="p-6 space-y-4">
            <input type="hidden" id="editViolationId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Kennziffer *</label>
              <input id="vCode" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. P1"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Beschreibung *</label>
              <input id="vDescription" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. Parken ohne Parkscheibe"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Priorität (sort_order)</label>
              <input id="vSortOrder" type="number" min="0" value="0"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0"/>
              <p class="text-xs text-slate-400 mt-1">Kleiner = weiter oben in der Liste</p>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="vHasFeeOverride" type="checkbox" class="w-4 h-4 rounded accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Sonderpreis festlegen</span>
              </label>
            </div>
            <div id="vFeeOverrideWrap" class="hidden">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Sonderpreis (€)</label>
              <input id="vFeeOverride" type="number" min="0" step="0.01"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. 25.00"/>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="vIsActive" type="checkbox" checked class="w-4 h-4 rounded accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Aktiv</span>
              </label>
            </div>
            <div id="violationFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="btnViolationCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnViolationSave"
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

export async function initAdminViolations() {
  await Promise.all([loadViolations(), loadDefaultFee()]);
  setupModal();
}

async function loadDefaultFee() {
  try {
    const s = await api.getSettings();
    const fee = s.fee_full ?? 30;
    const el = document.getElementById("defaultFeeValue");
    if (el) el.textContent = Number(fee).toFixed(2) + " €";
  } catch {
    const el = document.getElementById("defaultFeeValue");
    if (el) el.textContent = "—";
  }
}

async function loadViolations() {
  try {
    const data = await api.violations.listAdmin();
    allViolations = data.sort((a, b) => a.sort_order - b.sort_order);
    renderTable();
  } catch (err) {
    document.getElementById("violationsTableWrap").innerHTML = `
      <div class="p-8 text-center text-red-500 text-sm">Fehler beim Laden: ${err.message}</div>
    `;
  }
}

function renderTable() {
  const wrap = document.getElementById("violationsTableWrap");
  if (!allViolations.length) {
    wrap.innerHTML = `
      <div class="p-12 text-center">
        <p class="text-slate-500 font-medium">Noch keine Tatbestände</p>
        <p class="text-slate-400 text-sm mt-1">Legen Sie den ersten Tatbestand an.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-100">
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Kennziffer</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Beschreibung</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Sonderpreis</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Priorität</th>
          <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
          <th class="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Aktionen</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        ${allViolations.map((v) => `
          <tr class="${v.is_active ? "" : "opacity-50"} hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3.5 font-mono font-semibold text-slate-700">${v.code}</td>
            <td class="px-5 py-3.5 text-slate-700">${v.description}</td>
            <td class="px-5 py-3.5 text-slate-500">${v.fee_override != null ? v.fee_override.toFixed(2) + " €" : "—"}</td>
            <td class="px-5 py-3.5 text-slate-500">${v.sort_order}</td>
            <td class="px-5 py-3.5">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium ${v.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}">
                ${v.is_active ? "Aktiv" : "Inaktiv"}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex gap-1 justify-end">
                <button onclick="window.editViolation(${v.id})"
                  class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button onclick="window.deleteViolation(${v.id}, '${v.code.replace(/'/g, "\\'")}')"
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

function setupModal() {
  const modal = document.getElementById("violationModal");
  const form = document.getElementById("violationForm");
  const errorEl = document.getElementById("violationFormError");
  const feeOverrideCheckbox = document.getElementById("vHasFeeOverride");
  const feeOverrideWrap = document.getElementById("vFeeOverrideWrap");

  feeOverrideCheckbox.addEventListener("change", () => {
    feeOverrideWrap.classList.toggle("hidden", !feeOverrideCheckbox.checked);
  });

  const open = () => modal.classList.remove("hidden");
  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editViolationId").value = "";
    document.getElementById("violationModalTitle").textContent = "Neuer Tatbestand";
    document.getElementById("vSortOrder").value = "0";
    document.getElementById("vIsActive").checked = true;
    feeOverrideWrap.classList.add("hidden");
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewViolation").addEventListener("click", open);
  document.getElementById("violationModalClose").addEventListener("click", close);
  document.getElementById("btnViolationCancel").addEventListener("click", close);
  document.getElementById("violationModalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editViolationId").value;
    const btn = document.getElementById("btnViolationSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const hasFeeOverride = document.getElementById("vHasFeeOverride").checked;
    const data = {
      code: document.getElementById("vCode").value.trim(),
      description: document.getElementById("vDescription").value.trim(),
      sort_order: parseInt(document.getElementById("vSortOrder").value) || 0,
      is_active: document.getElementById("vIsActive").checked ? 1 : 0,
      fee_override: hasFeeOverride ? (parseFloat(document.getElementById("vFeeOverride").value) || null) : null,
    };

    try {
      if (editId) {
        await api.violations.update(parseInt(editId), data);
      } else {
        await api.violations.create(data);
      }
      close();
      await loadViolations();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editViolation = (id) => {
    const v = allViolations.find((x) => x.id === id);
    if (!v) return;
    document.getElementById("editViolationId").value = id;
    document.getElementById("violationModalTitle").textContent = "Tatbestand bearbeiten";
    document.getElementById("vCode").value = v.code;
    document.getElementById("vDescription").value = v.description;
    document.getElementById("vSortOrder").value = v.sort_order;
    document.getElementById("vIsActive").checked = !!v.is_active;
    const hasFee = v.fee_override != null;
    document.getElementById("vHasFeeOverride").checked = hasFee;
    feeOverrideWrap.classList.toggle("hidden", !hasFee);
    if (hasFee) document.getElementById("vFeeOverride").value = v.fee_override;
    open();
  };

  window.deleteViolation = async (id, code) => {
    if (!confirm(`Tatbestand "${code}" wirklich löschen?`)) return;
    try {
      await api.violations.delete(id);
      await loadViolations();
    } catch (err) {
      alert("Fehler beim Löschen: " + err.message);
    }
  };
}
