import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import logging

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Sendet eine E-Mail via SMTP SSL. Gibt True bei Erfolg zurück."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP nicht konfiguriert – E-Mail wird nicht gesendet.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from or settings.smtp_user}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(
                settings.smtp_from or settings.smtp_user,
                to_email,
                msg.as_string(),
            )
        logger.info(f"E-Mail gesendet an {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"E-Mail-Fehler an {to_email}: {e}")
        return False


def send_invite_email(to_email: str, username: str, invite_token: str) -> bool:
    setup_url = f"{settings.frontend_url}/#/password-setup/{invite_token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; width: 56px; height: 56px; background: #2563eb; border-radius: 14px; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">K</span>
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e293b;">KR Control</h1>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Willkommen, {username}!</h2>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Ihr Konto bei KR Control wurde eingerichtet. Bitte klicken Sie auf den Button unten,
          um Ihr Passwort festzulegen und sich anzumelden.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">
          Der Link ist <strong>72 Stunden</strong> gültig.
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="{setup_url}"
             style="display: inline-block; background: #2563eb; color: white; font-weight: 600;
                    font-size: 15px; padding: 12px 32px; border-radius: 10px; text-decoration: none;">
            Passwort festlegen →
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Falls Sie diesen Link nicht angefordert haben, ignorieren Sie diese E-Mail.
        </p>
      </div>
    </body>
    </html>
    """

    return _send_email(to_email, "Ihr KR Control-Konto wurde eingerichtet", html)


def send_password_changed_email(to_email: str, username: str) -> bool:
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 18px; font-weight: 600; color: #1e293b;">Passwort geändert</h2>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          Hallo {username}, Ihr Passwort bei KR Control wurde erfolgreich geändert.
          Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte sofort an Ihren Administrator.
        </p>
      </div>
    </body>
    </html>
    """
    return _send_email(to_email, "Ihr KR Control-Passwort wurde geändert", html)
