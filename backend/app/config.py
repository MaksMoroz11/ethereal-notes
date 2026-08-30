from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1"


settings = Settings()
