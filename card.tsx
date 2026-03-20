import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getParkdauerDisplay, formatDate, formatTime } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "email@nickkrakow.de";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      meldung_id,
      parkplatz_name,
      kennzeichen,
      fahrzeugmarke,
      vorfall_datum,
      vorfall_uhrzeit,
      parkdauer,
      parkdauer_freitext,
      kommentar,
      bilder,
    } = body;

    const parkdauerText = getParkdauerDisplay(parkdauer, parkdauer_freitext);
    const vorfallDatum = formatDate(vorfall_datum);
    const vorfallUhrzeit = formatTime(vorfall_uhrzeit);
    const meldungUrl = `${APP_URL}/dashboard/meldungen/${meldung_id}`;

    // Build image HTML
    const bilderHtml =
      bilder && bilder.length > 0
        ? bilder
            .map(
              (url: string, i: number) =>
                `<div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Foto ${i + 1}</p>
              <img src="${url}" alt="Foto ${i + 1}" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #e2e8f0;" />
            </div>`
            )
            .join("")
        : "<p style='color: #94a3b8;'>Keine Bilder hochgeladen</p>";

    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neue Meldung – KR Control</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 32px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #152a4a 100%); padding: 32px 32px 28px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="background: #f97316; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">🅿️</span>
        </div>
        <div style="text-align: left;">
          <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">KR Control</h1>
          <p style="margin: 2px 0 0; color: #94a3b8; font-size: 13px;">Parkplatzkontrolle</p>
        </div>
      </div>
    </div>

    <!-- Alert Banner -->
    <div style="background: #fef3c7; border-bottom: 3px solid #f97316; padding: 16px 32px;">
      <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 15px;">
        🚨 Neue Falschparker-Meldung eingegangen!
      </p>
      <p style="margin: 4px 0 0; color: #b45309; font-size: 13px;">
        Kennzeichen: <strong style="font-family: monospace; font-size: 16px;">${kennzeichen}</strong>
        ${fahrzeugmarke ? ` • ${fahrzeugmarke}` : ""}
      </p>
    </div>

    <!-- Details -->
    <div style="padding: 28px 32px;">
      <h2 style="margin: 0 0 20px; font-size: 16px; color: #1e293b; font-weight: 600;">Meldungsdetails</h2>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; width: 160px; font-weight: 500;">📍 Parkplatz</td>
          <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${parkplatz_name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">🚗 Kennzeichen</td>
          <td style="padding: 10px 0; color: #1e293b; font-family: monospace; font-weight: 700; font-size: 16px;">${kennzeichen}</td>
        </tr>
        ${
          fahrzeugmarke
            ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">🚙 Fahrzeugmarke</td>
          <td style="padding: 10px 0; color: #1e293b;">${fahrzeugmarke}</td>
        </tr>`
            : ""
        }
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">📅 Vorfallzeit</td>
          <td style="padding: 10px 0; color: #1e293b;">${vorfallDatum} um ${vorfallUhrzeit} Uhr</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">⏱️ Parkdauer</td>
          <td style="padding: 10px 0; color: #1e293b;">${parkdauerText}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">🕐 Gemeldet am</td>
          <td style="padding: 10px 0; color: #1e293b;">${new Date().toLocaleString("de-DE")}</td>
        </tr>
        ${
          kommentar
            ? `
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-weight: 500; vertical-align: top;">💬 Kommentar</td>
          <td style="padding: 10px 0; color: #1e293b;">${kommentar}</td>
        </tr>`
            : ""
        }
      </table>

      <!-- CTA Button -->
      <div style="margin: 24px 0 0; text-align: center;">
        <a href="${meldungUrl}" style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Meldung im Dashboard öffnen →
        </a>
      </div>
    </div>

    <!-- Images Section -->
    ${
      bilder && bilder.length > 0
        ? `
    <div style="padding: 0 32px 28px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b; font-weight: 600;">
        📸 Fotos (${bilder.length})
      </h2>
      ${bilderHtml}
    </div>`
        : ""
    }

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        Diese E-Mail wurde automatisch von KR Control generiert.<br>
        Meldungs-ID: <code style="font-family: monospace; background: #e2e8f0; padding: 1px 6px; border-radius: 4px;">${meldung_id}</code>
      </p>
    </div>
  </div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: "KR Control <noreply@kr-control.de>",
      to: [ADMIN_EMAIL],
      subject: `[KR Control] Neue Meldung – ${parkplatz_name} – ${kennzeichen}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      // Don't fail the request because of email error
      return NextResponse.json({
        success: false,
        message: "E-Mail konnte nicht gesendet werden",
        error: error.message,
      });
    }

    return NextResponse.json({ success: true, email_id: data?.id });
  } catch (error) {
    console.error("Email route error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
