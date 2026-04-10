import { api } from "../api.js";

export function renderSettings() {
  return `
    <div class="p-6 lg:p-8 max-w-2xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">Einstellungen</h1>
        <p class="text-slate-500 text-sm mt-1">Systemweite Konfiguration</p>
      </div>

      <!-- Gebührenstufen -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 class="font-semibold text-slate-800 mb-1">Gebührenstufen</h2>
        <p class="text-xs text-slate-400 mb-4">
          Stufe 0 = Sofortangebot (Vergleich), Stufe 1 = Vollpreis, Stufe 2 = Vollpreis + Halter-Aufschlag
        </p>
        <form id="feeStagesForm" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Stufe 0 — Sofortangebot (€)</label>
              <input id="feeOffer" type="number" min="0" step="0.01"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Stufe 1 — Vollpreis (€)</label>
              <input id="feeFull" type="number" min="0" step="0.01"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <p class="text-xs text-slate-400 mt-1">Überschreibbar per Tatbestand</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Stufe 2 — Halter-Aufschlag (€)</label>
              <input id="feeHolderSurcharge" type="number" min="0" step="0.01"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <p class="text-xs text-slate-400 mt-1">Wird zu Stufe 1 addiert</p>
            </div>
          </div>
          <div id="feeStagesMsg" class="hidden text-sm px-4 py-3 rounded-xl"></div>
          <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
            Stufen speichern
          </button>
        </form>
      </div>

      <!-- Folgekosten-Templates -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-semibold text-slate-800">Folgekosten-Templates</h2>
          <button id="btnNewTemplate"
            class="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Neu
          </button>
        </div>
        <p class="text-xs text-slate-400 mb-4">Benannte Folgekosten für Stufe 3+ (z.B. Mahnung, Inkasso). Betrag leer = Freifeld beim Buchen.</p>
        <div id="templatesWrap">
          <div class="text-sm text-slate-400 text-center py-4">Wird geladen…</div>
        </div>

        <!-- Inline-Formular für neues Template -->
        <div id="templateForm" class="hidden mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <input type="hidden" id="editTemplateId"/>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Bezeichnung *</label>
              <input id="tplLabel" type="text" placeholder="z.B. 1. Mahnung"
                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Betrag (€) — leer = Freifeld</label>
              <input id="tplAmount" type="number" min="0" step="0.01" placeholder="leer lassen für Freifeld"
                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Priorität (sort_order)</label>
              <input id="tplSortOrder" type="number" min="0" value="0"
                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer pb-2">
                <input id="tplIsActive" type="checkbox" checked class="w-4 h-4 rounded accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Aktiv</span>
              </label>
            </div>
          </div>
          <div id="tplError" class="hidden text-sm text-red-600 px-3 py-2 bg-red-50 rounded-lg"></div>
          <div class="flex gap-2">
            <button id="btnSaveTemplate" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Speichern
            </button>
            <button id="btnCancelTemplate" class="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </div>

      <!-- Datenschutz-Fristen -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 class="font-semibold text-slate-800 mb-1">Datenschutz & Anonymisierung</h2>
        <p class="text-xs text-slate-400 mb-4">
          Der tägliche CRON-Job anonymisiert Fälle automatisch nach diesen Fristen.
          Anonymisierung bedeutet: Kennzeichen → "XX XX 111", Halterdaten überschrieben, Fotos gelöscht.
        </p>
        <form id="anonForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Neue Fälle ohne Aktivität (Tage bis automatisches Schließen + Anonymisieren)
            </label>
            <div class="flex items-center gap-2">
              <input id="anonDaysNew" type="number" min="1" max="365"
                class="w-32 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <span class="text-sm text-slate-500">Tage</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Status "Neu" ohne Änderung → Fall wird als "Aufgegeben" geschlossen und sofort anonymisiert.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Manuell geschlossene Fälle (Tage bis Anonymisieren)
            </label>
            <div class="flex items-center gap-2">
              <input id="anonDaysClosed" type="number" min="1" max="365"
                class="w-32 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <span class="text-sm text-slate-500">Tage</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Status "Geschlossen" (manuell) → wird nach dieser Frist anonymisiert.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Bezahlte Fälle (Tage bis Anonymisieren)
            </label>
            <div class="flex items-center gap-2">
              <input id="anonDaysPaid" type="number" min="1" max="365"
                class="w-32 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <span class="text-sm text-slate-500">Tage</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Status "Bezahlt" → wird nach dieser Frist anonymisiert.</p>
          </div>
          <div id="anonMsg" class="hidden text-sm px-4 py-3 rounded-xl"></div>
          <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
            Fristen speichern
          </button>
        </form>
      </div>
    </div>
  `;
}

