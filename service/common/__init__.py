import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.

# Path to the project root directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Path to the alembic.ini file
ALEMBIC_INI_PATH = Path(os.path.join(BASE_DIR, "alembic.ini"))
