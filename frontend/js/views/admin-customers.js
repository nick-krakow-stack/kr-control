import { api } from "../api.js";

let allCustomers = [];
let allLocations = [];

// Kunden-relevante Permissions (view_* Permissions)
const CUSTOMER_PERMISSIONS = {
  view_violator_details:  "Falschparker-Details sehen (Kennzeichen, Fahrzeug)",
  view_case_images:       "Fall-Fotos sehen",
  view_case_amounts:      "Gebührenbeträge sehen",
  view_stats_basic:       "Basis-Statistiken (Gesamtquoten)",
  view_stats_detailed:    "Detaillierte Statistiken (nach Tatbestand/Fahrzeugtyp)",
  view_controller_times:  "Kontrollzeiten der Mitarbeiter sehen",
};

export async function renderAdminCustomers() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Kundenverwaltung</h1>
          <p class="text-slate-500 text-sm mt-1">Kunden anlegen und Parkplätze zuweisen</p>
        </div>
        <button id="btnNewCustomer"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neuer Kunde
        </button>
      </div>

      <div class="mb-4">
        <input id="customerSearch" type="text" placeholder="Name oder E-Mail suchen..."
          class="w-full max-w-sm px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white shadow-sm"/>
      </div>

      <div id="customersAlert" class="hidden mb-4"></div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div id="customersTable">
          <div class="p-8 text-center text-slate-400 text-sm">Lade Kunden...</div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div id="customerModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="customerModalBackdrop"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="customerModalTitle" class="text-lg font-semibold text-slate-800">Neuer Kunde</h3>
            <button id="customerModalClose" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="customerForm" class="p-6 space-y-4">
            <input type="hidden" id="editCustomerId"/>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input id="custName" type="text" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Firmen- oder Privatname"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">E-Mail *</label>
              <input id="custEmail" type="email" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="kunde@beispiel.de"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input id="custPhone" type="text"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Optional"/>
            </div>
            <div id="custLocationsWrapper">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplätze zuweisen</label>
              <div id="custLocationCheckboxes" class="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
                <div class="text-sm text-slate-400">Lade Parkplätze...</div>
              </div>
            </div>
            <div id="custIsActiveWrapper" class="hidden">
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="custIsActive" type="checkbox" class="w-4 h-4 accent-blue-600" checked/>
                <span class="text-sm font-medium text-slate-700">Aktiv</span>
              </label>
            </div>

            <!-- Berechtigungen (nur im Edit-Modus) -->
            <div id="custPermissionsWrapper" class="hidden">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Berechtigungen (Kunden-Portal)</label>
              <div class="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50">
                ${Object.entries(CUSTOMER_PERMISSIONS).map(([key, label]) => `
                  <label class="flex items-start gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition-colors">
                    <input type="checkbox" class="cust-perm-checkbox mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0" value="${key}"/>
                    <span class="text-sm text-slate-700">${label}</span>
                  </label>
                `).join("")}
              </div>
              <p class="text-xs text-slate-400 mt-1">Mitarbeiter dieses Kunden können nur Berechtigungen erhalten, die hier freigeschaltet sind.</p>
            </div>
            <div id="customerFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="btnCustomerModalCancel"
                class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
              <button type="submit" id="btnCustomerModalSave"
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

export async function initAdminCustomers() {
  try {
    [allLocations] = await Promise.all([
      api.getLocations(),
    ]);
  } catch {}

  await loadCustomers();
  setupModal();
  setupSearch();
}

async function loadCustomers() {
  try {
    allCustomers = await api.customers.list();
    renderTable(allCustomers);
  } catch (err) {
    document.getElementById("customersTable").innerHTML = `
      <div class="p-8 text-center text-red-500 text-sm">Fehler: ${err.message}</div>
    `;
  }
}

function setupSearch() {
  const input = document.getElementById("customerSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderTable(allCustomers); return; }
    const filtered = allCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q))
    );
    renderTable(filtered);
  });
}

