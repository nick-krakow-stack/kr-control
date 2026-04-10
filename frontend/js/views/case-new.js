import { api } from "../api.js";
import { getUser } from "../config.js";
import { openTicket } from "../ticket.js";

let selectedFiles = [];
let toastTimeout = null;
let currentViolations = [];
let currentVehicleTypes = [];

export async function renderCaseNew() {
  const locations = await api.getLocations();

  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const dateStr = local.toISOString().slice(0, 10);
  const timeStr = local.toISOString().slice(11, 16);

  const useCards = locations.length > 0 && locations.length <= 6;
  const role = getUser()?.role || "mitarbeiter";
  const isSelfControlUser = role === "self_control_business" || role === "self_control_private";
  const isAdminUser = role === "admin";
  const isMitarbeiter = role === "mitarbeiter";

  const locationContent = useCards
    ? `<div class="grid grid-cols-2 gap-2" id="locationCards">
        ${locations.map((l) => `
          <button type="button" data-loc-id="${l.id}"
            class="loc-card flex items-start gap-2.5 p-3.5 border-2 border-slate-200 rounded-xl text-left transition-all hover:border-blue-300 hover:bg-blue-50/50">
            <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 loc-icon">
              <svg class="w-3.5 h-3.5 text-slate-400 loc-pin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-slate-700 leading-snug loc-label">${l.name}</span>
          </button>
        `).join("")}
      </div>
      <input type="hidden" id="caseLocation"/>`
    : `<select id="caseLocation" required class="input">
        <option value="">Parkplatz auswählen...</option>
        ${locations.map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}
       </select>`;

  return `
    <div class="p-4 lg:p-8 max-w-xl mx-auto pb-10">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a href="#/cases" class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Neuer Fall</h1>
          <p class="text-slate-400 text-xs mt-0.5">Falschparker erfassen</p>
        </div>
      </div>

      <form id="caseForm" class="space-y-4">

        <!-- ① Kennzeichen -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 20h10M7 20a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2M7 20H5a2 2 0 01-2-2v-1M17 20h2a2 2 0 002-2v-1"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Kennzeichen</span>
          </div>

          <!-- Plate widget: 3 fields, shrinks to content -->
          <div class="text-center">
            <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-lg"
                 style="border: 3px solid #1a1a1a;">
              <!-- EU strip: fixed, no shrink -->
              <div class="flex flex-col items-center justify-center gap-1 select-none"
                   style="background: #003399; width: 44px; flex-shrink: 0; padding: 10px 0;">
                <svg viewBox="0 0 20 20" width="18" height="18">
                  <circle cx="10"    cy="3"     r="0.9" fill="#FFCC00"/>
                  <circle cx="13.5"  cy="3.94"  r="0.9" fill="#FFCC00"/>
                  <circle cx="16.06" cy="6.5"   r="0.9" fill="#FFCC00"/>
                  <circle cx="17"    cy="10"    r="0.9" fill="#FFCC00"/>
                  <circle cx="16.06" cy="13.5"  r="0.9" fill="#FFCC00"/>
                  <circle cx="13.5"  cy="16.06" r="0.9" fill="#FFCC00"/>
                  <circle cx="10"    cy="17"    r="0.9" fill="#FFCC00"/>
                  <circle cx="6.5"   cy="16.06" r="0.9" fill="#FFCC00"/>
                  <circle cx="3.94"  cy="13.5"  r="0.9" fill="#FFCC00"/>
                  <circle cx="3"     cy="10"    r="0.9" fill="#FFCC00"/>
                  <circle cx="3.94"  cy="6.5"   r="0.9" fill="#FFCC00"/>
                  <circle cx="6.5"   cy="3.94"  r="0.9" fill="#FFCC00"/>
                </svg>
                <span style="color: white; font-size: 10px; font-weight: 900; letter-spacing: 1px; line-height: 1;">D</span>
              </div>
              <!-- Divider -->
              <div style="width: 3px; background: #1a1a1a; flex-shrink: 0;"></div>
              <!-- Three input fields -->
              <div class="flex items-center bg-white" style="padding: 0 10px; gap: 0;">
                <input id="plateOrt" type="text" maxlength="3" autocomplete="off" inputmode="text"
                  placeholder="HL"
                  style="font-family: 'Arial Black', Impact, sans-serif; font-size: 1.75rem; font-weight: 900;
                         letter-spacing: 0.05em; width: 3.2ch; border: none; outline: none; text-align: center;
                         text-transform: uppercase; background: transparent; color: #1a1a1a;
                         padding: 12px 0; flex-shrink: 0;"/>
                <span style="font-family: 'Arial Black', Impact, sans-serif; font-size: 1.75rem; font-weight: 900;
                             color: #1a1a1a; flex-shrink: 0; padding: 0 2px; user-select: none; line-height: 1;">·</span>
                <input id="plateBuchst" type="text" maxlength="2" autocomplete="off" inputmode="text"
                  placeholder="VS"
                  style="font-family: 'Arial Black', Impact, sans-serif; font-size: 1.75rem; font-weight: 900;
                         letter-spacing: 0.05em; width: 2.4ch; border: none; outline: none; text-align: center;
                         text-transform: uppercase; background: transparent; color: #1a1a1a;
                         padding: 12px 0; flex-shrink: 0;"/>
                <span style="font-family: 'Arial Black', Impact, sans-serif; font-size: 1.75rem;
                             flex-shrink: 0; padding: 0 4px; user-select: none; opacity: 0;">·</span>
                <input id="plateNr" type="text" maxlength="5" autocomplete="off" inputmode="text"
                  placeholder="1820"
                  style="font-family: 'Arial Black', Impact, sans-serif; font-size: 1.75rem; font-weight: 900;
                         letter-spacing: 0.05em; width: 4.8ch; border: none; outline: none;
                         text-align: center; text-transform: uppercase; background: transparent;
                         color: #1a1a1a; padding: 12px 0; flex-shrink: 0;"/>
              </div>
            </div>
          </div>
          <p class="text-center text-xs text-slate-400 mt-2.5">Ortskennzeichen · Buchstaben · Nummer</p>
        </div>

        <!-- ② Standort -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Standort</span>
          </div>
          ${locationContent}
          ${!locations.length ? `
            <p class="text-xs text-orange-500 mt-2 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              Noch kein Parkplatz angelegt.
              <a href="#/locations" class="underline font-medium">Jetzt anlegen →</a>
            </p>
          ` : ""}
        </div>

        <!-- ③ Tatbestand (Pflichtfeld) -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100" id="violationSection">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tatbestand</span>
            <span class="ml-auto text-[10px] bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-full">Pflichtfeld</span>
          </div>
          <div id="violationContent">
            <p class="text-xs text-slate-400">Bitte zuerst einen Standort auswählen.</p>
          </div>
          <input type="hidden" id="caseViolation"/>
        </div>

        <!-- ④ Fahrzeugtyp (Pflichtfeld) -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100" id="vehicleTypeSection">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 20h10M7 20a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2M7 20H5a2 2 0 01-2-2v-1M17 20h2a2 2 0 002-2v-1"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fahrzeugtyp</span>
            <span class="ml-auto text-[10px] bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-full">Pflichtfeld</span>
          </div>
          <div id="vehicleTypeContent">
            <p class="text-xs text-slate-400">Bitte zuerst einen Standort auswählen.</p>
          </div>
          <input type="hidden" id="caseVehicleType"/>
        </div>

        <!-- ⑤ Datum & Uhrzeit -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Datum & Uhrzeit</span>
            <span class="ml-auto text-[10px] bg-emerald-50 text-emerald-600 font-medium px-2 py-0.5 rounded-full">Automatisch jetzt</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 mb-1.5 block">Datum</label>
              <input id="caseDate" type="date" required class="input font-medium" value="${dateStr}"/>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1.5 block">Uhrzeit</label>
              <input id="caseTime" type="time" required class="input font-medium" value="${timeStr}"/>
            </div>
          </div>
        </div>

        <!-- ⑤ Falltyp -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Falltyp</span>
          </div>
          <div class="space-y-2">
            ${!isSelfControlUser ? `
            <label class="case-type-card flex items-center gap-3 p-3.5 border-2 ${!isSelfControlUser ? "border-blue-500 bg-blue-50" : "border-slate-200"} rounded-xl cursor-pointer transition-all">
              <input type="radio" name="caseType" value="standard" ${!isSelfControlUser ? "checked" : ""} class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
              <div>
                <div class="text-sm font-semibold text-slate-800">Standard</div>
                <div class="text-xs text-slate-500">KR-Kontrolle</div>
              </div>
            </label>
            ` : ""}
            ${!isMitarbeiter ? `
            <label class="case-type-card flex items-center gap-3 p-3.5 border-2 ${isSelfControlUser ? "border-blue-500 bg-blue-50" : "border-slate-200"} rounded-xl cursor-pointer transition-all hover:border-slate-300">
              <input type="radio" name="caseType" value="self_control_ticket" ${isSelfControlUser ? "checked" : ""} class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
              <div>
                <div class="text-sm font-semibold text-slate-800">Self-Control + Ticket</div>
                <div class="text-xs text-slate-500">Eigenmeldung mit Ticket</div>
              </div>
            </label>
            <label class="case-type-card flex items-center gap-3 p-3.5 border-2 border-slate-200 rounded-xl cursor-pointer transition-all hover:border-slate-300">
              <input type="radio" name="caseType" value="self_control_direct" class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
              <div>
                <div class="text-sm font-semibold text-slate-800">Self-Control direkt</div>
                <div class="text-xs text-slate-500">Eigenmeldung ohne Ticket</div>
              </div>
            </label>
            ` : ""}
          </div>
        </div>

        <!-- ⑥ Fotos -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fotos</span>
            <span id="photoCount" class="ml-auto text-[10px] bg-rose-50 text-rose-600 font-medium px-2 py-0.5 rounded-full hidden"></span>
          </div>

          <div id="dropZone"
            class="border-2 border-dashed border-slate-200 rounded-xl p-7 text-center cursor-pointer
                   hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
            <div class="flex flex-col items-center gap-3">
              <div class="w-14 h-14 bg-slate-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                <svg class="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-700">Fotos auswählen oder ablegen</p>
                <p class="text-xs text-slate-400 mt-0.5">JPEG · PNG · HEIC · Max. 20 MB</p>
              </div>
              <div class="flex items-center gap-2">
                <span id="btnBrowse" class="text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                  Durchsuchen
                </span>
                <span id="btnCamera" class="text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Kamera
                </span>
              </div>
            </div>
            <input id="imageInput" type="file" accept="image/*" multiple class="hidden"/>
            <input id="cameraInput" type="file" accept="image/*" capture="environment" class="hidden"/>
          </div>

          <div id="imagePreview" class="grid grid-cols-3 gap-2 mt-3 empty:hidden"></div>
        </div>

        <!-- ⑦ Notizen -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 bg-slate-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Notizen</span>
            <span class="ml-auto text-[10px] text-slate-400 font-medium">Optional</span>
          </div>
          <textarea id="caseNotes" class="input resize-none" rows="3"
            placeholder="z.B. Fahrzeug stand bereits beim letzten Kontrollgang dort..."></textarea>
        </div>

        <!-- Success Toast -->
        <div id="successToast" class="hidden bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span class="font-medium">Fall erfasst!</span>
          <a id="successToastLink" href="#" class="text-green-700 font-semibold underline hover:text-green-900 transition-colors">Anzeigen →</a>
        </div>

        <!-- Error -->
        <div id="caseFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>

        <!-- Actions -->
        <div class="flex gap-3 pt-1">
          <a href="#/cases"
            class="px-5 py-3.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50
                   transition-colors text-sm text-center flex-shrink-0">
            Abbrechen
          </a>
          <button type="submit" id="btnSubmitCase"
            class="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold
                   rounded-xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Fall melden
          </button>
        </div>

      </form>
    </div>
  `;
}