export async function initSettings() {
  const settings = await api.getSettings().catch(() => ({}));

  document.getElementById("feeOffer").value = settings.fee_offer ?? 17.85;
  document.getElementById("feeFull").value = settings.fee_full ?? 30.00;
  document.getElementById("feeHolderSurcharge").value = settings.fee_holder_surcharge ?? 5.10;
  document.getElementById("anonDaysNew").value = settings.anon_days_new ?? 30;
  document.getElementById("anonDaysClosed").value = settings.anon_days_closed ?? 7;
  document.getElementById("anonDaysPaid").value = settings.anon_days_paid ?? 30;

  const showMsg = (elId, text, isError) => {
    const el = document.getElementById(elId);
    el.textContent = text;
    el.className = `text-sm px-4 py-3 rounded-xl ${isError ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
  };

  document.getElementById("feeStagesForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        fee_offer: parseFloat(document.getElementById("feeOffer").value),
        fee_full: parseFloat(document.getElementById("feeFull").value),
        fee_holder_surcharge: parseFloat(document.getElementById("feeHolderSurcharge").value),
      });
      showMsg("feeStagesMsg", "Stufen gespeichert ✓", false);
    } catch (err) {
      showMsg("feeStagesMsg", err.message, true);
    }
  });

  document.getElementById("anonForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        anon_days_new: parseInt(document.getElementById("anonDaysNew").value),
        anon_days_closed: parseInt(document.getElementById("anonDaysClosed").value),
        anon_days_paid: parseInt(document.getElementById("anonDaysPaid").value),
      });
      showMsg("anonMsg", "Fristen gespeichert ✓", false);
    } catch (err) {
      showMsg("anonMsg", err.message, true);
    }
  });

  // Templates
  await loadFollowupTemplates();
  setupTemplateForm();
}

async function loadFollowupTemplates() {
  const wrap = document.getElementById("templatesWrap");
  try {
    const templates = await api.caseFees.getAllTemplates();
    if (!templates.length) {
      wrap.innerHTML = `<div class="text-sm text-slate-400 text-center py-4">Noch keine Templates. Klicke auf "Neu" um ein Template anzulegen.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100">
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Bezeichnung</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Betrag</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Prio</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Status</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Aktionen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          ${templates.map((t) => `
            <tr class="${t.is_active ? "" : "opacity-50"} hover:bg-slate-50">
              <td class="px-3 py-2.5 font-medium text-slate-700">${t.label}</td>
              <td class="px-3 py-2.5 text-slate-500">${t.amount != null ? Number(t.amount).toFixed(2) + " €" : "<span class='text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full'>Freifeld</span>"}</td>
              <td class="px-3 py-2.5 text-slate-500">${t.sort_order}</td>
              <td class="px-3 py-2.5">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}">
                  ${t.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right">
                <div class="flex gap-1 justify-end">
                  <button onclick="window.editTemplate(${t.id})"
                    class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500" title="Bearbeiten">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button onclick="window.deleteTemplate(${t.id}, '${t.label.replace(/'/g, "\\'")}')"
                    class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500" title="Löschen">
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
  } catch {
    wrap.innerHTML = `<div class="text-sm text-red-500 text-center py-4">Fehler beim Laden der Templates</div>`;
  }
}

function setupTemplateForm() {
  const form = document.getElementById("templateForm");
  const errorEl = document.getElementById("tplError");

  const openNew = () => {
    document.getElementById("editTemplateId").value = "";
    document.getElementById("tplLabel").value = "";
    document.getElementById("tplAmount").value = "";
    document.getElementById("tplSortOrder").value = "0";
    document.getElementById("tplIsActive").checked = true;
    errorEl.classList.add("hidden");
    form.classList.remove("hidden");
    document.getElementById("tplLabel").focus();
  };

  const close = () => {
    form.classList.add("hidden");
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewTemplate").addEventListener("click", openNew);
  document.getElementById("btnCancelTemplate").addEventListener("click", close);

  document.getElementById("btnSaveTemplate").addEventListener("click", async () => {
    const editId = document.getElementById("editTemplateId").value;
    const label = document.getElementById("tplLabel").value.trim();
    const amountVal = document.getElementById("tplAmount").value.trim();
    const sortOrder = parseInt(document.getElementById("tplSortOrder").value) || 0;
    const isActive = document.getElementById("tplIsActive").checked ? 1 : 0;

    if (!label) {
      errorEl.textContent = "Bezeichnung ist Pflichtfeld";
      errorEl.classList.remove("hidden");
      return;
    }

    const data = {
      label,
      amount: amountVal !== "" ? parseFloat(amountVal) : null,
      sort_order: sortOrder,
      is_active: isActive,
    };

    try {
      errorEl.classList.add("hidden");
      if (editId) {
        await api.caseFees.updateTemplate(parseInt(editId), data);
      } else {
        await api.caseFees.createTemplate(data);
      }
      close();
      await loadFollowupTemplates();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  });

  window.editTemplate = async (id) => {
    const templates = await api.caseFees.getAllTemplates().catch(() => []);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    document.getElementById("editTemplateId").value = id;
    document.getElementById("tplLabel").value = t.label;
    document.getElementById("tplAmount").value = t.amount != null ? t.amount : "";
    document.getElementById("tplSortOrder").value = t.sort_order;
    document.getElementById("tplIsActive").checked = !!t.is_active;
    errorEl.classList.add("hidden");
    form.classList.remove("hidden");
    document.getElementById("tplLabel").focus();
  };

  window.deleteTemplate = async (id, label) => {
    if (!confirm(`Template "${label}" wirklich löschen?`)) return;
    try {
      await api.caseFees.deleteTemplate(id);
      await loadFollowupTemplates();
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };
}
