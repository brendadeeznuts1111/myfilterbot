from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    PORTAL_SERVER_URL: str = "http://localhost:5000"
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    DEBUG: bool = False

settings = Settings()
