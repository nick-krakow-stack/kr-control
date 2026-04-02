async function sendEmail(
  apiKey: string,
  from: string,
  fromName: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, html }),
    });
    return resp.status === 200 || resp.status === 201;
  } catch {
    return false;
  }
}

export async function sendInviteEmail(
  apiKey: string, from: string, fromName: string, frontendUrl: string,
  toEmail: string, username: string, inviteToken: string
): Promise<void> {
  const setupUrl = `${frontendUrl}/#/password-setup/${inviteToken}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;width:56px;height:56px;background:#2563eb;border-radius:14px;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:white;font-size:24px;font-weight:bold;">K</span>
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;">KR Control</h1>
  </div>
  <h2 style="font-size:18px;font-weight:600;color:#1e293b;margin-bottom:8px;">Willkommen, ${username}!</h2>
  <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px;">
    Ihr Konto bei KR Control wurde eingerichtet. Bitte klicken Sie auf den Button unten,
    um Ihr Passwort festzulegen und sich anzumelden.
  </p>
  <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">Der Link ist <strong>72 Stunden</strong> gültig.</p>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${setupUrl}" style="display:inline-block;background:#2563eb;color:white;font-weight:600;font-size:15px;padding:12px 32px;border-radius:10px;text-decoration:none;">
      Passwort festlegen →
    </a>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
    Falls Sie diesen Link nicht angefordert haben, ignorieren Sie diese E-Mail.
  </p>
</div></body></html>`;
  await sendEmail(apiKey, from, fromName, toEmail, "Ihr KR Control-Konto wurde eingerichtet", html);
}

export async function sendPasswordChangedEmail(
  apiKey: string, from: string, fromName: string,
  toEmail: string, username: string
): Promise<void> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="font-size:18px;font-weight:600;color:#1e293b;">Passwort geändert</h2>
  <p style="color:#64748b;font-size:14px;line-height:1.6;">
    Hallo ${username}, Ihr Passwort bei KR Control wurde erfolgreich geändert.
    Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte sofort an Ihren Administrator.
  </p>
</div></body></html>`;
  await sendEmail(apiKey, from, fromName, toEmail, "Ihr KR Control-Passwort wurde geändert", html);
}

export async function sendRecallConfirmationEmail(
  apiKey: string, from: string, fromName: string,
  toEmail: string, username: string,
  licensePlate: string, locationName: string, recalledAt: string
): Promise<void> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;width:56px;height:56px;background:#2563eb;border-radius:14px;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:white;font-size:24px;font-weight:bold;">K</span>
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;">KR Control</h1>
  </div>
  <h2 style="font-size:18px;font-weight:600;color:#1e293b;margin-bottom:8px;">Fall widerrufen</h2>
  <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px;">
    Hallo ${username}, Ihr gemeldeter Fall wurde erfolgreich widerrufen.
  </p>
  <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="color:#64748b;padding:6px 0;">Kennzeichen</td>
        <td style="color:#1e293b;font-weight:600;text-align:right;">${licensePlate}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:6px 0;">Standort</td>
        <td style="color:#1e293b;font-weight:600;text-align:right;">${locationName}</td>
      </tr>
      <tr>
        <td style="color:#64748b;padding:6px 0;">Widerrufen am</td>
        <td style="color:#1e293b;font-weight:600;text-align:right;">${recalledAt}</td>
      </tr>
    </table>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
    Falls Sie diesen Widerruf nicht vorgenommen haben, wenden Sie sich bitte an den Support.
  </p>
</div></body></html>`;
  await sendEmail(apiKey, from, fromName, toEmail, "Ihr Fall wurde widerrufen – KR Control", html);
}

export async function sendPasswordResetEmail(
  apiKey: string, from: string, fromName: string, frontendUrl: string,
  toEmail: string, username: string, resetToken: string
): Promise<void> {
  const resetUrl = `${frontendUrl}/#/password-reset/${resetToken}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;width:56px;height:56px;background:#2563eb;border-radius:14px;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:white;font-size:24px;font-weight:bold;">K</span>
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;">KR Control</h1>
  </div>
  <h2 style="font-size:18px;font-weight:600;color:#1e293b;margin-bottom:8px;">Passwort zurücksetzen</h2>
  <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px;">
    Hallo ${username}, Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.
    Klicken Sie auf den Button unten, um ein neues Passwort festzulegen.
  </p>
  <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">Der Link ist <strong>1 Stunde</strong> gültig.</p>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;font-weight:600;font-size:15px;padding:12px 32px;border-radius:10px;text-decoration:none;">
      Passwort zurücksetzen →
    </a>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
    Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.
  </p>
</div></body></html>`;
  await sendEmail(apiKey, from, fromName, toEmail, "Passwort zurücksetzen – KR Control", html);
}
