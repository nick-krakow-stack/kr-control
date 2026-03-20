import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient();

    // Check requesting user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

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
    const { email, name, rolle, passwort } = body;

    if (!email || !name || !rolle || !passwort) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich" },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth Admin API
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: passwort,
        email_confirm: true,
        user_metadata: {
          name,
          rolle,
        },
      });

    if (createError) {
      if (createError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Diese E-Mail-Adresse ist bereits registriert" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Update profile if it was created by trigger
    if (newUser.user) {
      await adminClient
        .from("profiles")
        .upsert({
          id: newUser.user.id,
          name,
          email,
          rolle,
          aktiv: true,
        })
        .eq("id", newUser.user.id);
    }

    return NextResponse.json(
      { success: true, user_id: newUser.user?.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
