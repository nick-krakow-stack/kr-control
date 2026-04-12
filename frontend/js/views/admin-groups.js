import { api } from "../api.js";

let allGroups = [];

// Permission-Katalog (muss mit Backend-ALL_PERMISSIONS übereinstimmen)
const ALL_PERMISSIONS = {
  view_violator_details:  { label: "Falschparker-Details sehen (Kennzeichen, Fahrzeug)", category: "Kunden" },
  view_case_images:       { label: "Fall-Fotos sehen", category: "Kunden" },
  view_case_amounts:      { label: "Gebührenbeträge sehen", category: "Kunden" },
  view_stats_basic:       { label: "Basis-Statistiken (Gesamtquoten)", category: "Kunden" },
  view_stats_detailed:    { label: "Detaillierte Statistiken (nach Tatbestand/Fahrzeugtyp)", category: "Kunden" },
  view_controller_times:  { label: "Kontrollzeiten der Mitarbeiter sehen", category: "Kunden" },
  edit_vehicle_types:     { label: "Fahrzeugtypen bearbeiten", category: "Mitarbeiter" },
  edit_violations:        { label: "Tatbestände bearbeiten", category: "Mitarbeiter" },
  edit_whitelist:         { label: "Whitelist verwalten", category: "Mitarbeiter" },
  view_reports:           { label: "Auswertungs-Dashboard", category: "Mitarbeiter" },
  manage_shifts:          { label: "Schichten verwalten", category: "Mitarbeiter" },
  export_data:            { label: "Daten exportieren", category: "Buchhaltung" },
};

const CATEGORIES = ["Kunden", "Mitarbeiter", "Buchhaltung"];

export async function renderAdminGroups() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Benutzergruppen</h1>
          <p class="text-slate-500 text-sm mt-1">Gruppen und Berechtigungen verwalten</p>
        </div>
        <button id="btnNewGroup"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neue Gruppe
        </button>
      </div>

      <div id="groupsContainer" class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-8 text-center text-slate-400">Lade Gruppen...</div>
      </div>
    </div>

    <!-- Modal -->
    <div id="groupModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="groupModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="groupModalTitle" class="text-lg font-semibold text-slate-800">Neue Gruppe</h3>
            <button id="groupModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="groupForm" class="p-6 space-y-4">
            <input type="hidden" id="editGroupId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input id="groupName" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="z.B. Kunden-Standard"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Beschreibung</label>
              <input id="groupDescription" type="text"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Optional"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Berechtigungen</label>
              ${CATEGORIES.map((cat) => `
                <div class="mb-3">
                  <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">${cat}</div>
                  <div class="space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    ${Object.entries(ALL_PERMISSIONS)
                      .filter(([, v]) => v.category === cat)
                      .map(([key, v]) => `
                        <label class="flex items-start gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition-colors">
                          <input type="checkbox" class="perm-checkbox mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0" value="${key}"/>
                          <span class="text-sm text-slate-700">${v.label}</span>
                        </label>
                      `).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
            <div id="editGroupActiveWrapper" class="hidden">
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="groupIsActive" type="checkbox" checked class="w-4 h-4 accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Gruppe aktiv</span>
              </label>
            </div>
            <div id="groupFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="btnGroupModalCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnGroupModalSave"
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

export async function initAdminGroups() {
  await loadGroups();
  setupModal();
}

async function loadGroups() {
  try {
    allGroups = await api.groups.list();
    renderTable();
  } catch (err) {
    document.getElementById("groupsContainer").innerHTML = `
      <div class="p-6 text-red-500 text-sm">Fehler: ${err.message}</div>
    `;
  }
}

function renderTable() {
  const el = document.getElementById("groupsContainer");
  if (!allGroups.length) {
    el.innerHTML = `<div class="p-12 text-center text-slate-400">Noch keine Gruppen vorhanden</div>`;
    return;
  }

  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100">
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Gruppe</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Berechtigungen</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Mitglieder</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          ${allGroups.map((g) => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-800">${g.name}</div>
                ${g.description ? `<div class="text-xs text-slate-400 mt-0.5">${g.description}</div>` : ""}
              </td>
              <td class="px-4 py-4 text-sm text-slate-500">
                ${g.permissions?.length || 0} Berechtigung${g.permissions?.length !== 1 ? "en" : ""}
                ${g.permissions?.length ? `
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${g.permissions.slice(0, 3).map((p) => `
                      <span class="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">${p.replace(/_/g, " ")}</span>
                    `).join("")}
                    ${g.permissions.length > 3 ? `<span class="text-xs text-slate-400">+${g.permissions.length - 3}</span>` : ""}
                  </div>
                ` : ""}
              </td>
              <td class="px-4 py-4 text-sm text-slate-500">${g.member_count ?? 0}</td>
              <td class="px-4 py-4">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${g.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}">
                  ${g.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="flex gap-2 justify-end">
                  <button onclick="editGroup(${g.id})"
                    class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  ${(g.member_count ?? 0) === 0 ? `
                    <button onclick="deleteGroup(${g.id}, '${g.name.replace(/'/g, "\\'")}')"
                      class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  ` : `
                    <button disabled title="Gruppe hat noch Mitglieder"
                      class="p-1.5 rounded-lg text-slate-300 cursor-not-allowed">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getSelectedPermissions() {
  return Array.from(document.querySelectorAll(".perm-checkbox:checked")).map((cb) => cb.value);
}

function setSelectedPermissions(perms = []) {
  const permSet = new Set(perms);
  document.querySelectorAll(".perm-checkbox").forEach((cb) => {
    cb.checked = permSet.has(cb.value);
  });
}

function setupModal() {
  const modal = document.getElementById("groupModal");
  const form = document.getElementById("groupForm");
  const errorEl = document.getElementById("groupFormError");

  const open = () => modal.classList.remove("hidden");
  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editGroupId").value = "";
    document.getElementById("groupModalTitle").textContent = "Neue Gruppe";
    document.getElementById("editGroupActiveWrapper").classList.add("hidden");
    setSelectedPermissions([]);
    errorEl.classList.add("hidden");
  };

  document.getElementById("btnNewGroup").addEventListener("click", () => {
    close();
    open();
  });
  document.getElementById("groupModalClose").addEventListener("click", close);
  document.getElementById("btnGroupModalCancel").addEventListener("click", close);
  document.getElementById("groupModalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editGroupId").value;
    const btn = document.getElementById("btnGroupModalSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const data = {
      name: document.getElementById("groupName").value.trim(),
      description: document.getElementById("groupDescription").value.trim() || null,
      permissions: getSelectedPermissions(),
    };

    try {
      if (editId) {
        data.is_active = document.getElementById("groupIsActive").checked;
        await api.groups.update(parseInt(editId), data);
      } else {
        await api.groups.create(data);
      }
      close();
      await loadGroups();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editGroup = (id) => {
    const group = allGroups.find((g) => g.id === id);
    if (!group) return;
    document.getElementById("editGroupId").value = id;
    document.getElementById("groupModalTitle").textContent = "Gruppe bearbeiten";
    document.getElementById("groupName").value = group.name;
    document.getElementById("groupDescription").value = group.description || "";
    document.getElementById("groupIsActive").checked = group.is_active;
    document.getElementById("editGroupActiveWrapper").classList.remove("hidden");
    setSelectedPermissions(group.permissions || []);
    open();
  };

  window.deleteGroup = async (id, name) => {
    if (!confirm(`Gruppe "${name}" wirklich loeschen?`)) return;
    try {
      await api.groups.delete(id);
      await loadGroups();
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };
}
