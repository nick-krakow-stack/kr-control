import { api } from "../api.js";

export function renderLogin() {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white tracking-tight">KR Control</h1>
          <p class="text-slate-400 mt-1 text-sm">Parkplatzkontrolle & Verwaltung</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-slate-800 mb-6">Anmelden</h2>
          <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Benutzername</label>
              <input id="loginUsername" type="text" autocomplete="username"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Benutzername"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Passwort</label>
              <input id="loginPassword" type="password" autocomplete="current-password"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"/>
            </div>
            <div id="loginError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <button type="submit" id="loginBtn"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Anmelden
            </button>
          </form>
          <div class="text-center mt-3">
            <a href="#/forgot-password" class="text-sm text-slate-400 hover:text-blue-600 transition-colors">
              Passwort vergessen?
            </a>
          </div>
        </div>

        <p class="text-center text-slate-500 text-xs mt-6">KR Control &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

export function initLogin() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!username || !password) return;

    btn.disabled = true;
    btn.textContent = "Anmelden...";
    errorEl.classList.add("hidden");

    try {
      const data = await api.login(username, password);
      localStorage.setItem("kr_token", data.access_token);
      // User-Info laden und speichern
      const user = await api.getMe();
      localStorage.setItem("kr_user", JSON.stringify(user));
      window.location.hash = "#/dashboard";
    } catch (err) {
      errorEl.textContent = err.message || "Benutzername oder Passwort falsch.";
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Anmelden";
    }
  });

  document.getElementById("loginUsername").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("loginPassword").focus();
  });
}
