import { navigate } from "./router.js";
import { getUser, isAdmin, isSelfControl, ROLE_LABELS } from "./config.js";

function buildNavItems() {
  const user = getUser();
  const role = user?.role;

  const all = [
    {
      hash: "#/dashboard",
      label: "Dashboard",
      roles: ["admin", "mitarbeiter", "self_control_business", "self_control_private"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
    },
    {
      hash: "#/report",
      label: "Verstoß melden",
      roles: ["self_control_business", "self_control_private"],
      accent: true,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>`,
    },
    {
      hash: "#/cases/new",
      label: "Neuer Fall",
      roles: ["admin", "mitarbeiter"],
      accent: true,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>`,
    },
    {
      hash: "#/cases",
      label: "Fälle",
      roles: ["admin", "mitarbeiter", "self_control_business", "self_control_private"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
    },
    {
      hash: "#/locations",
      label: "Parkplätze",
      roles: ["admin", "mitarbeiter"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>`,
    },
    {
      hash: "#/admin/users",
      label: "Benutzer",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>`,
    },
  ];

  return all.filter((item) => !role || item.roles.includes(role));
}

export async function renderLayout(contentFn) {
  const content = await contentFn();
  const user = getUser();
  const navItems = buildNavItems();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  return `
    <div class="flex h-screen bg-slate-50 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 flex flex-col flex-shrink-0 shadow-xl">
        <!-- Logo -->
        <div class="px-6 py-5 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <div class="text-white font-bold text-sm leading-tight">KR Control</div>
              <div class="text-slate-500 text-xs">Parkplatzkontrolle</div>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          ${navItems.map((item) => `
            <a href="${item.hash}" data-nav="${item.hash}"
              class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group
                ${item.accent
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                }">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${item.icon}
              </svg>
              ${item.label}
            </a>
          `).join("")}
        </nav>

        <!-- Bottom: user & logout -->
        <div class="px-3 py-4 border-t border-slate-800">
          <a href="#/profile" class="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span class="text-white text-xs font-bold">${initials}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-white text-xs font-medium truncate">${user?.username || "Benutzer"}</div>
              <div class="text-slate-500 text-xs">${ROLE_LABELS[user?.role] || user?.role || ""}</div>
            </div>
          </a>
          <button id="logoutBtn"
            class="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-slate-800
                   rounded-xl transition-colors text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Abmelden
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto">
        ${content}
      </main>
    </div>
  `;
}

export function setActiveNav(hash) {
  const activeHash = hash === "#/cases/new" || hash === "#/report"
    ? hash
    : hash.replace(/#\/cases\/\d+$/, "#/cases");

  document.querySelectorAll(".nav-item").forEach((el) => {
    const navHash = el.dataset.nav;
    const isActive = navHash === activeHash;
    const isAccent = el.classList.contains("bg-blue-600");

    if (!isAccent) {
      el.classList.toggle("bg-slate-800", isActive);
      el.classList.toggle("text-white", isActive);
      el.classList.toggle("text-slate-400", !isActive);
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("kr_token");
      localStorage.removeItem("kr_user");
      window.location.hash = "#/login";
    });
  }
}

// Boot
window.addEventListener("hashchange", navigate);
window.addEventListener("load", navigate);
