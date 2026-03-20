import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/parkplaetze?q=search&limit=10
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10");
  const all = searchParams.get("all") === "true";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    let query = supabase
      .from("parkplaetze")
      .select("id, name, adresse, plz, ort, gps_lat, gps_lng, status, self_control, max_parkdauer")
      .order("name");

    if (!all) {
      query = query.eq("status", "aktiv");
    }

    if (q && q.length >= 1) {
      query = query.ilike("name", `%${q}%`);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// POST /api/parkplaetze – Admin only
export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("rolle")
      .eq("id", user.id)
      .single();

    if (profile?.rolle !== "admin") {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("parkplaetze")
      .insert({
        name: body.name,
        adresse: body.adresse,
        plz: body.plz || null,
        ort: body.ort || null,
        gps_lat: body.gps_lat || null,
        gps_lng: body.gps_lng || null,
        max_parkdauer: body.max_parkdauer || null,
        stellplaetze: body.stellplaetze || null,
        self_control: body.self_control || false,
        kunde_id: body.kunde_id || null,
        status: body.status || "aktiv",
        notizen: body.notizen || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
