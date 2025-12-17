from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "FastAPI App"
    APP_VERSION: str = "0.0.1"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG_MODE: bool = False
    class Config:
        env_file = ".env"

settings = Settings()