from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./kr_control.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h
    admin_username: str = "admin"
    admin_password: str = "admin123"

    class Config:
        env_file = ".env"


settings = Settings()