export function initCaseNew() {
  selectedFiles = [];

  // ── URL-Parameter (shift mode) ────────────────────────────────
  const hashParts = window.location.hash.split('?');
  const params = new URLSearchParams(hashParts[1] || '');
  const preLocationId = params.get('location_id');
  const shiftId = params.get('shift_id');

  // Show "← Zur Kontrolle" link if in shift mode
  if (shiftId) {
    const headerDiv = document.querySelector('#caseForm')?.closest('.p-4, .p-6, [class*="p-"]');
    const headerEl = document.querySelector('.flex.items-center.gap-3.mb-6');
    if (headerEl) {
      const kontrolleLink = document.createElement('a');
      kontrolleLink.href = '#/kontrolle';
      kontrolleLink.className = 'text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mb-3';
      kontrolleLink.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Zur Kontrolle`;
      headerEl.parentNode.insertBefore(kontrolleLink, headerEl);
    }
  }

  // ── Kennzeichen: 3 Felder mit Auto-Advance ────────────────────
  const plateOrt   = document.getElementById("plateOrt");
  const plateBuchst = document.getElementById("plateBuchst");
  const plateNr    = document.getElementById("plateNr");

  function plateInput(e, maxLen, nextEl) {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    e.target.value = v;
    if (nextEl && v.length >= maxLen) nextEl.focus();
  }
  function plateKeydown(e, prevEl, nextEl) {
    if (e.key === "Backspace" && e.target.value === "" && prevEl) {
      e.preventDefault();
      prevEl.focus();
    }
    if (e.key === " " && nextEl) {
      e.preventDefault();
      nextEl.focus();
    }
  }

  plateOrt.addEventListener("input",   (e) => plateInput(e, 3, plateBuchst));
  plateBuchst.addEventListener("input", (e) => plateInput(e, 2, plateNr));
  plateNr.addEventListener("input",    (e) => { e.target.value = e.target.value.toUpperCase(); });

  plateOrt.addEventListener("keydown",    (e) => plateKeydown(e, null,      plateBuchst));
  plateBuchst.addEventListener("keydown", (e) => plateKeydown(e, plateOrt,  plateNr));
  plateNr.addEventListener("keydown",     (e) => plateKeydown(e, plateBuchst, null));

  // ── Standort-Kacheln ──────────────────────────────────────────
  const locationCards = document.getElementById("locationCards");
  if (locationCards) {
    locationCards.querySelectorAll(".loc-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (preLocationId) return; // locked in shift mode
        locationCards.querySelectorAll(".loc-card").forEach((c) => {
          c.classList.remove("border-blue-500", "bg-blue-50");
          c.classList.add("border-slate-200");
          c.querySelector(".loc-icon").classList.remove("bg-blue-100");
          c.querySelector(".loc-icon").classList.add("bg-slate-100");
          c.querySelector(".loc-pin").classList.remove("text-blue-600");
          c.querySelector(".loc-pin").classList.add("text-slate-400");
          c.querySelector(".loc-label").classList.remove("text-blue-700");
          c.querySelector(".loc-label").classList.add("text-slate-700");
        });
        card.classList.add("border-blue-500", "bg-blue-50");
        card.classList.remove("border-slate-200");
        card.querySelector(".loc-icon").classList.add("bg-blue-100");
        card.querySelector(".loc-icon").classList.remove("bg-slate-100");
        card.querySelector(".loc-pin").classList.add("text-blue-600");
        card.querySelector(".loc-pin").classList.remove("text-slate-400");
        card.querySelector(".loc-label").classList.add("text-blue-700");
        card.querySelector(".loc-label").classList.remove("text-slate-700");
        document.getElementById("caseLocation").value = card.dataset.locId;
        loadViolationsForLocation(card.dataset.locId);
      });
    });

    // Pre-select location if preLocationId is set
    if (preLocationId) {
      const preCard = locationCards.querySelector(`.loc-card[data-loc-id="${preLocationId}"]`);
      if (preCard) {
        preCard.classList.add("border-blue-500", "bg-blue-50");
        preCard.classList.remove("border-slate-200");
        preCard.querySelector(".loc-icon")?.classList.add("bg-blue-100");
        preCard.querySelector(".loc-icon")?.classList.remove("bg-slate-100");
        preCard.querySelector(".loc-pin")?.classList.add("text-blue-600");
        preCard.querySelector(".loc-pin")?.classList.remove("text-slate-400");
        preCard.querySelector(".loc-label")?.classList.add("text-blue-700");
        preCard.querySelector(".loc-label")?.classList.remove("text-slate-700");
        document.getElementById("caseLocation").value = preLocationId;
        // Disable all cards visually
        locationCards.querySelectorAll(".loc-card").forEach((c) => {
          c.style.pointerEvents = "none";
          c.style.opacity = c === preCard ? "1" : "0.4";
        });
      }
    }
  }

  // Pre-select location dropdown if using select element
  if (preLocationId) {
    const locSelect = document.getElementById("caseLocation");
    if (locSelect && locSelect.tagName === "SELECT") {
      locSelect.value = preLocationId;
      locSelect.disabled = true;
      locSelect.addEventListener("change", (e) => {
        if (e.target.value) loadViolationsForLocation(e.target.value);
      });
    }
    loadViolationsForLocation(preLocationId);
  } else {
    const locSelect = document.getElementById("caseLocation");
    if (locSelect && locSelect.tagName === "SELECT") {
      locSelect.addEventListener("change", (e) => {
        if (e.target.value) loadViolationsForLocation(e.target.value);
      });
    }
  }

  // ── Falltyp-Karten ────────────────────────────────────────────
  document.querySelectorAll('input[name="caseType"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".case-type-card").forEach((l) => {
        l.classList.remove("border-blue-500", "bg-blue-50");
        l.classList.add("border-slate-200");
      });
      radio.closest(".case-type-card").classList.add("border-blue-500", "bg-blue-50");
      radio.closest(".case-type-card").classList.remove("border-slate-200");
    });
  });

  // ── Foto-Upload ───────────────────────────────────────────────
  const dropZone   = document.getElementById("dropZone");
  const imageInput = document.getElementById("imageInput");
  const cameraInput = document.getElementById("cameraInput");
  const btnBrowse  = document.getElementById("btnBrowse");
  const btnCamera  = document.getElementById("btnCamera");

  // "Durchsuchen"-Button öffnet Galerie-Auswahl (kein capture)
  btnBrowse.addEventListener("click", (e) => {
    e.stopPropagation();
    imageInput.click();
  });

  // "Kamera"-Button öffnet direkt Rückkamera
  btnCamera.addEventListener("click", (e) => {
    e.stopPropagation();
    cameraInput.click();
  });

  // Klick auf Drop-Zone (außerhalb der Buttons) öffnet Galerie
  dropZone.addEventListener("click", () => imageInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-blue-400", "bg-blue-50/30");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-blue-400", "bg-blue-50/30");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-blue-400", "bg-blue-50/30");
    addFiles(Array.from(e.dataTransfer.files));
  });
  imageInput.addEventListener("change", () => {
    addFiles(Array.from(imageInput.files));
    imageInput.value = "";
  });
  cameraInput.addEventListener("change", () => {
    addFiles(Array.from(cameraInput.files));
    cameraInput.value = "";
  });

  // ── Submit ────────────────────────────────────────────────────
  document.getElementById("caseForm").addEventListener("submit", (e) => submitCase(e, preLocationId, shiftId));
}

function addFiles(files) {
  selectedFiles.push(...files.filter((f) => f.type.startsWith("image/")));
  renderPreview();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreview();
}

function renderPreview() {
  const preview = document.getElementById("imagePreview");
  const badge = document.getElementById("photoCount");

  if (!selectedFiles.length) {
    preview.innerHTML = "";
    badge.classList.add("hidden");
    return;
  }

  badge.textContent = `${selectedFiles.length} Foto${selectedFiles.length !== 1 ? "s" : ""}`;
  badge.classList.remove("hidden");

  preview.innerHTML = selectedFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="relative group aspect-square">
        <img src="${url}" class="w-full h-full object-cover rounded-xl border border-slate-100" alt="Foto ${i + 1}"/>
        <button type="button" onclick="window._removeFile(${i})"
          class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full
                 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100
                 transition-opacity shadow-md">×</button>
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl px-1.5 pb-1.5 pt-4">
          <span class="text-[10px] text-white/90 truncate block leading-none">
            ${file.name.length > 16 ? file.name.slice(0, 13) + "…" : file.name}
          </span>
        </div>
      </div>`;
  }).join("");

  window._removeFile = (i) => removeFile(i);
}

