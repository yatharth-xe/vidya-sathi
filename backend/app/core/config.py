import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load env file if it exists
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vidya Sathi API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vidya-sathi-dev-secret-key-change-in-production-abc123")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "11520")) # 8 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vidya_sathi.db")
    
    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:5173"
        ).split(",") if origin.strip()
    ]

    class Config:
        case_sensitive = True

settings = Settings()
