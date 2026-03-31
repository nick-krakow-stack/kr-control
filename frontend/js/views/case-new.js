import { api } from "../api.js";

let selectedFiles = [];

export async function renderCaseNew() {
  const locations = await api.getLocations();

  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const dateStr = local.toISOString().slice(0, 10);
  const timeStr = local.toISOString().slice(11, 16);

  const useCards = locations.length > 0 && locations.length <= 6;

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

          <!-- Plate widget -->
          <div class="flex items-stretch border-[2.5px] border-slate-800 rounded-xl overflow-hidden shadow-md max-w-xs mx-auto">
            <!-- EU strip -->
            <div class="bg-blue-700 flex flex-col items-center justify-center gap-0.5 px-2.5 min-w-[34px] select-none">
              <svg viewBox="0 0 12 9" class="w-4 h-3">
                <circle cx="6" cy="1.2" r="0.7" fill="#FFD700"/>
                <circle cx="9" cy="2.5" r="0.7" fill="#FFD700"/>
                <circle cx="10" cy="5.5" r="0.7" fill="#FFD700"/>
                <circle cx="7.7" cy="7.8" r="0.7" fill="#FFD700"/>
                <circle cx="4.3" cy="7.8" r="0.7" fill="#FFD700"/>
                <circle cx="2" cy="5.5" r="0.7" fill="#FFD700"/>
                <circle cx="3" cy="2.5" r="0.7" fill="#FFD700"/>
              </svg>
              <span class="text-white text-[9px] font-bold leading-none tracking-tight">D</span>
            </div>
            <!-- Input -->
            <input id="casePlate" type="text" required
              class="flex-1 text-[1.6rem] font-extrabold tracking-[0.12em] text-center text-slate-900
                     placeholder-slate-300 px-4 py-4 uppercase bg-white focus:outline-none"
              style="font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;"
              placeholder="B·KR 1234" autocomplete="off" inputmode="text"/>
          </div>
          <p class="text-center text-xs text-slate-400 mt-2.5">Wird automatisch großgeschrieben</p>
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

        <!-- ③ Datum & Uhrzeit -->
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

        <!-- ④ Falltyp -->
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
            <label class="case-type-card flex items-center gap-3 p-3.5 border-2 border-blue-500 bg-blue-50 rounded-xl cursor-pointer transition-all">
              <input type="radio" name="caseType" value="standard" checked class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
              <div>
                <div class="text-sm font-semibold text-slate-800">Standard</div>
                <div class="text-xs text-slate-500">KR-Kontrolle</div>
              </div>
            </label>
            <label class="case-type-card flex items-center gap-3 p-3.5 border-2 border-slate-200 rounded-xl cursor-pointer transition-all hover:border-slate-300">
              <input type="radio" name="caseType" value="self_control_ticket" class="w-4 h-4 accent-blue-600 flex-shrink-0"/>
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
          </div>
        </div>

        <!-- ⑤ Fotos -->
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
              <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                Durchsuchen
              </span>
            </div>
            <input id="imageInput" type="file" accept="image/*" multiple class="hidden"/>
          </div>

          <div id="imagePreview" class="grid grid-cols-3 gap-2 mt-3 empty:hidden"></div>
        </div>

        <!-- ⑥ Notizen -->
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

  // ── Kennzeichen uppercase ──────────────────────────────────────
  document.getElementById("casePlate").addEventListener("input", (e) => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
  });

  // ── Standort-Kacheln ──────────────────────────────────────────
  const locationCards = document.getElementById("locationCards");
  if (locationCards) {
    locationCards.querySelectorAll(".loc-card").forEach((card) => {
      card.addEventListener("click", () => {
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
      });
    });
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
  const dropZone = document.getElementById("dropZone");
  const imageInput = document.getElementById("imageInput");

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

  // ── Submit ────────────────────────────────────────────────────
  document.getElementById("caseForm").addEventListener("submit", submitCase);
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

async function submitCase(e) {
  e.preventDefault();
  const errorEl = document.getElementById("caseFormError");
  const btn = document.getElementById("btnSubmitCase");
  errorEl.classList.add("hidden");

  const locationId = document.getElementById("caseLocation").value;
  const plate = document.getElementById("casePlate").value.trim();
  const dateVal = document.getElementById("caseDate").value;
  const timeVal = document.getElementById("caseTime").value;
  const caseType = document.querySelector('input[name="caseType"]:checked')?.value || "standard";
  const notes = document.getElementById("caseNotes").value.trim();

  if (!locationId || !plate || !dateVal || !timeVal) {
    errorEl.textContent = "Bitte alle Pflichtfelder ausfüllen.";
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
    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    const created = await api.createCase(formData);
    window.location.hash = `#/cases/${created.id}`;
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
