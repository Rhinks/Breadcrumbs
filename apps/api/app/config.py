from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://cbuxjtokckskquxwvmod.supabase.co"
    supabase_service_key: str = "sb_publishable_tbcNoaaOX95xc0Zuv2zI2w_OaBoK2GA"
    database_url: str = ""

    # OpenAI
    openai_api_key: str = ""

    # App
    frontend_url: str = "http://localhost:3000"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    class Config:
        env_file = ".env"


settings = Settings()
