"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MeldungenTable from "@/components/dashboard/MeldungenTable";
import { Meldung, MeldungStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";

const STATUS_FILTERS: { value: MeldungStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "abgewiesen", label: "Abgewiesen" },
];

export default function MeldungenPage() {
  const supabase = createClient();

  const [meldungen, setMeldungen] = useState<Meldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<MeldungStatus | "alle">("alle");
  const [kennzeichenSearch, setKennzeichenSearch] = useState("");
  const [datumVon, setDatumVon] = useState("");
  const [datumBis, setDatumBis] = useState("");

  const loadMeldungen = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
      });

      if (statusFilter !== "alle") params.append("status", statusFilter);
      if (kennzeichenSearch) params.append("kennzeichen", kennzeichenSearch);
      if (datumVon) params.append("datum_von", datumVon);
      if (datumBis) params.append("datum_bis", datumBis);

      const response = await fetch(`/api/meldungen?${params.toString()}`);
      const data = await response.json();

      setMeldungen(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error loading meldungen:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, kennzeichenSearch, datumVon, datumBis]);

  useEffect(() => {
    loadMeldungen();
  }, [loadMeldungen]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, kennzeichenSearch, datumVon, datumBis]);

  const hasFilters =
    statusFilter !== "alle" || kennzeichenSearch || datumVon || datumBis;

  const resetFilters = () => {
    setStatusFilter("alle");
    setKennzeichenSearch("");
    setDatumVon("");
    setDatumBis("");
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meldungen</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total} Meldung{total !== 1 ? "en" : ""} gesamt
          </p>
        </div>
        <Link
          href="/dashboard/meldungen/neu"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Neue Meldung
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filter</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
              Zurücksetzen
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as MeldungStatus | "alle")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? "bg-[#1e3a5f] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Kennzeichen suchen..."
              value={kennzeichenSearch}
              onChange={(e) => setKennzeichenSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent font-mono"
            />
          </div>

          <div>
            <input
              type="date"
              placeholder="Von"
              value={datumVon}
              onChange={(e) => setDatumVon(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          <div>
            <input
              type="date"
              placeholder="Bis"
              value={datumBis}
              onChange={(e) => setDatumBis(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
            </div>
          ) : (
            <MeldungenTable meldungen={meldungen} />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Seite {page} von {totalPages} ({total} Einträge)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
