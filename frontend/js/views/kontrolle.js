import { api } from "../api.js";

const SHIFT_KEY = "kr_active_shift";

function getActiveShift() {
  try { return JSON.parse(localStorage.getItem(SHIFT_KEY)); } catch { return null; }
}
function setActiveShift(shift) {
  localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
}
function clearActiveShift() {
  localStorage.removeItem(SHIFT_KEY);
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(startIso) {
  const diffMs = Date.now() - new Date(startIso).getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export async function renderKontrolle() {
  return `<div class="p-6 lg:p-8 max-w-4xl mx-auto" id="kontrolleRoot">
    <div class="animate-pulse">
      <div class="h-8 bg-slate-100 rounded w-1/3 mb-4"></div>
      <div class="h-48 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>`;
}

export async function initKontrolle() {
  await refreshKontrolle();
}

let durationInterval = null;

async function refreshKontrolle() {
  if (durationInterval) { clearInterval(durationInterval); durationInterval = null; }

  const root = document.getElementById("kontrolleRoot");
  const active = getActiveShift();

  if (!active) {
    // No active shift: show start UI
    let locations = [];
    try {
      locations = await api.getLocations();
    } catch (err) {
      root.innerHTML = `<div class="text-red-500 text-sm">Fehler beim Laden der Parkplätze: ${err.message}</div>`;
      return;
    }

    root.innerHTML = `
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800">Kontrolle starten</h1>
        <p class="text-slate-500 text-sm mt-1">Wählen Sie einen Parkplatz und starten Sie Ihre Kontrolle</p>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-md">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Parkplatz *</label>
            <select id="shiftLocation" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
              <option value="">Parkplatz auswählen...</option>
              ${locations.map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}
            </select>
          </div>
          <div id="startShiftError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>
          <button id="btnStartShift"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Kontrolle starten
          </button>
        </div>
      </div>
    `;

    document.getElementById("btnStartShift").addEventListener("click", async () => {
      const locationId = document.getElementById("shiftLocation").value;
      const errorEl = document.getElementById("startShiftError");
      errorEl.classList.add("hidden");

      if (!locationId) {
        errorEl.textContent = "Bitte einen Parkplatz auswählen.";
        errorEl.classList.remove("hidden");
        return;
      }

      const btn = document.getElementById("btnStartShift");
      btn.disabled = true;
      btn.textContent = "Wird gestartet...";

      try {
        const shift = await api.shifts.create({ location_id: parseInt(locationId) });
        setActiveShift(shift);
        await refreshKontrolle();
      } catch (err) {
        errorEl.textContent = "Fehler: " + err.message;
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg> Kontrolle starten`;
      }
    });

  } else {
    // Active shift: try to get latest data
    let currentShift = active;
    try {
      const shifts = await api.shifts.list({ active: true });
      const found = Array.isArray(shifts) ? shifts.find((s) => s.id === active.id) : null;
      if (found) {
        currentShift = found;
        setActiveShift(found);
      }
    } catch {
      // Use cached data
    }

    const locationName = currentShift.location_name || currentShift.location?.name || `Parkplatz #${currentShift.location_id}`;
    const caseCount = currentShift.case_count ?? 0;

    root.innerHTML = `
      <div class="mb-8">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h1 class="text-2xl font-bold text-slate-800">Kontrolle läuft</h1>
        </div>
        <p class="text-slate-500 text-sm mt-1">Aktive Kontrolle – Fälle erfassen</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="text-xs text-slate-400 mb-1">Parkplatz</div>
          <div class="font-semibold text-slate-800">${locationName}</div>
        </div>
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="text-xs text-slate-400 mb-1">Gestartet</div>
          <div class="font-semibold text-slate-800">${formatDateTime(currentShift.started_at)}</div>
        </div>
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="text-xs text-slate-400 mb-1">Dauer</div>
          <div class="font-semibold text-slate-800" id="shiftDuration">${formatDuration(currentShift.started_at)}</div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4">
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="text-3xl font-bold text-slate-800">${caseCount}</div>
            <div class="text-sm text-slate-500">Fälle in dieser Kontrolle</div>
          </div>
          <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
        </div>

        <a href="#/cases/new?location_id=${currentShift.location_id}&shift_id=${currentShift.id}"
          class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm
                 flex items-center justify-center gap-2 text-base mb-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neuer Fall erfassen
        </a>

        <button id="btnEndShift"
          class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
          </svg>
          Kontrolle beenden
        </button>
      </div>
    `;

    // Update duration every minute
    durationInterval = setInterval(() => {
      const el = document.getElementById("shiftDuration");
      if (el) el.textContent = formatDuration(currentShift.started_at);
      else { clearInterval(durationInterval); durationInterval = null; }
    }, 60000);

    document.getElementById("btnEndShift").addEventListener("click", async () => {
      if (!confirm("Kontrolle beenden?")) return;
      const btn = document.getElementById("btnEndShift");
      btn.disabled = true;
      btn.textContent = "Wird beendet...";
      try {
        await api.shifts.end(currentShift.id);
        clearActiveShift();
        await refreshKontrolle();
      } catch (err) {
        alert("Fehler beim Beenden: " + err.message);
        btn.disabled = false;
        btn.textContent = "Kontrolle beenden";
      }
    });
  }
}
