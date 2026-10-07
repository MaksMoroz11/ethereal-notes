from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1"
    auth_private_key_file: str = ".auth-key.pem"
    api_root_path: str = ""
    cookie_secure: bool = False
    privacy_operator: str = ""
    privacy_contact: str = ""
    consent_version: str = "2026-10-07"


settings = Settings()
