import { renderLogin, initLogin } from "./views/login.js";
import { renderDashboard, initDashboard } from "./views/dashboard.js";
import { renderLocations, initLocations } from "./views/locations.js";
import { renderCases, initCases } from "./views/cases.js";
import { renderCaseNew, initCaseNew } from "./views/case-new.js";
import { renderCaseDetail, initCaseDetail } from "./views/case-detail.js";
import { renderPasswordSetup, initPasswordSetup } from "./views/password-setup.js";
import { renderAdminUsers, initAdminUsers } from "./views/admin-users.js";
import { renderSelfControlReport, initSelfControlReport } from "./views/self-control-report.js";
import { renderProfile, initProfile } from "./views/profile.js";
import { renderLayout, setActiveNav } from "./app.js";
import { isSelfControl, isAdmin } from "./config.js";

const isLoggedIn = () => !!localStorage.getItem("kr_token");

// Passwort-Setup-Token aus Hash extrahieren: #/password-setup/TOKEN
function getSetupToken(hash) {
  const match = hash.match(/^#\/password-setup\/(.+)$/);
  return match ? match[1] : null;
}

// Case-ID aus Hash extrahieren: #/cases/123
function getCaseDetailId(hash) {
  const match = hash.match(/^#\/cases\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

const routes = {
  "#/login": { render: renderLogin, init: initLogin, public: true },
  "#/dashboard": { render: () => renderLayout(renderDashboard), init: initDashboard },
  "#/locations": { render: () => renderLayout(renderLocations), init: initLocations },
  "#/cases": { render: () => renderLayout(renderCases), init: initCases },
  "#/cases/new": { render: () => renderLayout(renderCaseNew), init: initCaseNew },
  "#/report": { render: () => renderLayout(renderCaseNew), init: initCaseNew },
  "#/admin/users": { render: () => renderLayout(renderAdminUsers), init: initAdminUsers },
  "#/profile": { render: () => renderLayout(renderProfile), init: initProfile },
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

  // Auth-Check
  if (!isLoggedIn() && hash !== "#/login") {
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
  if (hash === "#/admin/users" && !isAdmin()) {
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
