import { api } from "../api.js";
import { ROLE_LABELS, ROLE_COLORS } from "../config.js";

let allUsers = [];
let allLocations = [];

export async function renderAdminUsers() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Benutzerverwaltung</h1>
          <p class="text-slate-500 text-sm mt-1">Benutzer anlegen, bearbeiten und Standorte zuweisen</p>
        </div>
        <button id="btnNewUser"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neuer Benutzer
        </button>
      </div>

      <div class="mb-4">
        <input id="userSearch" type="text" placeholder="Benutzer suchen..."
          class="w-full max-w-sm px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white shadow-sm"/>
      </div>

      <div id="usersTable" class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-8 text-center text-slate-400">Lade Benutzer...</div>
      </div>
    </div>

    <!-- Modal -->
    <div id="userModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="userModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="userModalTitle" class="text-lg font-semibold text-slate-800">Neuer Benutzer</h3>
            <button id="userModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="userForm" class="p-6 space-y-4">
            <input type="hidden" id="editUserId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Benutzername *</label>
              <input id="userUsername" type="text" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="z.B. max.mustermann"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">E-Mail *</label>
              <input id="userEmail" type="email" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="email@beispiel.de"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Rolle *</label>
              <select id="userRole" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="self_control_business">Self-Control Gewerbe</option>
                <option value="self_control_private">Self-Control Privat</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Widerruf-Fenster (Stunden)</label>
              <input id="userRecallHours" type="number" min="1" max="168" value="24"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              <p class="text-xs text-slate-400 mt-1">Wie lange kann der Benutzer einen gemeldeten Fall widerrufen?</p>
            </div>

            <!-- Standort-Zuweisung (nicht für Admin nötig) -->
            <div id="locationAssignment">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplätze zuweisen</label>
              <div id="locationCheckboxes" class="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3">
                <div class="text-slate-400 text-sm">Lade Parkplätze...</div>
              </div>
            </div>

            <div id="editOnlyFields" class="hidden">
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="userIsActive" type="checkbox" checked class="w-4 h-4 rounded accent-blue-600"/>
                <span class="text-sm font-medium text-slate-700">Konto aktiv</span>
              </label>
            </div>

            <div id="userFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>

            <div class="flex gap-3 pt-2">
              <button type="button" id="btnUserModalCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnUserModalSave"
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

export async function initAdminUsers() {
  try {
    [allUsers, allLocations] = await Promise.all([api.getUsers(), api.getLocations()]);
    renderTable();
    setupModal();
    setupSearch();
  } catch (err) {
    document.getElementById("usersTable").innerHTML = `
      <div class="p-6 text-red-500 text-sm">Fehler: ${err.message}</div>
    `;
  }
}

function setupSearch() {
  const input = document.getElementById("userSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderTable(allUsers);
      return;
    }
    const filtered = allUsers.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
    renderTable(filtered);
  });
}

