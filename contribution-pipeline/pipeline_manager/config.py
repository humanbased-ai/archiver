"""Pipeline Manager configuration."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Label Studio
LS_URL = os.environ.get("LABEL_STUDIO_URL", "http://localhost:8080")
LS_API_KEY = os.environ.get("LABEL_STUDIO_API_KEY", "")

# Database
DB_PATH = BASE_DIR / "data" / "pipeline.db"
DB_URL = f"sqlite:///{DB_PATH}"

# Models
MODELS_DIR = PROJECT_ROOT / "ml-backend" / "models"

# Pipeline configs
PIPELINE_CONFIGS_DIR = BASE_DIR / "pipeline_configs"

# Server
HOST = os.environ.get("PIPELINE_HOST", "0.0.0.0")
PORT = int(os.environ.get("PIPELINE_PORT", "8000"))
