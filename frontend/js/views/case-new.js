import { api } from "../api.js";

let selectedFiles = [];

export async function renderCaseNew() {
  const locations = await api.getLocations();

  const locationOptions = locations.map((l) =>
    `<option value="${l.id}">${l.name}</option>`
  ).join("");

  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return `
    <div class="p-6 lg:p-8 max-w-2xl mx-auto">
      <div class="flex items-center gap-3 mb-8">
        <a href="#/cases" class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Neuer Fall</h1>
          <p class="text-slate-500 text-sm mt-0.5">Falschparker melden</p>
        </div>
      </div>

      <form id="caseForm" class="space-y-6">
        <!-- Basis-Daten -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h2 class="font-semibold text-slate-700 text-sm uppercase tracking-wide">Falldetails</h2>

          <div>
            <label class="label">Parkplatz *</label>
            <select id="caseLocation" required class="input">
              <option value="">Parkplatz auswählen...</option>
              ${locationOptions}
            </select>
            ${!locations.length ? `
              <p class="text-xs text-orange-500 mt-1">
                Noch kein Parkplatz angelegt.
                <a href="#/locations" class="underline">Jetzt anlegen →</a>
              </p>
            ` : ""}
          </div>

          <div>
            <label class="label">Kennzeichen *</label>
            <input id="casePlate" type="text" required class="input font-mono uppercase"
              placeholder="z.B. B-KR 1234" autocomplete="off"/>
          </div>

          <div>
            <label class="label">Datum & Uhrzeit *</label>
            <input id="caseDateTime" type="datetime-local" required class="input" value="${localISO}"/>
            <p class="text-xs text-slate-400 mt-1">Wird automatisch auf jetzt gesetzt, kann angepasst werden.</p>
          </div>

          <div>
            <label class="label">Falltyp</label>
            <select id="caseCaseType" class="input">
              <option value="standard">Standard (KR-Kontrolle)</option>
              <option value="self_control_ticket">Self-Control + Ticket</option>
              <option value="self_control_direct">Self-Control direkt (ohne Ticket)</option>
            </select>
          </div>

          <div>
            <label class="label">Notizen (optional)</label>
            <textarea id="caseNotes" class="input resize-none" rows="3"
              placeholder="z.B. Fahrzeug stand bereits beim letzten Kontrollgang dort..."></textarea>
          </div>
        </div>

        <!-- Bildupload -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 class="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Fotos</h2>

          <!-- Drop Zone -->
          <div id="dropZone"
            class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer
                   hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
            <div class="flex flex-col items-center gap-2">
              <div class="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                <svg class="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-700">Fotos hier ablegen oder <span class="text-blue-600">klicken</span></p>
                <p class="text-xs text-slate-400 mt-0.5">JPEG, PNG, HEIC · Max. 20 MB pro Bild</p>
              </div>
            </div>
            <input id="imageInput" type="file" accept="image/*" multiple class="hidden"/>
          </div>

          <!-- Self-Control Hinweis -->
          <div id="selfControlHint" class="hidden mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p class="text-sm font-medium text-amber-800 mb-1">Self-Control: Pflichtfotos</p>
            <ul class="text-xs text-amber-700 space-y-1">
              <li>📷 Fahrzeug <strong>von vorne</strong> (Kennzeichen sichtbar)</li>
              <li>📷 Fahrzeug <strong>von hinten</strong> (Kennzeichen sichtbar)</li>
              <li>📷 Schild <strong>intakt und lesbar</strong> (aus rechtlichen Gründen)</li>
            </ul>
          </div>

          <!-- Preview -->
          <div id="imagePreview" class="grid grid-cols-3 gap-3 mt-4 empty:hidden"></div>
        </div>

        <!-- Error & Submit -->
        <div id="caseFormError" class="hidden bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"></div>

        <div class="flex gap-3">
          <a href="#/cases"
            class="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-center">
            Abbrechen
          </a>
          <button type="submit" id="btnSubmitCase"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
            Fall melden
          </button>
        </div>
      </form>
    </div>
  `;
}

export function initCaseNew() {
  selectedFiles = [];

  const dropZone = document.getElementById("dropZone");
  const imageInput = document.getElementById("imageInput");
  const caseTypeSelect = document.getElementById("caseCaseType");

  // Uppercase plate input
  document.getElementById("casePlate").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Show self-control hint
  caseTypeSelect.addEventListener("change", () => {
    const isSC = caseTypeSelect.value.startsWith("self_control");
    document.getElementById("selfControlHint").classList.toggle("hidden", !isSC);
  });

  // Drop zone click
  dropZone.addEventListener("click", () => imageInput.click());

  // Drag & drop
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

  // Form submit
  document.getElementById("caseForm").addEventListener("submit", submitCase);
}

function addFiles(files) {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  selectedFiles.push(...imageFiles);
  renderPreview();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreview();
}

function renderPreview() {
  const preview = document.getElementById("imagePreview");
  if (!selectedFiles.length) {
    preview.innerHTML = "";
    return;
  }

  preview.innerHTML = selectedFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="relative group aspect-square">
        <img src="${url}" class="w-full h-full object-cover rounded-xl border border-slate-200" alt="Foto ${i+1}"/>
        <button type="button" onclick="window._removeFile(${i})"
          class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full
                 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
          ×
        </button>
        <div class="absolute bottom-1.5 left-1.5 right-1.5 text-center">
          <span class="text-xs bg-black/50 text-white px-2 py-0.5 rounded-full truncate block">
            ${file.name.length > 15 ? file.name.slice(0, 12) + "..." : file.name}
          </span>
        </div>
      </div>
    `;
  }).join("");

  window._removeFile = (i) => {
    removeFile(i);
  };
}

async function submitCase(e) {
  e.preventDefault();
  const errorEl = document.getElementById("caseFormError");
  const btn = document.getElementById("btnSubmitCase");
  errorEl.classList.add("hidden");

  const locationId = document.getElementById("caseLocation").value;
  const plate = document.getElementById("casePlate").value.trim();
  const dateTime = document.getElementById("caseDateTime").value;

  if (!locationId || !plate || !dateTime) {
    errorEl.textContent = "Bitte alle Pflichtfelder ausfüllen.";
    errorEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Wird gemeldet...";

  try {
    const formData = new FormData();
    formData.append("location_id", locationId);
    formData.append("license_plate", plate);
    formData.append("reported_at", new Date(dateTime).toISOString());
    formData.append("case_type", document.getElementById("caseCaseType").value);
    const notes = document.getElementById("caseNotes").value.trim();
    if (notes) formData.append("notes", notes);

    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    const created = await api.createCase(formData);
    window.location.hash = `#/cases/${created.id}`;
  } catch (err) {
    errorEl.textContent = "Fehler: " + err.message;
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Fall melden";
  }
}