function resetForm(createdId) {
  // Kennzeichen leeren
  document.getElementById("plateOrt").value = "";
  document.getElementById("plateBuchst").value = "";
  document.getElementById("plateNr").value = "";

  // Standort: Karten-Stil zurücksetzen + hidden input leeren
  const locationCards = document.getElementById("locationCards");
  if (locationCards) {
    locationCards.querySelectorAll(".loc-card").forEach((c) => {
      c.classList.remove("border-blue-500", "bg-blue-50");
      c.classList.add("border-slate-200");
      c.querySelector(".loc-icon").classList.remove("bg-blue-100");
      c.querySelector(".loc-icon").classList.add("bg-slate-100");
      c.querySelector(".loc-pin").classList.remove("text-blue-600");
      c.querySelector(".loc-pin").classList.add("text-slate-400");
      c.querySelector(".loc-label").classList.remove("text-blue-700");
      c.querySelector(".loc-label").classList.add("text-slate-700");
    });
  }
  const locInput = document.getElementById("caseLocation");
  if (locInput) locInput.value = "";

  // Datum & Uhrzeit: aktuelle Zeit neu setzen
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  document.getElementById("caseDate").value = local.toISOString().slice(0, 10);
  document.getElementById("caseTime").value = local.toISOString().slice(11, 16);

  // Falltyp: erste verfügbare Option auswählen, Karten-Highlight zurücksetzen
  const allTypeCards = document.querySelectorAll(".case-type-card");
  allTypeCards.forEach((card) => {
    card.classList.remove("border-blue-500", "bg-blue-50");
    card.classList.add("border-slate-200");
  });
  const firstRadio = document.querySelector('input[name="caseType"]');
  if (firstRadio) {
    firstRadio.checked = true;
    firstRadio.closest(".case-type-card").classList.add("border-blue-500", "bg-blue-50");
    firstRadio.closest(".case-type-card").classList.remove("border-slate-200");
  }

  // Tatbestand leeren
  document.getElementById("caseViolation").value = "";
  renderViolationPicker();

  // Fahrzeugtyp zurücksetzen (Default PKW)
  document.getElementById("caseVehicleType").value = "";
  renderVehicleTypePicker();

  // Notizen leeren
  document.getElementById("caseNotes").value = "";

  // Fotos zurücksetzen
  selectedFiles = [];
  renderPreview();

  // Submit-Button zurücksetzen
  const btn = document.getElementById("btnSubmitCase");
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    Fall melden`;

  // Toast anzeigen
  const toast = document.getElementById("successToast");
  const toastLink = document.getElementById("successToastLink");
  toastLink.href = `#/cases/${createdId}`;
  toast.classList.remove("hidden");
  toast.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Toast nach 4 Sekunden ausblenden (clearTimeout bei Schnellerfassung)
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
    toastTimeout = null;
  }, 4000);
}

