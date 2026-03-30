import { api } from "../api.js";
import { STATUS_LABELS, STATUS_COLORS, isSelfControl } from "../config.js";

export async function renderDashboard() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p class="text-slate-500 text-sm mt-1">Übersicht aller Aktivitäten</p>
      </div>

      <div id="statCards" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${[1,2,3,4].map(() => `
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
            <div class="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
            <div class="h-8 bg-slate-100 rounded w-1/2"></div>
          </div>
        `).join("")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="font-semibold text-slate-800">Letzte Fälle</h2>
              <a href="#/cases" class="text-sm text-blue-600 hover:text-blue-700 font-medium">Alle anzeigen →</a>
            </div>
            <div id="recentCases" class="divide-y divide-slate-50">
              <div class="p-6 text-slate-400 text-sm">Lade Daten...</div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
              <h2 class="font-semibold text-slate-800">Status-Verteilung</h2>
            </div>
            <div id="statusDist" class="p-4 space-y-2">
              <div class="text-slate-400 text-sm p-2">Lade Daten...</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
              <h2 class="font-semibold text-slate-800">Top Parkplätze</h2>
            </div>
            <div id="topLocations" class="p-4 space-y-2">
              <div class="text-slate-400 text-sm p-2">Lade Daten...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initDashboard() {
  try {
    const stats = await api.getStats();
    renderStatCards(stats);
    renderRecentCases(stats.recent_cases);
    renderStatusDist(stats.status_distribution, stats.total_cases);
    renderTopLocations(stats.top_locations);
  } catch (err) {
    console.error("Dashboard-Fehler:", err);
  }
}

function renderStatCards(stats) {
  const selfControl = isSelfControl();
  const cards = selfControl ? [
    {
      label: "Meine Meldungen",
      value: stats.total_cases,
      sub: `${stats.cases_month} diesen Monat`,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Heute",
      value: stats.cases_today,
      sub: `${stats.cases_week} diese Woche`,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "In Bearbeitung",
      value: stats.open_cases,
      sub: "Aktive Vorgänge",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Standorte",
      value: stats.total_locations,
      sub: "Zugewiesen",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>`,
      color: "text-emerald-600 bg-emerald-50",
    },
  ] : [
    {
      label: "Fälle gesamt",
      value: stats.total_cases,
      sub: `${stats.cases_month} diesen Monat`,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Heute",
      value: stats.cases_today,
      sub: `${stats.cases_week} diese Woche`,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Offene Fälle",
      value: stats.open_cases,
      sub: stats.deadline_exceeded > 0 ? `⚠ ${stats.deadline_exceeded} Frist abgelaufen` : "Alle im Zeitplan",
      subColor: stats.deadline_exceeded > 0 ? "text-red-500" : "text-slate-400",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>`,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Parkplätze",
      value: stats.total_locations,
      sub: "Aktive Standorte",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>`,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  document.getElementById("statCards").innerHTML = cards.map((c) => `
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between mb-3">
        <span class="text-sm font-medium text-slate-500">${c.label}</span>
        <div class="p-2 rounded-xl ${c.color}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">${c.icon}</svg>
        </div>
      </div>
      <div class="text-3xl font-bold text-slate-800 mb-1">${c.value}</div>
      <div class="text-xs ${c.subColor || "text-slate-400"}">${c.sub}</div>
    </div>
  `).join("");
}

function renderRecentCases(cases) {
  const el = document.getElementById("recentCases");
  if (!cases.length) {
    el.innerHTML = `<div class="p-6 text-slate-400 text-sm text-center">Noch keine Fälle vorhanden</div>`;
    return;
  }
  el.innerHTML = cases.map((c) => `
    <a href="#/cases/${c.id}" class="flex items-center px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="font-mono font-semibold text-slate-800 text-sm">${c.license_plate}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}">
            ${STATUS_LABELS[c.status] || c.status}
          </span>
        </div>
        <div class="text-xs text-slate-400">${formatDateTime(c.reported_at)}</div>
      </div>
      <svg class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  `).join("");
}

function renderStatusDist(dist, total) {
  const el = document.getElementById("statusDist");
  if (!dist.length) { el.innerHTML = `<div class="text-slate-400 text-sm p-2">Keine Daten</div>`; return; }
  el.innerHTML = dist.map((d) => {
    const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
    return `
      <div class="flex items-center gap-3 px-2 py-1">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || "bg-slate-100 text-slate-600"} min-w-0 truncate flex-1">
          ${STATUS_LABELS[d.status] || d.status}
        </span>
        <span class="text-sm font-semibold text-slate-700 flex-shrink-0">${d.count}</span>
        <span class="text-xs text-slate-400 w-8 text-right flex-shrink-0">${pct}%</span>
      </div>
    `;
  }).join("");
}

function renderTopLocations(locations) {
  const el = document.getElementById("topLocations");
  if (!locations.length) { el.innerHTML = `<div class="text-slate-400 text-sm p-2">Noch keine Fälle</div>`; return; }
  const max = locations[0]?.count || 1;
  el.innerHTML = locations.map((l) => `
    <div class="px-2 py-1.5">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm text-slate-700 truncate flex-1">${l.name}</span>
        <span class="text-sm font-semibold text-slate-800 ml-2">${l.count}</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-1.5">
        <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${Math.round((l.count / max) * 100)}%"></div>
      </div>
    </div>
  `).join("");
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
