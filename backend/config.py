from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite:///./kr_control.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h

    # Erster Admin (wird beim ersten Start angelegt, falls keine User vorhanden)
    first_admin_username: str = "admin"
    first_admin_email: str = "admin@kr-control.de"
    first_admin_password: str = "ChangeMe123!"

    # Standard-Widerruf-Fenster in Stunden
    default_recall_hours: int = 24

    # SMTP / Email
    smtp_host: str = "w013a015.kasserver.com"
    smtp_port: int = 465
    smtp_ssl: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_from_name: str = "KR Control"

    # Frontend-URL für Email-Links
    frontend_url: str = "https://kr-control-production.up.railway.app"

    class Config:
        env_file = ".env"


settings = Settings()
