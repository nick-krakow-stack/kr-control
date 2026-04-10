import { api } from "../api.js";

export async function renderWorkTimes() {
  return `
    <div class="p-4 lg:p-8 max-w-2xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-800">Arbeitszeiten</h1>
        <p class="text-slate-500 text-sm mt-1">Arbeitszeit nachtragen und Anfragen verwalten</p>
      </div>

      <!-- Submit form -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-semibold text-slate-800">Neue Arbeitszeitanfrage</h2>
        </div>
        <form id="workTimeForm" class="p-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Datum *</label>
            <input id="wtDate" type="date" required
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Von *</label>
              <input id="wtFrom" type="time" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Bis *</label>
              <input id="wtTo" type="time" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Notiz (optional)</label>
            <textarea id="wtNote" rows="2"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              placeholder="z.B. Kontrolle ohne aktive Schicht"></textarea>
          </div>
          <div id="wtFormMsg" class="hidden"></div>
          <button type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm">
            Einreichen
          </button>
        </form>
      </div>

      <!-- List -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-semibold text-slate-800">Meine Anfragen</h2>
        </div>
        <div id="workTimeList" class="divide-y divide-slate-50">
          <div class="p-5 text-slate-400 text-sm">Lade Daten...</div>
        </div>
      </div>
    </div>
  `;
}

export async function initWorkTimes() {
  await loadWorkTimes();

  document.getElementById("workTimeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("wtFormMsg");
    const btn = e.target.querySelector("button[type=submit]");
    msgEl.classList.add("hidden");

    const date = document.getElementById("wtDate").value;
    const from = document.getElementById("wtFrom").value;
    const to = document.getElementById("wtTo").value;
    const note = document.getElementById("wtNote").value.trim();

    if (!date || !from || !to) return;

    btn.disabled = true;
    btn.textContent = "Wird eingereicht...";

    try {
      await api.workTimes.create({
        started_at: date + "T" + from,
        ended_at: date + "T" + to,
        note: note || undefined,
      });
      msgEl.innerHTML = `<div class="bg-green-50 border border-green-200 rounded-xl p-3 text-green-800 text-sm">Anfrage erfolgreich eingereicht.</div>`;
      msgEl.classList.remove("hidden");
      document.getElementById("workTimeForm").reset();
      await loadWorkTimes();
    } catch (err) {
      msgEl.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">Fehler: ${err.message}</div>`;
      msgEl.classList.remove("hidden");
    }

    btn.disabled = false;
    btn.textContent = "Einreichen";
  });
}

async function loadWorkTimes() {
  const listEl = document.getElementById("workTimeList");
  if (!listEl) return;

  try {
    const items = await api.workTimes.list();
    if (!items || !items.length) {
      listEl.innerHTML = `<div class="p-5 text-slate-400 text-sm text-center">Noch keine Anfragen</div>`;
      return;
    }

    const statusBadge = (status) => {
      if (status === "approved") return `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">Genehmigt</span>`;
      if (status === "rejected") return `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">Abgelehnt</span>`;
      return `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">Ausstehend</span>`;
    };

    const formatDuration = (started, ended) => {
      const diff = new Date(ended) - new Date(started);
      if (diff <= 0) return "–";
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    listEl.innerHTML = items.map((item) => `
      <div class="p-4">
        <div class="flex items-start justify-between gap-2 mb-1">
          <div>
            <div class="text-sm font-semibold text-slate-800">
              ${formatDate(item.started_at)} · ${formatTime(item.started_at)} – ${formatTime(item.ended_at)}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">Dauer: ${formatDuration(item.started_at, item.ended_at)}</div>
            ${item.note ? `<div class="text-xs text-slate-500 mt-0.5">${item.note}</div>` : ""}
            ${item.review_note ? `<div class="text-xs text-red-600 mt-1">Hinweis: ${item.review_note}</div>` : ""}
          </div>
          ${statusBadge(item.status)}
        </div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="p-5 text-red-500 text-sm">Fehler: ${err.message}</div>`;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
