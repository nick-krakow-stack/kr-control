"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Car, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Ungültige E-Mail-Adresse oder falsches Passwort.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Bitte bestätige zuerst deine E-Mail-Adresse.");
        } else {
          setError("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 shadow-lg mb-4">
          <Car className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          KR Control
        </h1>
        <p className="text-slate-300 mt-2 text-sm">
          Professionelle Parkplatzkontrolle
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Anmelden
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Melde dich mit deinen Zugangsdaten an
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#1a3255] disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Anmelden...
              </>
            ) : (
              "Anmelden"
            )}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              if (!email) {
                setError("Bitte gib deine E-Mail-Adresse ein.");
                return;
              }
              setLoading(true);
              const { error } = await supabase.auth.resetPasswordForEmail(
                email,
                { redirectTo: `${window.location.origin}/auth/callback` }
              );
              setLoading(false);
              if (!error) {
                setError("");
                alert(
                  "Link zum Zurücksetzen wurde an deine E-Mail gesendet."
                );
              }
            }}
            className="text-sm text-[#1e3a5f] hover:text-orange-500 transition-colors"
          >
            Passwort vergessen?
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-400 text-xs mt-6">
        © 2024 KR Control – Alle Rechte vorbehalten
      </p>
    </div>
  );
}
