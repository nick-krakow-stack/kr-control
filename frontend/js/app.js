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
      hash: "#/cases/new",
      label: "Neuer Fall",
      roles: ["admin", "mitarbeiter", "self_control_business", "self_control_private"],
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
    {
      hash: "#/kontrolle",
      label: "Kontrolle",
      roles: ["admin", "mitarbeiter"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>`,
    },
    {
      hash: "#/admin/customers",
      label: "Kunden",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>`,
    },
    {
      hash: "#/whitelist",
      label: "Whitelist",
      roles: ["admin", "mitarbeiter", "self_control_business", "self_control_private"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>`,
    },
    {
      hash: "#/admin/shifts",
      label: "Schichten",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
    },
    {
      hash: "#/admin/violations",
      label: "Tatbestände",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>`,
    },
    {
      hash: "#/admin/vehicle-types",
      label: "Fahrzeugtypen",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h10a4 4 0 004-4v-4l-2-6H5l-2 6v4zm5 0a1 1 0 110-2 1 1 0 010 2zm8 0a1 1 0 110-2 1 1 0 010 2z"/>`,
    },
    {
      hash: "#/admin",
      label: "Admin Panel",
      roles: ["admin"],
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`,
    },
  ];

  return all.filter((item) => !role || item.roles.includes(role));
}

function buildMobileNav(user) {
  const role = user?.role;

  const navItem = (href, icon, label, extraClass = "") => `
    <a href="${href}" class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 nav-item${extraClass ? " " + extraClass : ""}" data-nav="${href}">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
      <span class="text-xs font-medium">${label}</span>
    </a>
  `;

  const centerButton = `
    <div class="flex-1 flex flex-col items-center justify-center">
      <a href="#/cases/new" class="nav-item" data-nav="#/cases/new">
        <div class="-mt-5 w-14 h-14 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
      </a>
    </div>
  `;

  const houseIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`;
  const listIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`;
  const kontrolleIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
  const shieldIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`;
  const userIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`;
  const mapPinIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>`;
  const plusIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>`;
  const chevronUpIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>`;

  const moreBtn = `
    <button id="btnMobileMore" class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${chevronUpIcon}</svg>
      <span class="text-xs font-medium">Mehr</span>
    </button>
  `;

  if (role === "admin" || role === "mitarbeiter") {
    return `
      ${navItem("#/dashboard", houseIcon, "Home")}
      ${navItem("#/cases", listIcon, "Fälle")}
      ${centerButton}
      ${navItem("#/kontrolle", kontrolleIcon, "Kontrolle")}
      ${moreBtn}
    `;
  }

  if (role === "self_control_business" || role === "self_control_private") {
    return `
      ${navItem("#/dashboard", houseIcon, "Home")}
      ${navItem("#/report", plusIcon, "Melden")}
      ${navItem("#/whitelist", shieldIcon, "Whitelist")}
      ${navItem("#/profile", userIcon, "Profil")}
    `;
  }

  if (role === "buchhaltung") {
    return `
      ${navItem("#/dashboard", houseIcon, "Home")}
      ${navItem("#/cases", listIcon, "Fälle")}
      ${navItem("#/locations", mapPinIcon, "Parkplätze")}
      ${navItem("#/profile", userIcon, "Profil")}
    `;
  }

  // Fallback
  return navItem("#/dashboard", houseIcon, "Home");
}

function buildMoreDrawerItems(user) {
  const role = user?.role;

  const drawerItem = (href, icon, label) => `
    <a href="${href}" class="more-drawer-link flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 text-slate-700">
      <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
      <span class="text-xs font-medium text-center">${label}</span>
    </a>
  `;

  const logoutBtn = `
    <button id="moreDrawerLogout" class="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-600">
      <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
      <span class="text-xs font-medium text-center">Abmelden</span>
    </button>
  `;

  const adminIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
  const shieldIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`;
  const clockIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
  const usersIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>`;
  const userIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`;
  const calendarIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>`;
  const carIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h10a4 4 0 004-4v-4l-2-6H5l-2 6v4zm5 0a1 1 0 110-2 1 1 0 010 2zm8 0a1 1 0 110-2 1 1 0 010 2z"/>`;

  if (role === "admin") {
    return `
      ${drawerItem("#/admin", adminIcon, "Admin Panel")}
      ${drawerItem("#/whitelist", shieldIcon, "Whitelist")}
      ${drawerItem("#/admin/shifts", clockIcon, "Schichten")}
      ${drawerItem("#/admin/customers", usersIcon, "Kunden")}
      ${drawerItem("#/admin/users", usersIcon, "Benutzer")}
      ${drawerItem("#/admin/vehicle-types", carIcon, "Fahrzeugtypen")}
      ${logoutBtn}
    `;
  }

  if (role === "mitarbeiter") {
    return `
      ${drawerItem("#/whitelist", shieldIcon, "Whitelist")}
      ${drawerItem("#/work-times", calendarIcon, "Arbeitszeiten")}
      ${drawerItem("#/profile", userIcon, "Profil")}
      ${logoutBtn}
    `;
  }

  return logoutBtn;
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
      <aside class="w-64 bg-slate-900 hidden md:flex flex-col flex-shrink-0 shadow-xl">
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
      <main class="flex-1 overflow-y-auto pb-20 md:pb-0">
        ${content}
      </main>

      <!-- Mobile Bottom Nav -->
      <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden" style="padding-bottom: env(safe-area-inset-bottom)">
        <div class="flex items-stretch h-16">
          ${buildMobileNav(user)}
        </div>
      </nav>

      <!-- More Drawer -->
      <div id="moreDrawer" class="fixed inset-x-0 bottom-16 z-40 bg-white border-t border-slate-200 shadow-lg rounded-t-2xl md:hidden hidden" style="padding-bottom: env(safe-area-inset-bottom)">
        <div class="p-4 grid grid-cols-3 gap-3">
          ${buildMoreDrawerItems(user)}
        </div>
      </div>
      <div id="moreDrawerOverlay" class="fixed inset-0 z-30 bg-black/20 md:hidden hidden" onclick="document.getElementById('moreDrawer').classList.add('hidden'); document.getElementById('moreDrawerOverlay').classList.add('hidden')"></div>
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
    // Check if this is a sidebar nav item (inside aside) or bottom nav item
    const isSidebarItem = el.closest("aside") !== null;

    if (isSidebarItem) {
      if (!isAccent) {
        el.classList.toggle("bg-slate-800", isActive);
        el.classList.toggle("text-white", isActive);
        el.classList.toggle("text-slate-400", !isActive);
      }
    } else {
      // Bottom nav: just highlight with blue color, no background
      el.classList.toggle("text-blue-600", isActive);
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

  // Wire up More button
  const moreBtn = document.getElementById("btnMobileMore");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      const drawer = document.getElementById("moreDrawer");
      const overlay = document.getElementById("moreDrawerOverlay");
      drawer.classList.toggle("hidden");
      overlay.classList.toggle("hidden");
    });
  }

  // Close drawer on nav-item clicks inside it
  document.querySelectorAll(".more-drawer-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("moreDrawer")?.classList.add("hidden");
      document.getElementById("moreDrawerOverlay")?.classList.add("hidden");
    });
  });

  // More drawer logout
  const moreDrawerLogout = document.getElementById("moreDrawerLogout");
  if (moreDrawerLogout) {
    moreDrawerLogout.addEventListener("click", () => {
      localStorage.removeItem("kr_token");
      localStorage.removeItem("kr_user");
      window.location.hash = "#/login";
    });
  }
}

// Boot
window.addEventListener("hashchange", navigate);
window.addEventListener("load", navigate);
