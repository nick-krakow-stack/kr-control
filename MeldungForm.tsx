"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Search,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Parkplatz, ParkplatzStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<ParkplatzStatus, string> = {
  aktiv: "Aktiv",
  inaktiv: "Inaktiv",
  pausiert: "Pausiert",
};

const STATUS_COLORS: Record<ParkplatzStatus, string> = {
  aktiv: "bg-green-100 text-green-800",
  inaktiv: "bg-slate-100 text-slate-600",
  pausiert: "bg-yellow-100 text-yellow-800",
};

interface ParkplatzFormData {
  name: string;
  adresse: string;
  plz: string;
  ort: string;
  gps_lat: string;
  gps_lng: string;
  max_parkdauer: string;
  stellplaetze: string;
  self_control: boolean;
  status: ParkplatzStatus;
  notizen: string;
}

const EMPTY_FORM: ParkplatzFormData = {
  name: "",
  adresse: "",
  plz: "",
  ort: "",
  gps_lat: "",
  gps_lng: "",
  max_parkdauer: "",
  stellplaetze: "",
  self_control: false,
  status: "aktiv",
  notizen: "",
};

export default function ParkplaetzePage() {
  const router = useRouter();
  const supabase = createClient();

  const [parkplaetze, setParkplaetze] = useState<Parkplatz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ParkplatzFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
    loadParkplaetze();
  }, []);

  const checkRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("rolle")
        .eq("id", user.id)
        .single();
      if (profile?.rolle !== "admin") {
        router.push("/dashboard");
      } else {
        setIsAdmin(true);
      }
    }
  };

  const loadParkplaetze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parkplaetze")
        .select("*, kunde:kunden(firmenname)")
        .order("name");

      if (!error) setParkplaetze(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        adresse: formData.adresse,
        plz: formData.plz || null,
        ort: formData.ort || null,
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
        max_parkdauer: formData.max_parkdauer || null,
        stellplaetze: formData.stellplaetze
          ? parseInt(formData.stellplaetze)
          : null,
        self_control: formData.self_control,
        status: formData.status,
        notizen: formData.notizen || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("parkplaetze")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast({
          title: "Parkplatz aktualisiert ✅",
          // @ts-ignore
          variant: "success",
        });
      } else {
        const { error } = await supabase.from("parkplaetze").insert(payload);
        if (error) throw error;
        toast({
          title: "Parkplatz angelegt ✅",
          // @ts-ignore
          variant: "success",
        });
      }

      setShowModal(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      loadParkplaetze();
    } catch (error: unknown) {
      toast({
        title: "Fehler",
        description:
          error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (parkplatz: Parkplatz) => {
    setEditingId(parkplatz.id);
    setFormData({
      name: parkplatz.name,
      adresse: parkplatz.adresse,
      plz: parkplatz.plz || "",
      ort: parkplatz.ort || "",
      gps_lat: parkplatz.gps_lat?.toString() || "",
      gps_lng: parkplatz.gps_lng?.toString() || "",
      max_parkdauer: parkplatz.max_parkdauer || "",
      stellplaetze: parkplatz.stellplaetze?.toString() || "",
      self_control: parkplatz.self_control,
      status: parkplatz.status,
      notizen: parkplatz.notizen || "",
    });
    setShowModal(true);
  };

  const filteredParkplaetze = parkplaetze.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ort && p.ort.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isAdmin) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parkplätze</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {parkplaetze.length} Standort{parkplaetze.length !== 1 ? "e" : ""}{" "}
            verwaltet
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setEditingId(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Parkplatz anlegen
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Parkplatz suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white shadow-sm"
        />
      </div>

      {/* Parkplätze Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
        </div>
      ) : filteredParkplaetze.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Keine Parkplätze gefunden</p>
          <p className="text-slate-400 text-sm mt-1">
            Leg einen neuen Parkplatz an
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredParkplaetze.map((parkplatz) => (
            <div
              key={parkplatz.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 leading-tight">
                      {parkplatz.name}
                    </h3>
                    {parkplatz.self_control && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                        Self-Control
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    STATUS_COLORS[parkplatz.status]
                  }`}
                >
                  {STATUS_LABELS[parkplatz.status]}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-500 mb-4">
                <p>{parkplatz.adresse}</p>
                {parkplatz.ort && (
                  <p>
                    {parkplatz.plz} {parkplatz.ort}
                  </p>
                )}
                {parkplatz.max_parkdauer && (
                  <p className="text-slate-400">
                    Max. Parkdauer: {parkplatz.max_parkdauer}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(parkplatz)}
                  className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:text-orange-500 font-medium transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Bearbeiten
                </button>
                <span className="text-slate-200">|</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {formatDate(parkplatz.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "Parkplatz bearbeiten" : "Neuer Parkplatz"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="z.B. Edeka Musterstraße"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={formData.adresse}
                  onChange={(e) =>
                    setFormData({ ...formData, adresse: e.target.value })
                  }
                  placeholder="Musterstraße 1"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={formData.plz}
                    onChange={(e) =>
                      setFormData({ ...formData, plz: e.target.value })
                    }
                    placeholder="01234"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={formData.ort}
                    onChange={(e) =>
                      setFormData({ ...formData, ort: e.target.value })
                    }
                    placeholder="Musterstadt"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GPS Breitengrad
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.gps_lat}
                    onChange={(e) =>
                      setFormData({ ...formData, gps_lat: e.target.value })
                    }
                    placeholder="51.1234"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GPS Längengrad
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.gps_lng}
                    onChange={(e) =>
                      setFormData({ ...formData, gps_lng: e.target.value })
                    }
                    placeholder="13.5678"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max. Parkdauer
                  </label>
                  <input
                    type="text"
                    value={formData.max_parkdauer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_parkdauer: e.target.value,
                      })
                    }
                    placeholder="z.B. 2 Stunden"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stellplätze
                  </label>
                  <input
                    type="number"
                    value={formData.stellplaetze}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stellplaetze: e.target.value,
                      })
                    }
                    placeholder="z.B. 20"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as ParkplatzStatus,
                    })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="aktiv">Aktiv</option>
                  <option value="inaktiv">Inaktiv</option>
                  <option value="pausiert">Pausiert</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="self_control"
                  checked={formData.self_control}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      self_control: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#1e3a5f] rounded"
                />
                <label
                  htmlFor="self_control"
                  className="text-sm font-medium text-slate-700"
                >
                  Self-Control Parkplatz
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notizen
                </label>
                <textarea
                  value={formData.notizen}
                  onChange={(e) =>
                    setFormData({ ...formData, notizen: e.target.value })
                  }
                  rows={2}
                  placeholder="Interne Notizen..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152a4a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Speichern...
                    </>
                  ) : editingId ? (
                    "Speichern"
                  ) : (
                    "Anlegen"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
