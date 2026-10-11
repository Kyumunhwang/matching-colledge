"""
Vercel Serverless Function Entry Point for Matching College Web Service.
Exposes the FastAPI instance for Vercel's ASGI runtime.
"""
import sys
from pathlib import Path

# Add project root directory to Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app
