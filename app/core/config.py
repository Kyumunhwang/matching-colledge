"""
Application configuration for Matching College 5D-Match Engine.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
STATIC_DIR = BASE_DIR / "static"


class Settings(BaseSettings):
    APP_NAME: str = "Matching College"
    APP_VERSION: str = "1.0.0"
    PORT: int = 3088
    HOST: str = "127.0.0.1"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_MODEL: str = "gemini-2.5-flash"

    DATA_DIR: Path = DATA_DIR
    STATIC_DIR: Path = STATIC_DIR
    BASE_DIR: Path = BASE_DIR
    STUDENTS_FILE: Path = DATA_DIR / "students.json"
    COLLEGES_FILE: Path = DATA_DIR / "colleges.json"


settings = Settings()