async function loadViolationsForLocation(locationId) {
  const content = document.getElementById("violationContent");
  if (!content) return;
  content.innerHTML = `<p class="text-xs text-slate-400">Wird geladen...</p>`;
  try {
    currentViolations = await api.violations.list({ location_id: locationId });
    renderViolationPicker();
  } catch {
    content.innerHTML = `<p class="text-xs text-red-500">Fehler beim Laden der Tatbestände.</p>`;
  }
  // Also load vehicle types for this location
  await loadVehicleTypesForLocation(locationId);
}

function renderViolationPicker() {
  const content = document.getElementById("violationContent");
  if (!content) return;
  const selected = document.getElementById("caseViolation").value;
  const selectedV = currentViolations.find(v => String(v.id) === selected);

  const topFive = currentViolations.slice(0, 5);

  content.innerHTML = `
    ${selectedV ? `
      <div class="flex items-center gap-2 mb-3 p-3 bg-green-50 border-2 border-green-400 rounded-xl">
        <div class="flex-1 min-w-0">
          <span class="text-xs font-bold text-green-700">${selectedV.code}</span>
          <p class="text-sm text-green-800 font-medium truncate">${selectedV.description}</p>
        </div>
        <button type="button" id="btnClearViolation" class="text-green-600 hover:text-green-800 p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    ` : `
      <div class="flex flex-wrap gap-2 mb-3">
        ${topFive.map(v => `
          <button type="button" data-vid="${v.id}"
            class="violation-chip text-xs px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-full font-medium transition-colors border border-slate-200 hover:border-blue-300">
            <span class="font-bold">${v.code}</span> · ${v.description.length > 25 ? v.description.slice(0,25)+'…' : v.description}
          </button>
        `).join("")}
      </div>
      <div class="relative">
        <input id="violationSearch" type="text" placeholder="Kennziffer oder Beschreibung suchen..."
          class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"/>
        <div id="violationSearchResults" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden"></div>
      </div>
    `}
  `;

  content.querySelectorAll(".violation-chip").forEach(btn => {
    btn.addEventListener("click", () => selectViolation(Number(btn.dataset.vid)));
  });

  const clearBtn = document.getElementById("btnClearViolation");
  if (clearBtn) clearBtn.addEventListener("click", () => {
    document.getElementById("caseViolation").value = "";
    renderViolationPicker();
  });

  const searchInput = document.getElementById("violationSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      const resultsEl = document.getElementById("violationSearchResults");
      if (!q) { resultsEl.classList.add("hidden"); return; }
      const matches = currentViolations.filter(v =>
        v.code.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
      ).slice(0, 5);
      if (!matches.length) { resultsEl.classList.add("hidden"); return; }
      resultsEl.innerHTML = matches.map(v => `
        <button type="button" data-vid="${v.id}"
          class="violation-result w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0">
          <span class="text-xs font-bold text-blue-600">${v.code}</span>
          <span class="text-sm text-slate-700 ml-2">${v.description}</span>
        </button>
      `).join("");
      resultsEl.classList.remove("hidden");
      resultsEl.querySelectorAll(".violation-result").forEach(btn => {
        btn.addEventListener("click", () => {
          selectViolation(Number(btn.dataset.vid));
          searchInput.value = "";
          resultsEl.classList.add("hidden");
        });
      });
    });
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !document.getElementById("violationSearchResults")?.contains(e.target)) {
        document.getElementById("violationSearchResults")?.classList.add("hidden");
      }
    }, { once: false });
  }
}

