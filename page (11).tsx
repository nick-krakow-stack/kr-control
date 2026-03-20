import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/meldungen
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const parkplatz_id = searchParams.get("parkplatz_id");
  const kennzeichen = searchParams.get("kennzeichen");
  const datum_von = searchParams.get("datum_von");
  const datum_bis = searchParams.get("datum_bis");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from("meldungen")
      .select(
        `
        *,
        parkplatz:parkplaetze(id, name, adresse, ort),
        melder:profiles(id, name, email),
        bilder(id, url, dateiname)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) query = query.eq("status", status);
    if (parkplatz_id) query = query.eq("parkplatz_id", parkplatz_id);
    if (kennzeichen) query = query.ilike("kennzeichen", `%${kennzeichen}%`);
    if (datum_von) query = query.gte("vorfall_datum", datum_von);
    if (datum_bis) query = query.lte("vorfall_datum", datum_bis);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
