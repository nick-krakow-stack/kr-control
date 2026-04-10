import { renderLogin, initLogin } from "./views/login.js";
import { renderDashboard, initDashboard } from "./views/dashboard.js";
import { renderLocations, initLocations } from "./views/locations.js";
import { renderCases, initCases } from "./views/cases.js";
import { renderCaseNew, initCaseNew } from "./views/case-new.js";
import { renderCaseDetail, initCaseDetail } from "./views/case-detail.js";
import { renderPasswordSetup, initPasswordSetup } from "./views/password-setup.js";
import { renderPasswordForgot, initPasswordForgot } from "./views/password-forgot.js";
import { renderPasswordReset, initPasswordReset } from "./views/password-reset.js";
import { renderAdminUsers, initAdminUsers } from "./views/admin-users.js";
import { renderSelfControlReport, initSelfControlReport } from "./views/self-control-report.js";
import { renderProfile, initProfile } from "./views/profile.js";
import { renderKontrolle, initKontrolle } from "./views/kontrolle.js";
import { renderAdminCustomers, initAdminCustomers } from "./views/admin-customers.js";
import { renderWhitelist, initWhitelist } from "./views/whitelist.js";
import { renderAdminShifts, initAdminShifts } from "./views/admin-shifts.js";
import { renderAdminPanel, initAdminPanel } from "./views/admin-panel.js";
import { renderSettings, initSettings } from "./views/settings.js";
import { renderWorkTimes, initWorkTimes } from "./views/work-times.js";
import { renderAdminWorkTimes, initAdminWorkTimes } from "./views/admin-work-times.js";
import { renderAdminViolations, initAdminViolations } from "./views/admin-violations.js";
import { renderAdminVehicleTypes, initAdminVehicleTypes } from "./views/admin-vehicle-types.js";
import { renderLayout, setActiveNav } from "./app.js";
import { isSelfControl, isAdmin } from "./config.js";

const isLoggedIn = () => !!localStorage.getItem("kr_token");

// Passwort-Setup-Token aus Hash extrahieren: #/password-setup/TOKEN
function getSetupToken(hash) {
  const match = hash.match(/^#\/password-setup\/(.+)$/);
  return match ? match[1] : null;
}

// Passwort-Reset-Token aus Hash extrahieren: #/password-reset/TOKEN
function getResetToken(hash) {
  const match = hash.match(/^#\/password-reset\/(.+)$/);
  return match ? match[1] : null;
}

// Case-ID aus Hash extrahieren: #/cases/123
function getCaseDetailId(hash) {
  const match = hash.match(/^#\/cases\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

const routes = {
  "#/login": { render: renderLogin, init: initLogin, public: true },
  "#/forgot-password": { render: renderPasswordForgot, init: initPasswordForgot, public: true },
  "#/dashboard": { render: () => renderLayout(renderDashboard), init: initDashboard },
  "#/locations": { render: () => renderLayout(renderLocations), init: initLocations },
  "#/cases": { render: () => renderLayout(renderCases), init: initCases },
  "#/cases/new": { render: () => renderLayout(renderCaseNew), init: initCaseNew },
  "#/report": { render: () => renderLayout(renderCaseNew), init: initCaseNew },
  "#/admin/users": { render: () => renderLayout(renderAdminUsers), init: initAdminUsers },
  "#/profile": { render: () => renderLayout(renderProfile), init: initProfile },
  "#/kontrolle": { render: () => renderLayout(renderKontrolle), init: initKontrolle },
  "#/admin/customers": { render: () => renderLayout(renderAdminCustomers), init: initAdminCustomers },
  "#/whitelist": { render: () => renderLayout(renderWhitelist), init: initWhitelist },
  "#/admin/shifts": { render: () => renderLayout(renderAdminShifts), init: initAdminShifts },
  "#/admin": { render: () => renderLayout(renderAdminPanel), init: initAdminPanel },
  "#/work-times": { render: () => renderLayout(renderWorkTimes), init: initWorkTimes },
  "#/admin/work-times": { render: () => renderLayout(renderAdminWorkTimes), init: initAdminWorkTimes },
  "#/admin/violations": { render: () => renderLayout(renderAdminViolations), init: initAdminViolations },
  "#/admin/vehicle-types": { render: () => renderLayout(renderAdminVehicleTypes), init: initAdminVehicleTypes },
  "#/settings": { render: () => renderLayout(renderSettings), init: initSettings },
};

export async function navigate() {
  const hash = window.location.hash || "#/dashboard";
  const app = document.getElementById("app");

  // Passwort-Setup (öffentlich, kein Login nötig)
  const setupToken = getSetupToken(hash);
  if (setupToken) {
    app.innerHTML = await renderPasswordSetup(setupToken);
    await initPasswordSetup(setupToken);
    return;
  }

  // Passwort-Reset (öffentlich, kein Login nötig)
  const resetToken = getResetToken(hash);
  if (resetToken) {
    app.innerHTML = await renderPasswordReset(resetToken);
    await initPasswordReset(resetToken);
    return;
  }

  // Auth-Check
  const routeForAuth = routes[hash];
  if (!isLoggedIn() && !routeForAuth?.public) {
    window.location.hash = "#/login";
    return;
  }
  if (isLoggedIn() && hash === "#/login") {
    window.location.hash = "#/dashboard";
    return;
  }

  // Case-Detail-Route
  const caseId = getCaseDetailId(hash);
  if (caseId) {
    app.innerHTML = await renderLayout(async () => renderCaseDetail(caseId));
    setActiveNav("#/cases");
    await initCaseDetail(caseId);
    return;
  }

  // Admin-Guard
  if ((hash === "#/admin/users" || hash === "#/admin/customers" || hash === "#/admin/shifts" || hash === "#/admin" || hash === "#/admin/work-times" || hash === "#/admin/violations" || hash === "#/admin/vehicle-types" || hash === "#/settings") && !isAdmin()) {
    window.location.hash = "#/dashboard";
    return;
  }

  const route = routes[hash];
  if (!route) {
    window.location.hash = isLoggedIn() ? "#/dashboard" : "#/login";
    return;
  }

  app.innerHTML = await route.render();
  setActiveNav(hash);
  if (route.init) await route.init();
}