function selectViolation(id) {
  document.getElementById("caseViolation").value = id;
  renderViolationPicker();
}

async function loadVehicleTypesForLocation(locationId) {
  const content = document.getElementById("vehicleTypeContent");
  if (!content) return;
  content.innerHTML = `<p class="text-xs text-slate-400">Wird geladen...</p>`;
  try {
    currentVehicleTypes = await api.vehicleTypes.list(locationId);
    renderVehicleTypePicker();
  } catch {
    content.innerHTML = `<p class="text-xs text-red-500">Fehler beim Laden der Fahrzeugtypen.</p>`;
  }
}

function renderVehicleTypePicker() {
  const content = document.getElementById("vehicleTypeContent");
  if (!content) return;
  if (!currentVehicleTypes.length) {
    content.innerHTML = `<p class="text-xs text-slate-400">Keine Fahrzeugtypen verfügbar.</p>`;
    return;
  }

  // Default to PKW (number === "1") or first in list
  const selectedId = document.getElementById("caseVehicleType").value;
  if (!selectedId) {
    const defaultType = currentVehicleTypes.find(vt => vt.number === "1") || currentVehicleTypes[0];
    if (defaultType) {
      document.getElementById("caseVehicleType").value = defaultType.id;
    }
  }

  const currentSelectedId = document.getElementById("caseVehicleType").value;

  content.innerHTML = `
    <select id="vehicleTypeSelect"
      class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition bg-white text-sm">
      ${currentVehicleTypes.map(vt => `
        <option value="${vt.id}" ${String(vt.id) === String(currentSelectedId) ? "selected" : ""}>
          [${vt.number}] ${vt.name}
        </option>
      `).join("")}
    </select>
  `;

  document.getElementById("vehicleTypeSelect").addEventListener("change", (e) => {
    document.getElementById("caseVehicleType").value = e.target.value;
  });
}

