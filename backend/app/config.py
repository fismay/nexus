from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://nexus:nexus@localhost:5432/nexus_db"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Auth
    jwt_secret: str = "nexus-dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24h

    # Telegram Bot + Ollama
    telegram_bot_token: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    nexus_api_url: str = "http://localhost:8000/api"

    class Config:
        env_file = ".env"


settings = Settings()
