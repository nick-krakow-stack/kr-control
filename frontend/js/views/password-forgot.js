import { api } from "../api.js";

export function renderPasswordForgot() {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white tracking-tight">KR Control</h1>
          <p class="text-slate-400 mt-1 text-sm">Passwort zurücksetzen</p>
        </div>

        <div id="forgotCard" class="bg-white rounded-2xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-slate-800 mb-2">Passwort vergessen?</h2>
          <p class="text-slate-500 text-sm mb-6">
            Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, erhalten Sie einen Link zum Zurücksetzen.
          </p>

          <form id="forgotForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">E-Mail-Adresse</label>
              <input id="forgotEmail" type="email" autocomplete="email"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="ihre@email.de"/>
            </div>
            <div id="forgotError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
            <button type="submit" id="forgotBtn"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Link anfordern
            </button>
          </form>
          <div class="text-center mt-4">
            <a href="#/login" class="text-sm text-slate-400 hover:text-blue-600 transition-colors">
              Zurück zur Anmeldung
            </a>
          </div>
        </div>

        <div id="forgotSuccess" class="hidden bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-slate-800 mb-2">E-Mail gesendet</h2>
          <p class="text-slate-500 text-sm mb-6">
            Falls ein Konto mit dieser E-Mail existiert, erhalten Sie in Kürze eine E-Mail mit einem Reset-Link.
          </p>
          <a href="#/login" class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            Zurück zur Anmeldung
          </a>
        </div>

        <p class="text-center text-slate-500 text-xs mt-6">KR Control &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

export function initPasswordForgot() {
  const form = document.getElementById("forgotForm");
  const errorEl = document.getElementById("forgotError");
  const btn = document.getElementById("forgotBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = "Wird gesendet...";
    errorEl.classList.add("hidden");

    try {
      await api.forgotPassword(email);
    } catch {
      // Fehler ignorieren – immer Erfolgsmeldung zeigen (Anti-Enumeration)
    } finally {
      document.getElementById("forgotCard").classList.add("hidden");
      document.getElementById("forgotSuccess").classList.remove("hidden");
    }
  });
}
