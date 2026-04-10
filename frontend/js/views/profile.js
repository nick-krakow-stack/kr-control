import { api } from "../api.js";
import { getUser, ROLE_LABELS } from "../config.js";

export function renderProfile() {
  const user = getUser();
  return `
    <div class="p-6 lg:p-8 max-w-xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">Mein Profil</h1>
        <p class="text-slate-500 text-sm mt-1">Kontoeinstellungen</p>
      </div>

      <!-- Info -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xl font-bold">${user?.username?.slice(0, 2).toUpperCase() || "?"}</span>
          </div>
          <div>
            <div class="font-semibold text-slate-800 text-lg">${user?.username || "–"}</div>
            <div class="text-slate-500 text-sm">${user?.email || "–"}</div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium mt-1 inline-block">
              ${ROLE_LABELS[user?.role] || user?.role || "–"}
            </span>
          </div>
        </div>
      </div>

      <!-- Persönliche Daten -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-800">Persönliche Daten</h2>
          <button id="btnEditProfile" class="text-sm text-blue-600 hover:text-blue-700 font-medium">Bearbeiten</button>
        </div>
        <!-- Display mode (default) -->
        <div id="profileDisplay" class="space-y-3 text-sm">
          <!-- populated by initProfile() -->
        </div>
        <!-- Edit mode (hidden by default) -->
        <form id="profileForm" class="hidden space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Vorname</label>
              <input id="pFirstName" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Nachname</label>
              <input id="pLastName" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Straße + Hausnummer</label>
            <input id="pStreet" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">PLZ</label>
              <input id="pZip" type="text" inputmode="numeric" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-slate-600 mb-1">Stadt</label>
              <input id="pCity" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-100">
            <p class="text-xs text-slate-400 mb-3">Bankverbindung (für Abrechnung)</p>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Kontoinhaber</label>
                <input id="pBankName" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">IBAN</label>
                <input id="pIban" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="DE00 0000 0000 0000 0000 00"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">BIC</label>
                <input id="pBic" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
          </div>
          <div id="profileError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
          <div class="flex gap-3">
            <button type="button" id="btnCancelProfile" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">Abbrechen</button>
            <button type="submit" id="btnSaveProfile" class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">Speichern</button>
          </div>
        </form>
      </div>

      <!-- Stundenlohn (nur Mitarbeiter) -->
      <div id="hourlyRateCard" class="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 hidden">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-600">Stundenlohn</span>
          <span id="hourlyRateValue" class="text-lg font-bold text-slate-800">–</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">Wird vom Admin festgelegt</p>
      </div>

      <!-- Passwort ändern -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 class="font-semibold text-slate-800 mb-4">Passwort ändern</h2>
        <form id="changePasswordForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Aktuelles Passwort</label>
            <input id="oldPassword" type="password"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Neues Passwort</label>
            <input id="newPassword" type="password"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Mindestens 8 Zeichen"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Neues Passwort bestätigen</label>
            <input id="newPasswordConfirm" type="password"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Passwort wiederholen"/>
          </div>

          <div id="pwError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
          <div id="pwSuccess" class="hidden bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            Passwort erfolgreich geändert ✓
          </div>

          <button type="submit" id="btnChangePw"
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
            Passwort ändern
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderProfileDisplay(profile) {
  const field = (label, value) => `
    <div class="flex items-center justify-between">
      <span class="text-slate-500">${label}</span>
      <span class="font-medium text-slate-800">${value || "–"}</span>
    </div>
  `;
  const address = profile.street
    ? `${profile.street}${profile.zip || profile.city ? ", " + [profile.zip, profile.city].filter(Boolean).join(" ") : ""}`
    : null;
  return `
    ${field("Vorname", profile.first_name)}
    ${field("Nachname", profile.last_name)}
    ${field("Adresse", address)}
    ${field("Kontoinhaber", profile.bank_name)}
    ${field("IBAN", profile.iban)}
    ${field("BIC", profile.bic)}
  `;
}

export function initProfile() {
  // Password change form
  const form = document.getElementById("changePasswordForm");
  const errorEl = document.getElementById("pwError");
  const successEl = document.getElementById("pwSuccess");
  const btn = document.getElementById("btnChangePw");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const old_password = document.getElementById("oldPassword").value;
    const new_password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("newPasswordConfirm").value;

    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    if (new_password.length < 8) {
      errorEl.textContent = "Neues Passwort muss mindestens 8 Zeichen haben.";
      errorEl.classList.remove("hidden");
      return;
    }
    if (new_password !== confirm) {
      errorEl.textContent = "Passwörter stimmen nicht überein.";
      errorEl.classList.remove("hidden");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Wird gespeichert...";

    try {
      await api.changePassword({ old_password, new_password });
      successEl.classList.remove("hidden");
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message || "Fehler beim Ändern.";
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Passwort ändern";
    }
  });

  // Personal data profile section
  let profileData = null;

  const profileDisplay = document.getElementById("profileDisplay");
  const profileForm = document.getElementById("profileForm");
  const profileError = document.getElementById("profileError");
  const btnEdit = document.getElementById("btnEditProfile");
  const btnCancel = document.getElementById("btnCancelProfile");
  const hourlyRateCard = document.getElementById("hourlyRateCard");
  const hourlyRateValue = document.getElementById("hourlyRateValue");

  function showDisplay() {
    profileDisplay.classList.remove("hidden");
    profileForm.classList.add("hidden");
  }

  function showForm() {
    profileDisplay.classList.add("hidden");
    profileForm.classList.remove("hidden");
  }

  function fillForm(profile) {
    document.getElementById("pFirstName").value = profile.first_name || "";
    document.getElementById("pLastName").value = profile.last_name || "";
    document.getElementById("pStreet").value = profile.street || "";
    document.getElementById("pZip").value = profile.zip || "";
    document.getElementById("pCity").value = profile.city || "";
    document.getElementById("pBankName").value = profile.bank_name || "";
    document.getElementById("pIban").value = profile.iban || "";
    document.getElementById("pBic").value = profile.bic || "";
  }

  // Load profile on init
  api.getProfile().then((profile) => {
    profileData = profile;
    profileDisplay.innerHTML = renderProfileDisplay(profile);

    if (profile.role === "mitarbeiter" && profile.hourly_rate != null) {
      hourlyRateCard.classList.remove("hidden");
      hourlyRateValue.textContent = `${profile.hourly_rate.toFixed(2)} €/h`;
    }
  }).catch((err) => {
    profileDisplay.innerHTML = `<div class="text-red-500 text-sm">Fehler: ${err.message}</div>`;
  });

  btnEdit.addEventListener("click", () => {
    if (profileData) fillForm(profileData);
    profileError.classList.add("hidden");
    showForm();
  });

  btnCancel.addEventListener("click", () => {
    showDisplay();
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    profileError.classList.add("hidden");

    const saveBtn = document.getElementById("btnSaveProfile");
    saveBtn.disabled = true;
    saveBtn.textContent = "Speichern...";

    try {
      const updated = await api.updateProfile({
        first_name: document.getElementById("pFirstName").value.trim() || null,
        last_name: document.getElementById("pLastName").value.trim() || null,
        street: document.getElementById("pStreet").value.trim() || null,
        zip: document.getElementById("pZip").value.trim() || null,
        city: document.getElementById("pCity").value.trim() || null,
        iban: document.getElementById("pIban").value.trim() || null,
        bic: document.getElementById("pBic").value.trim() || null,
        bank_name: document.getElementById("pBankName").value.trim() || null,
      });
      profileData = updated;
      profileDisplay.innerHTML = renderProfileDisplay(updated);

      if (updated.role === "mitarbeiter" && updated.hourly_rate != null) {
        hourlyRateCard.classList.remove("hidden");
        hourlyRateValue.textContent = `${updated.hourly_rate.toFixed(2)} €/h`;
      }

      showDisplay();
    } catch (err) {
      profileError.textContent = err.message || "Fehler beim Speichern.";
      profileError.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Speichern";
    }
  });
}
