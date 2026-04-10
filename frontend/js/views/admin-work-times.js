import { api } from "../api.js";

let currentFilter = "pending";

export async function renderAdminWorkTimes() {
  return `
    <div class="p-4 lg:p-8 max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-800">Arbeitszeitverwaltung</h1>
        <p class="text-slate-500 text-sm mt-1">Anfragen der Mitarbeiter prüfen</p>
      </div>

      <!-- Filter -->
      <div class="flex gap-2 mb-6 flex-wrap">
        <button data-filter="pending" class="wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors bg-amber-50 border-amber-200 text-amber-800">Ausstehend</button>
        <button data-filter="approved" class="wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors border-slate-200 text-slate-600 hover:bg-slate-50">Genehmigt</button>
        <button data-filter="rejected" class="wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors border-slate-200 text-slate-600 hover:bg-slate-50">Abgelehnt</button>
        <button data-filter="all" class="wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors border-slate-200 text-slate-600 hover:bg-slate-50">Alle</button>
      </div>

      <div id="adminWorkTimeList" class="space-y-3">
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-slate-400 text-sm">Lade Daten...</div>
      </div>
    </div>

    <!-- Approve modal -->
    <div id="approveModal" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/30" id="approveModalOverlay"></div>
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 class="font-semibold text-slate-800 mb-4">Arbeitszeit genehmigen</h3>
        <input type="hidden" id="approveId"/>
        <div class="space-y-3 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Beginn (anpassen)</label>
            <input id="approveStart" type="datetime-local" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Ende (anpassen)</label>
            <input id="approveEnd" type="datetime-local" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Notiz (optional)</label>
            <input id="approveNote" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optionale Anmerkung"/>
          </div>
        </div>
        <div class="flex gap-3">
          <button id="btnApproveConfirm" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors">Bestätigen</button>
          <button id="btnApproveCancel" class="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>

    <!-- Reject modal -->
    <div id="rejectModal" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/30" id="rejectModalOverlay"></div>
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 class="font-semibold text-slate-800 mb-4">Anfrage ablehnen</h3>
        <input type="hidden" id="rejectId"/>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1">Begründung *</label>
          <input id="rejectNote" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Grund für Ablehnung"/>
        </div>
        <div class="flex gap-3">
          <button id="btnRejectConfirm" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors">Ablehnen</button>
          <button id="btnRejectCancel" class="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `;
}

export async function initAdminWorkTimes() {
  currentFilter = "pending";
  await loadAdminWorkTimes();

  // Filter buttons
  document.querySelectorAll(".wt-filter-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll(".wt-filter-btn").forEach((b) => {
        b.className = "wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors border-slate-200 text-slate-600 hover:bg-slate-50";
      });
      btn.className = "wt-filter-btn text-sm px-4 py-2 rounded-xl border font-medium transition-colors bg-amber-50 border-amber-200 text-amber-800";
      await loadAdminWorkTimes();
    });
  });

  // Approve modal
  document.getElementById("approveModalOverlay").addEventListener("click", closeApproveModal);
  document.getElementById("btnApproveCancel").addEventListener("click", closeApproveModal);
  document.getElementById("btnApproveConfirm").addEventListener("click", async () => {
    const id = document.getElementById("approveId").value;
    const started_at = document.getElementById("approveStart").value || undefined;
    const ended_at = document.getElementById("approveEnd").value || undefined;
    const review_note = document.getElementById("approveNote").value.trim() || undefined;
    try {
      await api.workTimes.review(id, { status: "approved", started_at, ended_at, review_note });
      closeApproveModal();
      await loadAdminWorkTimes();
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  });

  // Reject modal
  document.getElementById("rejectModalOverlay").addEventListener("click", closeRejectModal);
  document.getElementById("btnRejectCancel").addEventListener("click", closeRejectModal);
  document.getElementById("btnRejectConfirm").addEventListener("click", async () => {
    const id = document.getElementById("rejectId").value;
    const review_note = document.getElementById("rejectNote").value.trim();
    if (!review_note) { alert("Bitte eine Begründung eingeben."); return; }
    try {
      await api.workTimes.review(id, { status: "rejected", review_note });
      closeRejectModal();
      await loadAdminWorkTimes();
    } catch (err) {
      alert("Fehler: " + err.message);
    }
  });
}

async function loadAdminWorkTimes() {
  const listEl = document.getElementById("adminWorkTimeList");
  if (!listEl) return;

  listEl.innerHTML = `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-slate-400 text-sm">Lade Daten...</div>`;

  try {
    let items = await api.workTimes.list();
    if (!Array.isArray(items)) items = [];
    if (currentFilter !== "all") {
      items = items.filter((i) => i.status === currentFilter);
    }

    if (!items.length) {
      listEl.innerHTML = `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-slate-400 text-sm text-center">Keine Anfragen</div>`;
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
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="font-semibold text-slate-800 text-sm">
              ${item.user_name || item.username || "Mitarbeiter"}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              ${formatDate(item.started_at)} · ${formatTime(item.started_at)} – ${formatTime(item.ended_at)}
              · ${formatDuration(item.started_at, item.ended_at)}
            </div>
            ${item.note ? `<div class="text-xs text-slate-500 mt-0.5">${item.note}</div>` : ""}
            ${item.review_note ? `<div class="text-xs text-slate-600 mt-1">Hinweis: ${item.review_note}</div>` : ""}
          </div>
          ${statusBadge(item.status)}
        </div>
        ${item.status === "pending" ? `
          <div class="flex gap-2 mt-3">
            <button data-approve="${item.id}" data-start="${item.started_at}" data-end="${item.ended_at}"
              class="btn-approve flex-1 bg-green-50 hover:bg-green-100 text-green-800 font-medium text-sm py-2 rounded-xl transition-colors border border-green-200">
              Bestätigen
            </button>
            <button data-reject="${item.id}"
              class="btn-reject flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-sm py-2 rounded-xl transition-colors border border-red-200">
              Ablehnen
            </button>
          </div>
        ` : ""}
      </div>
    `).join("");

    // Bind approve/reject buttons
    listEl.querySelectorAll(".btn-approve").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("approveId").value = btn.dataset.approve;
        document.getElementById("approveStart").value = toDatetimeLocal(btn.dataset.start);
        document.getElementById("approveEnd").value = toDatetimeLocal(btn.dataset.end);
        document.getElementById("approveNote").value = "";
        document.getElementById("approveModal").classList.remove("hidden");
      });
    });
    listEl.querySelectorAll(".btn-reject").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("rejectId").value = btn.dataset.reject;
        document.getElementById("rejectNote").value = "";
        document.getElementById("rejectModal").classList.remove("hidden");
      });
    });
  } catch (err) {
    listEl.innerHTML = `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-red-500 text-sm">Fehler: ${err.message}</div>`;
  }
}

function closeApproveModal() {
  document.getElementById("approveModal").classList.add("hidden");
}

function closeRejectModal() {
  document.getElementById("rejectModal").classList.add("hidden");
}

function toDatetimeLocal(iso) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
