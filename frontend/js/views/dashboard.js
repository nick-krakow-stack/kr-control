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

      <div id="recallSection" class="mb-6"></div>

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

      <!-- Auswertung -->
      <div class="mt-8">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <h2 class="font-semibold text-slate-800 flex-1">Auswertung</h2>
            <div class="flex flex-wrap gap-2" id="reportPresets">
              <button data-preset="today"  class="report-preset-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Heute</button>
              <button data-preset="week"   class="report-preset-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Diese Woche</button>
              <button data-preset="month"  class="report-preset-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-semibold bg-slate-100">Dieser Monat</button>
              <button data-preset="all"    class="report-preset-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Alles</button>
            </div>
            <div class="flex items-center gap-2">
              <input id="reportFrom" type="date" class="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              <span class="text-slate-400 text-xs">–</span>
              <input id="reportTo" type="date" class="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          <div id="reportSummary" class="grid grid-cols-3 gap-4 p-4 border-b border-slate-50">
            <div class="text-center py-2">
              <div class="text-xs text-slate-400 mb-1">Fälle</div>
              <div id="rptCases" class="text-2xl font-bold text-slate-800">–</div>
            </div>
            <div class="text-center py-2 border-x border-slate-100">
              <div class="text-xs text-slate-400 mb-1">Ticket-Beträge</div>
              <div id="rptTicket" class="text-2xl font-bold text-violet-700">–</div>
            </div>
            <div class="text-center py-2">
              <div class="text-xs text-slate-400 mb-1">Brief-Beträge</div>
              <div id="rptLetter" class="text-2xl font-bold text-slate-600">–</div>
            </div>
          </div>

          <div id="reportTable" class="p-4">
            <div class="text-slate-400 text-sm text-center py-4">Lade Daten...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initDashboard() {
  try {
    const [stats, pendingCases] = await Promise.all([
      api.getStats(),
      api.getCases({ status: "pending" }).catch(() => []),
    ]);

    renderStatCards(stats);
    renderRecentCases(stats.recent_cases);
    renderStatusDist(stats.status_distribution, stats.total_cases);
    renderTopLocations(stats.top_locations);

    const recallable = (Array.isArray(pendingCases) ? pendingCases : []).filter(
      (c) => c.recall_deadline && new Date(c.recall_deadline) > new Date()
    );
    renderRecallSection(recallable);
    initReport();
  } catch (err) {
    console.error("Dashboard-Fehler:", err);
  }
}

function initReport() {
  // Default: dieser Monat
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const fmtInput = (d) => d.toISOString().slice(0, 10);

  document.getElementById("reportFrom").value = fmtInput(firstOfMonth);
  document.getElementById("reportTo").value = fmtInput(today);

  const loadReport = async () => {
    const from = document.getElementById("reportFrom").value;
    const to = document.getElementById("reportTo").value;
    if (!from || !to) return;
    document.getElementById("reportTable").innerHTML = `<div class="text-slate-400 text-sm text-center py-4">Lade...</div>`;
    try {
      const data = await api.getReport(from, to);
      document.getElementById("rptCases").textContent = data.total_cases;
      document.getElementById("rptTicket").textContent = data.total_amount_ticket.toFixed(0) + "€";
      document.getElementById("rptLetter").textContent = data.total_amount_letter.toFixed(0) + "€";
      renderReportTable(data.per_location);
    } catch (err) {
      document.getElementById("reportTable").innerHTML = `<div class="text-red-400 text-sm text-center py-4">Fehler: ${err.message}</div>`;
    }
  };

  // Preset buttons
  document.querySelectorAll(".report-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const now = new Date();
      let from, to = fmtInput(now);
      const preset = btn.dataset.preset;
      if (preset === "today") {
        from = to;
      } else if (preset === "week") {
        const d = new Date(now); d.setDate(d.getDate() - 6);
        from = fmtInput(d);
      } else if (preset === "month") {
        from = fmtInput(new Date(now.getFullYear(), now.getMonth(), 1));
      } else {
        from = "2020-01-01";
        to = fmtInput(now);
      }
      document.getElementById("reportFrom").value = from;
      document.getElementById("reportTo").value = to;

      // Highlight active preset
      document.querySelectorAll(".report-preset-btn").forEach((b) => {
        b.classList.remove("font-semibold", "bg-slate-100");
      });
      btn.classList.add("font-semibold", "bg-slate-100");

      loadReport();
    });
  });

  document.getElementById("reportFrom").addEventListener("change", () => {
    document.querySelectorAll(".report-preset-btn").forEach((b) => b.classList.remove("font-semibold", "bg-slate-100"));
    loadReport();
  });
  document.getElementById("reportTo").addEventListener("change", () => {
    document.querySelectorAll(".report-preset-btn").forEach((b) => b.classList.remove("font-semibold", "bg-slate-100"));
    loadReport();
  });

  loadReport();
}

