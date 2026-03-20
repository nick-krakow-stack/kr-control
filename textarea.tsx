import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FileText,
  MapPin,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import MeldungenTable from "@/components/dashboard/MeldungenTable";
import { Meldung, Profile } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.rolle === "admin";

  // Load stats (admin sees all, others see own)
  let statsQuery = supabase.from("meldungen").select("status", { count: "exact" });
  if (!isAdmin) statsQuery = statsQuery.eq("melder_id", user!.id);
  const { count: gesamt } = await statsQuery;

  let offenQuery = supabase.from("meldungen").select("id", { count: "exact" }).eq("status", "offen");
  if (!isAdmin) offenQuery = offenQuery.eq("melder_id", user!.id);
  const { count: offen } = await offenQuery;

  let inBearbeitungQuery = supabase.from("meldungen").select("id", { count: "exact" }).eq("status", "in_bearbeitung");
  if (!isAdmin) inBearbeitungQuery = inBearbeitungQuery.eq("melder_id", user!.id);
  const { count: inBearbeitung } = await inBearbeitungQuery;

  let abgeschlossenQuery = supabase.from("meldungen").select("id", { count: "exact" }).eq("status", "abgeschlossen");
  if (!isAdmin) abgeschlossenQuery = abgeschlossenQuery.eq("melder_id", user!.id);
  const { count: abgeschlossen } = await abgeschlossenQuery;

  // Active parkplaetze (admin only)
  let aktiveParkplaetze = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("parkplaetze")
      .select("id", { count: "exact" })
      .eq("status", "aktiv");
    aktiveParkplaetze = count || 0;
  }

  // Recent meldungen
  let recentQuery = supabase
    .from("meldungen")
    .select(
      "*, parkplatz:parkplaetze(id, name, adresse), melder:profiles(id, name), bilder(id, url)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (!isAdmin) recentQuery = recentQuery.eq("melder_id", user!.id);
  const { data: recentMeldungen } = await recentQuery;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Übersicht</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Willkommen zurück, {profile?.name?.split(" ")[0]}! 👋
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gesamt"
          value={gesamt || 0}
          icon={FileText}
          color="blue"
          description="Alle Meldungen"
        />
        <StatCard
          title="Offen"
          value={offen || 0}
          icon={AlertCircle}
          color="yellow"
          description="Warten auf Bearbeitung"
        />
        <StatCard
          title="In Bearbeitung"
          value={inBearbeitung || 0}
          icon={Loader}
          color="orange"
          description="Wird bearbeitet"
        />
        <StatCard
          title="Abgeschlossen"
          value={abgeschlossen || 0}
          icon={CheckCircle}
          color="green"
          description="Erfolgreich abgeschlossen"
        />
      </div>

      {/* Admin extra stats */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Aktive Parkplätze"
            value={aktiveParkplaetze}
            icon={MapPin}
            color="blue"
            description="Aktuell betreute Standorte"
          />
          <div className="rounded-xl border bg-gradient-to-br from-[#1e3a5f] to-[#152a4a] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">Schnellzugriff</p>
                <p className="text-white font-bold text-lg mt-1">Parkplatz anlegen</p>
                <p className="text-slate-400 text-xs mt-0.5">Neuen Standort hinzufügen</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </div>
            <Link
              href="/dashboard/parkplaetze"
              className="mt-3 inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
            >
              Zur Parkplatzverwaltung
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Recent Meldungen */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Letzte Meldungen</h2>
          <Link
            href="/dashboard/meldungen"
            className="text-sm text-[#1e3a5f] hover:text-orange-500 font-medium transition-colors flex items-center gap-1"
          >
            Alle anzeigen
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-2">
          <MeldungenTable meldungen={(recentMeldungen as Meldung[]) || []} />
        </div>
      </div>
    </div>
  );
}
