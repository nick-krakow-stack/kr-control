"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Mail,
  Shield,
  UserCheck,
  User,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Profile, UserRolle, ROLLE_LABELS } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

const ROLLE_COLORS: Record<UserRolle, string> = {
  admin: "bg-purple-100 text-purple-800",
  mitarbeiter: "bg-blue-100 text-blue-800",
  subunternehmer: "bg-orange-100 text-orange-800",
  kunde: "bg-green-100 text-green-800",
};

const ROLLE_ICONS: Record<UserRolle, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  mitarbeiter: UserCheck,
  subunternehmer: User,
  kunde: User,
};

export default function NutzerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nutzer, setNutzer] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    rolle: "mitarbeiter" as UserRolle,
    passwort: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    checkRole();
    loadNutzer();
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

  const loadNutzer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setNutzer(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      // Create user via Supabase Admin Auth
      const response = await fetch("/api/nutzer/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Einladen");
      }

      toast({
        title: "Nutzer eingeladen ✅",
        description: `${inviteForm.name} wurde eingeladen. Eine E-Mail wurde gesendet.`,
        // @ts-ignore
        variant: "success",
      });

      setShowInviteModal(false);
      setInviteForm({ email: "", name: "", rolle: "mitarbeiter", passwort: "" });
      loadNutzer();
    } catch (error: unknown) {
      toast({
        title: "Fehler",
        description:
          error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRolleChange = async (userId: string, neueRolle: UserRolle) => {
    const { error } = await supabase
      .from("profiles")
      .update({ rolle: neueRolle })
      .eq("id", userId);

    if (!error) {
      setNutzer((prev) =>
        prev.map((n) => (n.id === userId ? { ...n, rolle: neueRolle } : n))
      );
      toast({
        title: "Rolle aktualisiert ✅",
        // @ts-ignore
        variant: "success",
      });
    }
  };

  const handleAktivToggle = async (userId: string, aktiv: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ aktiv: !aktiv })
      .eq("id", userId);

    if (!error) {
      setNutzer((prev) =>
        prev.map((n) => (n.id === userId ? { ...n, aktiv: !aktiv } : n))
      );
      toast({
        title: aktiv ? "Nutzer deaktiviert" : "Nutzer aktiviert ✅",
        // @ts-ignore
        variant: aktiv ? "default" : "success",
      });
    }
  };

  const filteredNutzer = nutzer.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nutzer</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {nutzer.length} Nutzer registriert
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Nutzer einladen
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Name oder E-Mail suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white shadow-sm"
        />
      </div>

      {/* Nutzer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
          </div>
        ) : filteredNutzer.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Keine Nutzer gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    E-Mail
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rolle
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Seit
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredNutzer.map((nutzerItem) => {
                  const RolleIcon = ROLLE_ICONS[nutzerItem.rolle];
                  return (
                    <tr key={nutzerItem.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {nutzerItem.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-800">
                            {nutzerItem.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {nutzerItem.email}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={nutzerItem.rolle}
                          onChange={(e) =>
                            handleRolleChange(
                              nutzerItem.id,
                              e.target.value as UserRolle
                            )
                          }
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${
                            ROLLE_COLORS[nutzerItem.rolle]
                          }`}
                        >
                          <option value="admin">Administrator</option>
                          <option value="mitarbeiter">Mitarbeiter</option>
                          <option value="subunternehmer">Subunternehmer</option>
                          <option value="kunde">Kunde</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            nutzerItem.aktiv
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              nutzerItem.aktiv ? "bg-green-500" : "bg-slate-400"
                            }`}
                          />
                          {nutzerItem.aktiv ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {formatDate(nutzerItem.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            handleAktivToggle(nutzerItem.id, nutzerItem.aktiv)
                          }
                          className={`text-xs font-medium transition-colors ${
                            nutzerItem.aktiv
                              ? "text-red-400 hover:text-red-600"
                              : "text-green-500 hover:text-green-700"
                          }`}
                        >
                          {nutzerItem.aktiv ? "Deaktivieren" : "Aktivieren"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                Nutzer einladen
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-Mail *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  placeholder="max@beispiel.de"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rolle *
                </label>
                <select
                  value={inviteForm.rolle}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      rolle: e.target.value as UserRolle,
                    })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="mitarbeiter">Mitarbeiter</option>
                  <option value="subunternehmer">Subunternehmer</option>
                  <option value="kunde">Kunde (Self-Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temporäres Passwort *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={inviteForm.passwort}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, passwort: e.target.value })
                  }
                  placeholder="Min. 6 Zeichen"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Nutzer sollte Passwort nach erstem Login ändern
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152a4a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Einladen...
                    </>
                  ) : (
                    "Nutzer anlegen"
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
