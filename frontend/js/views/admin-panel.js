import { api } from "../api.js";

export async function renderAdminPanel() {
  return `
    <div class="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-slate-800 mb-2">Admin Panel</h1>
      <p class="text-slate-500 text-sm mb-8">Verwaltung &amp; Einstellungen</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">

        <a href="#/admin/users" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Benutzer</span>
        </a>

        <a href="#/admin/customers" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Kunden</span>
        </a>

        <a href="#/locations" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Parkplätze</span>
        </a>

        <a href="#/admin/shifts" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Schichten</span>
        </a>

        <a href="#/whitelist" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Whitelist</span>
        </a>

        <a href="#/admin/violations" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Tatbestände</span>
        </a>

        <a href="#/admin/vehicle-types" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 20h10M7 20a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2M7 20H5a2 2 0 01-2-2v-1M17 20h2a2 2 0 002-2v-1"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Fahrzeugtypen</span>
        </a>

        <a href="#/admin/groups" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Gruppen</span>
        </a>

        <a href="#/admin/work-times" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Arbeitszeiten</span>
        </a>

        <a href="#/settings" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all active:scale-95">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-700 text-center">Einstellungen</span>
        </a>

      </div>
    </div>
  `;
}

export function initAdminPanel() {}
