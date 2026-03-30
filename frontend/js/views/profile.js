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

export function initProfile() {
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
}
