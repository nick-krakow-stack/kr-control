import { renderLogin, initLogin } from "./views/login.js";
import { renderDashboard, initDashboard } from "./views/dashboard.js";
import { renderLocations, initLocations } from "./views/locations.js";
import { renderCases, initCases } from "./views/cases.js";
import { renderCaseNew, initCaseNew } from "./views/case-new.js";
import { renderCaseDetail, initCaseDetail } from "./views/case-detail.js";
import { renderLayout, setActiveNav } from "./app.js";

const isLoggedIn = () => !!localStorage.getItem("kr_token");

const routes = {
  "#/login": {
    render: renderLogin,
    init: initLogin,
    public: true,
  },
  "#/dashboard": {
    render: () => renderLayout(renderDashboard),
    init: initDashboard,
  },
  "#/locations": {
    render: () => renderLayout(renderLocations),
    init: initLocations,
  },
  "#/cases": {
    render: () => renderLayout(renderCases),
    init: initCases,
  },
  "#/cases/new": {
    render: () => renderLayout(renderCaseNew),
    init: initCaseNew,
  },
};

function getCaseDetailId(hash) {
  const match = hash.match(/^#\/cases\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

export async function navigate() {
  const hash = window.location.hash || "#/dashboard";
  const app = document.getElementById("app");

  // Check auth
  if (!isLoggedIn() && hash !== "#/login") {
    window.location.hash = "#/login";
    return;
  }
  if (isLoggedIn() && hash === "#/login") {
    window.location.hash = "#/dashboard";
    return;
  }

  // Case detail route
  const caseId = getCaseDetailId(hash);
  if (caseId) {
    app.innerHTML = await renderLayout(async () => renderCaseDetail(caseId));
    setActiveNav("#/cases");
    await initCaseDetail(caseId);
    return;
  }

  // New case route (before generic case match)
  const route = routes[hash];
  if (!route) {
    window.location.hash = isLoggedIn() ? "#/dashboard" : "#/login";
    return;
  }

  app.innerHTML = await route.render();
  setActiveNav(hash);
  if (route.init) await route.init();
}