function renderTable(customers) {
  const el = document.getElementById("customersTable");
  if (!customers.length) {
    el.innerHTML = `
      <div class="p-8 text-center border border-dashed border-slate-200 m-4 rounded-xl">
        <p class="text-slate-500 font-medium">Keine Kunden vorhanden</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">E-Mail</th>
            <th class="px-4 py-3 font-medium">Telefon</th>
            <th class="px-4 py-3 font-medium">Parkplätze</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Benutzer</th>
            <th class="px-4 py-3 font-medium">Aktionen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          ${customers.map((c) => {
            const statusBadge = c.is_active !== false
              ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span>`
              : `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inaktiv</span>`;

            let userBadge = `<span class="text-slate-400">–</span>`;
            if (c.user_id) {
              userBadge = c.user_verified
                ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Verifiziert</span>`
                : `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Eingeladen</span>`;
            }

            const locationCount = Array.isArray(c.locations) ? c.locations.length : (c.location_count ?? 0);
            const canDelete = !c.user_id;

            return `
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 font-medium text-slate-800">${c.name}</td>
                <td class="px-4 py-3 text-slate-600">${c.email || "–"}</td>
                <td class="px-4 py-3 text-slate-600">${c.phone || "–"}</td>
                <td class="px-4 py-3 text-slate-600">${locationCount}</td>
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3">${userBadge}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 flex-wrap">
                    ${!c.user_id || !c.user_verified ? `
                      <button onclick="inviteCustomer(${c.id})"
                        class="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium">
                        Einladen
                      </button>
                    ` : ""}
                    <button onclick="editCustomer(${c.id})"
                      class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    ${canDelete ? `
                      <button onclick="deleteCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}')"
                        class="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    ` : ""}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function showAlert(msg, type = "success") {
  const el = document.getElementById("customersAlert");
  if (!el) return;
  const colors = type === "success"
    ? "bg-green-50 border-green-200 text-green-800"
    : "bg-red-50 border-red-200 text-red-700";
  el.className = `border rounded-xl px-4 py-3 text-sm ${colors}`;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function setupModal() {
  const modal = document.getElementById("customerModal");
  const form = document.getElementById("customerForm");
  const errorEl = document.getElementById("customerFormError");

  const populateLocationCheckboxes = (preselected = []) => {
    const container = document.getElementById("custLocationCheckboxes");
    if (!allLocations.length) {
      container.innerHTML = `<div class="text-sm text-slate-400">Keine Parkplätze vorhanden</div>`;
      return;
    }
    const preSet = new Set(preselected.map(String));
    container.innerHTML = allLocations.map((l) => `
      <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
        <input type="checkbox" name="custLocation" value="${l.id}" ${preSet.has(String(l.id)) ? "checked" : ""}
          class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
        <span class="text-sm text-slate-700">${l.name}</span>
      </label>
    `).join("");
  };

  const setPermissionCheckboxes = (perms = []) => {
    const permSet = new Set(perms);
    document.querySelectorAll(".cust-perm-checkbox").forEach((cb) => {
      cb.checked = permSet.has(cb.value);
    });
  };

  const getSelectedPermissions = () => {
    return Array.from(document.querySelectorAll(".cust-perm-checkbox:checked")).map((cb) => cb.value);
  };

  const open = (editId = null) => {
    modal.classList.remove("hidden");
    errorEl.classList.add("hidden");
    const activeWrapper = document.getElementById("custIsActiveWrapper");
    const permWrapper = document.getElementById("custPermissionsWrapper");
    if (editId) {
      document.getElementById("customerModalTitle").textContent = "Kunde bearbeiten";
      activeWrapper.classList.remove("hidden");
      permWrapper.classList.remove("hidden");
      const customer = allCustomers.find((c) => c.id === editId);
      if (customer) {
        document.getElementById("editCustomerId").value = editId;
        document.getElementById("custName").value = customer.name || "";
        document.getElementById("custEmail").value = customer.email || "";
        document.getElementById("custPhone").value = customer.phone || "";
        document.getElementById("custIsActive").checked = customer.is_active !== false;
        // Fetch details for location pre-selection and permissions
        api.customers.get(editId).then((detail) => {
          const locIds = Array.isArray(detail.locations) ? detail.locations.map((l) => l.id) : [];
          populateLocationCheckboxes(locIds);
          setPermissionCheckboxes(detail.permissions || []);
        }).catch(() => { populateLocationCheckboxes([]); setPermissionCheckboxes([]); });
      }
    } else {
      document.getElementById("customerModalTitle").textContent = "Neuer Kunde";
      activeWrapper.classList.add("hidden");
      permWrapper.classList.add("hidden");
      document.getElementById("editCustomerId").value = "";
      form.reset();
      populateLocationCheckboxes([]);
      setPermissionCheckboxes([]);
    }
  };

  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    document.getElementById("editCustomerId").value = "";
    errorEl.classList.add("hidden");
    document.getElementById("custPermissionsWrapper").classList.add("hidden");
    setPermissionCheckboxes([]);
  };

  document.getElementById("btnNewCustomer").addEventListener("click", () => open(null));
  document.getElementById("customerModalClose").addEventListener("click", close);
  document.getElementById("btnCustomerModalCancel").addEventListener("click", close);
  document.getElementById("customerModalBackdrop").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editCustomerId").value;
    const btn = document.getElementById("btnCustomerModalSave");
    btn.disabled = true;
    btn.textContent = "Speichern...";
    errorEl.classList.add("hidden");

    const selectedLocations = Array.from(
      document.querySelectorAll('input[name="custLocation"]:checked')
    ).map((cb) => parseInt(cb.value));

    const data = {
      name: document.getElementById("custName").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      phone: document.getElementById("custPhone").value.trim() || null,
      location_ids: selectedLocations,
    };

    try {
      if (editId) {
        const updateData = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          is_active: document.getElementById("custIsActive").checked,
          location_ids: selectedLocations,
        };
        const custId = parseInt(editId);
        await api.customers.update(custId, updateData);
        await api.customers.setPermissions(custId, getSelectedPermissions());
      } else {
        await api.customers.create(data);
      }
      close();
      await loadCustomers();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Speichern";
    }
  });

  window.editCustomer = (id) => open(id);

  window.deleteCustomer = async (id, name) => {
    if (!confirm(`Kunde "${name}" wirklich löschen?`)) return;
    try {
      await api.customers.delete(id);
      await loadCustomers();
      showAlert("Kunde gelöscht.");
    } catch (err) {
      showAlert("Fehler: " + err.message, "error");
    }
  };

  window.inviteCustomer = async (id) => {
    try {
      await api.customers.invite(id);
      showAlert("Einladung wurde gesendet.");
    } catch (err) {
      showAlert("Fehler beim Einladen: " + err.message, "error");
    }
  };
}