function renderTable(users = allUsers) {
  const el = document.getElementById("usersTable");
  if (!users.length) {
    el.innerHTML = `<div class="p-12 text-center text-slate-400">Noch keine Benutzer vorhanden</div>`;
    return;
  }

  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100">
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Benutzer</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Rolle</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Parkplätze</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          ${users.map((u) => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-800">${u.username}</div>
                <div class="text-xs text-slate-400">${u.email}</div>
                ${!u.email_verified ? `<span class="text-xs text-amber-600 font-medium">⏳ Einladung ausstehend</span>` : ""}
              </td>
              <td class="px-4 py-4">
                <span class="text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}">
                  ${ROLE_LABELS[u.role] || u.role}
                </span>
              </td>
              <td class="px-4 py-4 text-sm text-slate-500">
                ${u.location_ids?.length || 0} Standort${u.location_ids?.length !== 1 ? "e" : ""}
              </td>
              <td class="px-4 py-4">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}">
                  ${u.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="flex gap-2 justify-end">
                  ${!u.email_verified ? `
                    <button onclick="resendInvite(${u.id})"
                      class="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                      Einladung erneut senden
                    </button>
                  ` : ""}
                  <button onclick="editUser(${u.id})"
                    class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button onclick="deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')"
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
    </div>
  `;
}

function renderLocationCheckboxes(selectedIds = []) {
  const container = document.getElementById("locationCheckboxes");
  if (!allLocations.length) {
    container.innerHTML = `<div class="text-slate-400 text-sm">Noch keine Parkplätze vorhanden</div>`;
    return;
  }
  container.innerHTML = allLocations.map((loc) => `
    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg">
      <input type="checkbox" class="loc-checkbox w-4 h-4 accent-blue-600" value="${loc.id}"
        ${selectedIds.includes(loc.id) ? "checked" : ""}/>
      <span class="text-sm text-slate-700">${loc.name}</span>
      <span class="text-xs text-slate-400 ml-auto">${loc.contract_type === "self_control" ? "Self-Control" : "Standard"}</span>
    </label>
  `).join("");
}

function getSelectedLocationIds() {
  return Array.from(document.querySelectorAll(".loc-checkbox:checked")).map((cb) => parseInt(cb.value));
}

function setupModal() {
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  const errorEl = document.getElementById("userFormError");

  const open = () => modal.classList.remove("hidden");
  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editUserId").value = "";
    document.getElementById("userModalTitle").textContent = "Neuer Benutzer";
    document.getElementById("editOnlyFields").classList.add("hidden");
    errorEl.classList.add("hidden");
    renderLocationCheckboxes([]);
  };

  document.getElementById("btnNewUser").addEventListener("click", () => {
    close();
    renderLocationCheckboxes([]);
    open();
  });
  document.getElementById("userModalClose").addEventListener("click", close);
  document.getElementById("btnUserModalCancel").addEventListener("click", close);
  document.getElementById("userModalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editUserId").value;
    const btn = document.getElementById("btnUserModalSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const locationIds = getSelectedLocationIds();

    try {
      if (editId) {
        const userId = parseInt(editId);
        await api.updateUser(userId, {
          username: document.getElementById("userUsername").value.trim(),
          email: document.getElementById("userEmail").value.trim(),
          role: document.getElementById("userRole").value,
          recall_hours: parseInt(document.getElementById("userRecallHours").value) || 24,
          is_active: document.getElementById("userIsActive").checked,
        });
        await api.assignLocations(userId, locationIds);
      } else {
        const newUser = await api.createUser({
          username: document.getElementById("userUsername").value.trim(),
          email: document.getElementById("userEmail").value.trim(),
          role: document.getElementById("userRole").value,
          recall_hours: parseInt(document.getElementById("userRecallHours").value) || 24,
        });
        await api.assignLocations(newUser.id, locationIds);
      }
      close();
      [allUsers, allLocations] = await Promise.all([api.getUsers(), api.getLocations()]);
      renderTable();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editUser = (id) => {
    const user = allUsers.find((u) => u.id === id);
    if (!user) return;
    document.getElementById("editUserId").value = id;
    document.getElementById("userModalTitle").textContent = "Benutzer bearbeiten";
    document.getElementById("userUsername").value = user.username;
    document.getElementById("userEmail").value = user.email;
    document.getElementById("userRole").value = user.role;
    document.getElementById("userRecallHours").value = user.recall_hours;
    document.getElementById("userIsActive").checked = user.is_active;
    document.getElementById("editOnlyFields").classList.remove("hidden");
    renderLocationCheckboxes(user.location_ids || []);
    open();
  };

  window.deleteUser = async (id, username) => {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return;
    try {
      await api.deleteUser(id);
      allUsers = await api.getUsers();
      renderTable();
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };

  window.resendInvite = async (id) => {
    try {
      await api.resendInvite(id);
      alert("Einladung wurde erneut versendet.");
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  };
}