function renderReportTable(locations) {
  const el = document.getElementById("reportTable");
  if (!locations.length) {
    el.innerHTML = `<div class="text-slate-400 text-sm text-center py-6">Keine Fälle im gewählten Zeitraum</div>`;
    return;
  }
  const maxCount = locations[0]?.count || 1;
  el.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-slate-400 border-b border-slate-100">
          <th class="pb-2 font-medium">Standort</th>
          <th class="pb-2 font-medium text-right w-16">Fälle</th>
          <th class="pb-2 font-medium text-right w-24">Tickets</th>
          <th class="pb-2 font-medium text-right w-24">Briefe</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        ${locations.map((l) => `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-2.5 pr-4">
              <div class="text-slate-800 font-medium truncate max-w-[200px]">${l.name}</div>
              <div class="w-full bg-slate-100 rounded-full h-1 mt-1">
                <div class="bg-blue-400 h-1 rounded-full" style="width: ${Math.round((l.count / maxCount) * 100)}%"></div>
              </div>
            </td>
            <td class="py-2.5 text-right font-semibold text-slate-700">${l.count}</td>
            <td class="py-2.5 text-right text-violet-700 font-medium">${l.amount_ticket.toFixed(0)}€</td>
            <td class="py-2.5 text-right text-slate-500">${l.amount_letter.toFixed(0)}€</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot class="border-t border-slate-200">
        <tr>
          <td class="pt-2.5 text-xs text-slate-400 font-medium">Gesamt</td>
          <td class="pt-2.5 text-right font-bold text-slate-800">${locations.reduce((s, l) => s + l.count, 0)}</td>
          <td class="pt-2.5 text-right font-bold text-violet-700">${locations.reduce((s, l) => s + l.amount_ticket, 0).toFixed(0)}€</td>
          <td class="pt-2.5 text-right font-bold text-slate-600">${locations.reduce((s, l) => s + l.amount_letter, 0).toFixed(0)}€</td>
        </tr>
      </tfoot>
    </table>
  `;
}

function formatTimeLeft(deadline) {
  const msLeft = new Date(deadline) - new Date();
  if (msLeft <= 0) return null;
  const totalMinutes = Math.floor(msLeft / 60000);
  if (totalMinutes < 60) {
    return { text: `${totalMinutes} min`, urgent: totalMinutes < 15 };
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const text = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return { text, urgent: false };
}

function renderRecallSection(cases) {
  const el = document.getElementById("recallSection");
  if (!el) return;

  if (!cases.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-amber-200 flex items-center gap-3">
        <span class="text-lg">⏳</span>
        <h2 class="font-semibold text-amber-900 flex-1">Aktive Widerrufsfenster</h2>
        <span class="bg-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">${cases.length}</span>
      </div>
      <p class="px-6 py-2 text-xs text-amber-700 border-b border-amber-100">Diese Fälle können noch widerrufen werden</p>
      <div class="divide-y divide-amber-100">
        ${cases.map((c) => {
          const timeLeft = formatTimeLeft(c.recall_deadline);
          if (!timeLeft) return "";
          const locationName = c.location?.name ?? "–";
          const timeColor = timeLeft.urgent ? "text-red-600 font-semibold" : "text-amber-700";
          return `
            <a href="#/cases/${c.id}" class="flex items-center px-6 py-3.5 hover:bg-amber-100 transition-colors cursor-pointer group">
              <div class="flex-1 min-w-0 flex items-center gap-4">
                <span class="font-mono font-semibold text-slate-800 text-sm flex-shrink-0">${c.license_plate}</span>
                <span class="text-sm text-slate-600 truncate flex-1">${locationName}</span>
                <span class="text-sm ${timeColor} flex-shrink-0">noch ${timeLeft.text}</span>
              </div>
              <svg class="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          `;
        }).join("")}
      </div>
    </div>
  `;
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
      label: "Offene Beträge",
      value: `${((stats.open_amount_ticket ?? 0) + (stats.open_amount_letter ?? 0)).toFixed(0)}€`,
      sub: stats.open_amount_letter > 0
        ? `${(stats.open_amount_letter ?? 0).toFixed(0)}€ davon als Brief`
        : "Noch keine Briefe",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      color: "text-violet-600 bg-violet-50",
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