function showShiftToast(msg) {
  const toast = document.getElementById("successToast");
  if (toast) {
    const span = toast.querySelector("span");
    if (span) span.textContent = msg;
    toast.classList.remove("hidden");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.add("hidden"); toastTimeout = null; }, 3000);
  }
}

function resetFormShift() {
  document.getElementById("plateOrt").value = "";
  document.getElementById("plateBuchst").value = "";
  document.getElementById("plateNr").value = "";
  document.getElementById("caseViolation").value = "";
  renderViolationPicker();
  document.getElementById("caseVehicleType").value = "";
  renderVehicleTypePicker();
  selectedFiles = [];
  renderPreview();
  const btn = document.getElementById("btnSubmitCase");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Fall melden`;
  }
}

async function submitCase(e, preLocationId = null, shiftId = null) {
  e.preventDefault();
  const errorEl = document.getElementById("caseFormError");
  const btn = document.getElementById("btnSubmitCase");
  errorEl.classList.add("hidden");

  const locationId = document.getElementById("caseLocation").value;
  const ort    = document.getElementById("plateOrt").value.trim();
  const buchst = document.getElementById("plateBuchst").value.trim();
  const nr     = document.getElementById("plateNr").value.trim();
  const plate  = [ort, buchst, nr].filter(Boolean).join(" ");
  const dateVal = document.getElementById("caseDate").value;
  const timeVal = document.getElementById("caseTime").value;
  const caseType = document.querySelector('input[name="caseType"]:checked')?.value || "standard";
  const notes = document.getElementById("caseNotes").value.trim();

  if (!locationId || !ort || !buchst || !nr || !dateVal || !timeVal) {
    errorEl.textContent = "Bitte alle Pflichtfelder ausfüllen (Kennzeichen vollständig, Standort, Datum & Uhrzeit).";
    errorEl.classList.remove("hidden");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const vehicleTypeId = document.getElementById("caseVehicleType")?.value;
  if (!vehicleTypeId) {
    errorEl.textContent = "Bitte einen Fahrzeugtyp auswählen.";
    errorEl.classList.remove("hidden");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const violationId = document.getElementById("caseViolation")?.value;
  if (!violationId) {
    errorEl.textContent = "Bitte einen Tatbestand auswählen.";
    errorEl.classList.remove("hidden");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Wird gemeldet…`;

  try {
    const formData = new FormData();
    formData.append("location_id", locationId);
    formData.append("license_plate", plate);
    formData.append("reported_at", new Date(`${dateVal}T${timeVal}`).toISOString());
    formData.append("case_type", caseType);
    if (notes) formData.append("notes", notes);
    formData.append("vehicle_type_id", vehicleTypeId);
    formData.append("violation_id", violationId);
    if (shiftId) formData.append("shift_id", parseInt(shiftId));
    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    const created = await api.createCase(formData);

    if (shiftId) {
      // Shift mode: increment case count in localStorage and stay in shift flow
      try {
        const SHIFT_KEY = "kr_active_shift";
        const activeShift = JSON.parse(localStorage.getItem(SHIFT_KEY) || "null");
        if (activeShift && activeShift.id === parseInt(shiftId)) {
          activeShift.case_count = (activeShift.case_count || 0) + 1;
          localStorage.setItem(SHIFT_KEY, JSON.stringify(activeShift));
        }
      } catch {}

      // Show toast
      showShiftToast("Fall gespeichert!");

      // Reset form and stay on same page
      resetFormShift();
      return;
    }

    openTicket(created);
    resetForm(created.id);
  } catch (err) {
    errorEl.textContent = "Fehler: " + err.message;
    errorEl.classList.remove("hidden");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Fall melden`;
  }
}
