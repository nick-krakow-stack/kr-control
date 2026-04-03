import { api } from "../api.js";
import { STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS, isSelfControl } from "../config.js";

let allCases = [];
let locations = [];

export async function renderCases() {
  const selfControl = isSelfControl();
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Fälle</h1>
          <p class="text-slate-500 text-sm mt-1">${selfControl ? "Meine gemeldeten Verstöße" : "Alle gemeldeten Falschparker"}</p>
        </div>
        ${selfControl ? `
          <a href="#/report"
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Verstoß melden
          </a>
        ` : `
          <a href="#/cases/new"
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Neuer Fall
          </a>
        `}
      </div>

      <!-- Filter -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
        <div class="flex flex-wrap gap-3">
          <input id="filterSearch" type="text" placeholder="Kennzeichen suchen..."
            class="flex-1 min-w-48 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
          <select id="filterStatus" class="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-auto min-w-40">
            <option value="">Alle Status</option>
            ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
          </select>
          <select id="filterLocation" class="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-auto min-w-40">
            <option value="">Alle Parkplätze</option>
          </select>
          <button id="btnClearFilters"
            class="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm">
            Zurücksetzen
          </button>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Kennzeichen</th>
                <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Parkplatz</th>
                <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Gemeldet</th>
                ${!selfControl ? `<th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Typ</th>` : ""}
                <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                ${!selfControl ? `<th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Frist</th>` : ""}
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody id="casesTableBody" class="divide-y divide-slate-50">
              <tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">Lade Daten...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="casesCount" class="px-6 py-3 border-t border-slate-100 text-xs text-slate-400"></div>
      </div>
    </div>
  `;
}

export async function initCases() {
  try {
    [allCases, locations] = await Promise.all([api.getCases(), api.getLocations()]);
    populateLocationFilter();
    renderTable(allCases);
    setupFilters();
  } catch (err) {
    document.getElementById("casesTableBody").innerHTML = `
      <tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Fehler: ${err.message}</td></tr>
    `;
  }
}

function populateLocationFilter() {
  const sel = document.getElementById("filterLocation");
  locations.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    sel.appendChild(opt);
  });
}

function renderTable(cases) {
  const tbody = document.getElementById("casesTableBody");
  const countEl = document.getElementById("casesCount");
  const selfControl = isSelfControl();
  countEl.textContent = `${cases.length} Fälle`;

  if (!cases.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="px-6 py-12 text-center text-slate-400 text-sm">Keine Fälle gefunden</td></tr>
    `;
    return;
  }

  tbody.innerHTML = cases.map((c) => {
    const loc = locations.find((l) => l.id === c.location_id);
    const isDeadlineOver = c.payment_deadline && new Date(c.payment_deadline) < new Date();
    const isOpen = ["new", "ticket_issued", "in_progress"].includes(c.status);
    const canRecall = c.status === "pending" && c.recall_deadline && new Date(c.recall_deadline) > new Date();

    return `
      <tr class="hover:bg-slate-50 transition-colors cursor-pointer group" onclick="window.location.hash='#/cases/${c.id}'">
        <td class="px-6 py-4">
          <span class="font-mono font-semibold text-slate-800">${c.license_plate}</span>
          ${c.ticket_number ? `<div class="text-xs text-slate-400 mt-0.5">Ticket: ${c.ticket_number}</div>` : ""}
        </td>
        <td class="px-4 py-4 text-sm text-slate-600">${loc?.name || "–"}</td>
        <td class="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">${formatDateTime(c.reported_at)}</td>
        ${!selfControl ? `
          <td class="px-4 py-4">
            <span class="text-xs text-slate-500">${CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
          </td>
        ` : ""}
        <td class="px-4 py-4">
          <span class="text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}">
            ${STATUS_LABELS[c.status] || c.status}
          </span>
          ${canRecall ? `<div class="text-xs text-amber-600 mt-0.5">Widerrufbar</div>` : ""}
        </td>
        ${!selfControl ? `
          <td class="px-4 py-4 text-sm whitespace-nowrap">
            ${c.payment_deadline
              ? `<span class="${isDeadlineOver && isOpen ? "text-red-500 font-medium" : "text-slate-400"}">
                  ${formatDate(c.payment_deadline)}
                </span>`
              : "–"
            }
          </td>
        ` : ""}
        <td class="px-4 py-4 text-right">
          <svg class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </td>
      </tr>
    `;
  }).join("");
}

function setupFilters() {
  const applyFilters = () => {
    const search = document.getElementById("filterSearch").value.trim().toLowerCase();
    const status = document.getElementById("filterStatus").value;
    const locationId = document.getElementById("filterLocation").value;
    const filtered = allCases.filter((c) => {
      const matchSearch = !search ||
        c.license_plate.toLowerCase().includes(search) ||
        (c.ticket_number && c.ticket_number.toLowerCase().includes(search));
      const matchStatus = !status || c.status === status;
      const matchLocation = !locationId || c.location_id === parseInt(locationId);
      return matchSearch && matchStatus && matchLocation;
    });
    renderTable(filtered);
  };

  document.getElementById("filterSearch").addEventListener("input", applyFilters);
  document.getElementById("filterStatus").addEventListener("change", applyFilters);
  document.getElementById("filterLocation").addEventListener("change", applyFilters);
  document.getElementById("btnClearFilters").addEventListener("click", () => {
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("filterLocation").value = "";
    renderTable(allCases);
  });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
