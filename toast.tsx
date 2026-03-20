import MeldungForm from "@/components/forms/MeldungForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NeueMeldungPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/meldungen"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Neue Meldung</h1>
          <p className="text-slate-500 text-sm">
            Falschparker melden – alle Pflichtfelder ausfüllen
          </p>
        </div>
      </div>

      {/* Form */}
      <MeldungForm />
    </div>
  );
}
