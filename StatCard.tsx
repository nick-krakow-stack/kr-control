"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  MapPin,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  RotateCcw,
  Download,
  ZoomIn,
} from "lucide-react";
import {
  Meldung,
  MeldungStatus,
  MELDUNG_STATUS_COLORS,
  MELDUNG_STATUS_LABELS,
} from "@/types";
import {
  formatDate,
  formatDateTime,
  formatTime,
  getParkdauerDisplay,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const STATUS_OPTIONS: {
  value: MeldungStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    value: "offen",
    label: "Offen",
    icon: AlertCircle,
    color: "text-yellow-600",
  },
  {
    value: "in_bearbeitung",
    label: "In Bearbeitung",
    icon: RotateCcw,
    color: "text-blue-600",
  },
  {
    value: "abgeschlossen",
    label: "Abgeschlossen",
    icon: CheckCircle,
    color: "text-green-600",
  },
  {
    value: "abgewiesen",
    label: "Abgewiesen",
    icon: XCircle,
    color: "text-red-600",
  },
];

export default function MeldungDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [adminNotiz, setAdminNotiz] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MeldungStatus>("offen");

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("rolle")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.rolle === "admin");
      }

      const response = await fetch(`/api/meldungen/${params.id}`);
      const data = await response.json();

      if (data.data) {
        setMeldung(data.data);
        setSelectedStatus(data.data.status);
        setAdminNotiz(data.data.admin_notiz || "");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!meldung || !isAdmin) return;
    setStatusUpdating(true);

    try {
      const response = await fetch(`/api/meldungen/${meldung.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          admin_notiz: adminNotiz,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMeldung((prev) =>
          prev ? { ...prev, status: selectedStatus, admin_notiz: adminNotiz } : null
        );
        toast({
          title: "Status aktualisiert ✅",
          description: `Status wurde auf "${MELDUNG_STATUS_LABELS[selectedStatus]}" gesetzt.`,
          // @ts-ignore
          variant: "success",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a5f] mx-auto" />
          <p className="text-slate-500 text-sm mt-3">Lade Meldung...</p>
        </div>
      </div>
    );
  }

  if (!meldung) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Meldung nicht gefunden</p>
        <Link
          href="/dashboard/meldungen"
          className="mt-3 inline-block text-[#1e3a5f] hover:text-orange-500 text-sm"
        >
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/meldungen"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800 font-mono">
              {meldung.kennzeichen}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                MELDUNG_STATUS_COLORS[meldung.status]
              }`}
            >
              {MELDUNG_STATUS_LABELS[meldung.status]}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Meldungs-ID: {meldung.id.substring(0, 8)}...
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Fahrzeug & Ort */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">
              Meldungsdetails
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Car className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Kennzeichen</p>
                    <p className="font-mono font-bold text-slate-800 text-lg">
                      {meldung.kennzeichen}
                    </p>
                    {meldung.fahrzeugmarke && (
                      <p className="text-sm text-slate-500">{meldung.fahrzeugmarke}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Parkplatz</p>
                    <p className="font-semibold text-slate-800">
                      {meldung.parkplatz?.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {meldung.parkplatz?.adresse}
                      {meldung.parkplatz?.ort ? `, ${meldung.parkplatz.ort}` : ""}
                    </p>
                    {meldung.parkplatz?.gps_lat && meldung.parkplatz?.gps_lng && (
                      <a
                        href={`https://maps.google.com/?q=${meldung.parkplatz.gps_lat},${meldung.parkplatz.gps_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        In Google Maps öffnen →
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Vorfallzeit</p>
                    <p className="font-semibold text-slate-800">
                      {formatDate(meldung.vorfall_datum)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatTime(meldung.vorfall_uhrzeit)} Uhr
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Parkdauer</p>
                    <p className="font-semibold text-slate-800">
                      {getParkdauerDisplay(
                        meldung.parkdauer,
                        meldung.parkdauer_freitext || undefined
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Gemeldet von</p>
                    <p className="font-semibold text-slate-800">
                      {meldung.melder?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(meldung.melde_timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {meldung.kommentar && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Kommentar</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                      {meldung.kommentar}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          {meldung.bilder && meldung.bilder.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">
                Fotos ({meldung.bilder.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {meldung.bilder.map((bild, index) => (
                  <div
                    key={bild.id}
                    className="relative group aspect-square cursor-pointer rounded-xl overflow-hidden border border-slate-200 hover:border-orange-300 transition-colors"
                    onClick={() => setLightboxImage(bild.url)}
                  >
                    <img
                      src={bild.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Sidebar */}
        <div className="space-y-4">
          {/* Status Management (Admin only) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">
                Status verwalten
              </h2>

              <div className="space-y-2 mb-4">
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedStatus === option.value
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={selectedStatus === option.value}
                        onChange={() =>
                          setSelectedStatus(option.value as MeldungStatus)
                        }
                        className="w-4 h-4 text-[#1e3a5f]"
                      />
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Admin Note */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Admin-Notiz
                </label>
                <textarea
                  value={adminNotiz}
                  onChange={(e) => setAdminNotiz(e.target.value)}
                  rows={3}
                  placeholder="Interne Notiz zur Meldung..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                />
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={statusUpdating}
                className="w-full bg-[#1e3a5f] hover:bg-[#152a4a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {statusUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Status speichern"
                )}
              </button>
            </div>
          )}

          {/* Meldungs-Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-3">Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Erstellt</span>
                <span className="text-slate-700 text-right">
                  {formatDateTime(meldung.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aktualisiert</span>
                <span className="text-slate-700 text-right">
                  {formatDateTime(meldung.updated_at)}
                </span>
              </div>
              {meldung.bilder && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Fotos</span>
                  <span className="text-slate-700">{meldung.bilder.length}</span>
                </div>
              )}
            </div>
          </div>

          {meldung.admin_notiz && !isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Admin-Notiz</p>
              <p className="text-sm text-blue-800">{meldung.admin_notiz}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxImage(null)}
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Vollbild"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
