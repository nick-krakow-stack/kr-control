import { api } from "../api.js";

export async function renderAdminShifts() {
  return `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Schichten</h1>
          <p class="text-slate-500 text-sm mt-1">Kontroll-Schichten und Statistiken</p>
        </div>
      </div>

      <!-- Stats cards -->
      <div id="shiftStatsCards" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${[1,2,3,4].map(() => `
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
            <div class="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
            <div class="h-8 bg-slate-100 rounded w-1/2"></div>
          </div>
        `).join("")}
      </div>

      <!-- Filter bar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Von</label>
            <input id="filterDateFrom" type="date"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Bis</label>
            <input id="filterDateTo" type="date"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Mitarbeiter</label>
            <select id="filterUser"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Alle</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Parkplatz</label>
            <select id="filterLocation"
              class="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Alle</option>
            </select>
          </div>
          <button id="btnApplyFilter"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            Anwenden
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div id="shiftsTable">
          <div class="p-8 text-center text-slate-400 text-sm">Lade Daten...</div>
        </div>
      </div>
    </div>
  `;
}

export async function initAdminShifts() {
  // Load stats
  loadStats();

  // Default filter: this month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("filterDateFrom").value = firstOfMonth.toISOString().slice(0, 10);
  document.getElementById("filterDateTo").value = today.toISOString().slice(0, 10);

  // Load locations for filter
  try {
    const locations = await api.getLocations();
    const locSelect = document.getElementById("filterLocation");
    locations.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.name;
      locSelect.appendChild(opt);
    });
  } catch {}

  // Load shifts and populate user filter
  await loadShifts();

  document.getElementById("btnApplyFilter").addEventListener("click", loadShifts);
}

async function loadStats() {
  try {
    const stats = await api.shifts.stats();
    const cards = [
      { label: "Schichten heute", value: stats.shifts_today ?? 0, color: "text-blue-600 bg-blue-50" },
      { label: "Fälle heute", value: stats.cases_today ?? 0, color: "text-indigo-600 bg-indigo-50" },
      { label: "Schichten diesen Monat", value: stats.shifts_month ?? 0, color: "text-emerald-600 bg-emerald-50" },
      { label: "Fälle diesen Monat", value: stats.cases_month ?? 0, color: "text-violet-600 bg-violet-50" },
    ];
    document.getElementById("shiftStatsCards").innerHTML = cards.map((c) => `
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div class="text-xs text-slate-500 mb-2">${c.label}</div>
        <div class="text-3xl font-bold text-slate-800">${c.value}</div>
      </div>
    `).join("");
  } catch {
    document.getElementById("shiftStatsCards").innerHTML = "";
  }
}

async function loadShifts() {
  const tableEl = document.getElementById("shiftsTable");
  tableEl.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">Lade...</div>`;

  const params = {
    date_from: document.getElementById("filterDateFrom").value || undefined,
    date_to: document.getElementById("filterDateTo").value || undefined,
    user_id: document.getElementById("filterUser").value || undefined,
    location_id: document.getElementById("filterLocation").value || undefined,
  };

  try {
    const shifts = await api.shifts.list(params);

    // Populate user filter from results
    const userSelect = document.getElementById("filterUser");
    const existingUsers = new Set(Array.from(userSelect.options).map((o) => o.value));
    if (Array.isArray(shifts)) {
      shifts.forEach((s) => {
        const uid = String(s.user_id || "");
        if (uid && !existingUsers.has(uid)) {
          existingUsers.add(uid);
          const opt = document.createElement("option");
          opt.value = uid;
          opt.textContent = s.username || `User #${uid}`;
          userSelect.appendChild(opt);
        }
      });
    }

    if (!Array.isArray(shifts) || !shifts.length) {
      tableEl.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">Keine Schichten im gewählten Zeitraum</div>`;
      return;
    }

    tableEl.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">Mitarbeiter</th>
              <th class="px-4 py-3 font-medium">Parkplatz</th>
              <th class="px-4 py-3 font-medium">Beginn</th>
              <th class="px-4 py-3 font-medium">Ende</th>
              <th class="px-4 py-3 font-medium">Dauer</th>
              <th class="px-4 py-3 font-medium text-right">Fälle</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            ${shifts.map((s) => {
              const duration = s.ended_at ? computeDuration(s.started_at, s.ended_at) : "Läuft noch";
              const endDisplay = s.ended_at ? formatDateTime(s.ended_at) : `<span class="text-green-600 font-medium">Aktiv</span>`;
              return `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-800">${s.username || "–"}</td>
                  <td class="px-4 py-3 text-slate-600">${s.location_name || s.location?.name || `#${s.location_id}`}</td>
                  <td class="px-4 py-3 text-slate-600">${formatDateTime(s.started_at)}</td>
                  <td class="px-4 py-3 text-slate-600">${endDisplay}</td>
                  <td class="px-4 py-3 text-slate-600">${duration}</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-700">${s.case_count ?? 0}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    tableEl.innerHTML = `<div class="p-8 text-center text-red-500 text-sm">Fehler: ${err.message}</div>`;
  }
}

function computeDuration(startIso, endIso) {
  const diffMs = new Date(endIso) - new Date(startIso);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
