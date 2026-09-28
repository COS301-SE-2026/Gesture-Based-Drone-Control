"""
Session setup for NFR suite

-> points backend at a throwaway sqlite fule before anything imports
    services.database_manager.database, so timing runs nver touch a developers
    real aapp.db and always starts clean
-> puts app/backend on sys.path so `app.main` resolves the same way it does
    under uvicorn
-> gives jwt secret key a local default so the suite runs outside CI too
"""


import os
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

_DB_DIR = Path(tempfile.mkdtemp(prefix='gbdc-nfr-'))
os.environ['SQLITE_DB_PATH'] = str(_DB_DIR / 'nfr.db')
os.environ.setdefault('JWT_SECRET_KEY', 'nfr-local-only-secret-key-not-used-anywhere-else')

for entry in (str(REPO_ROOT), str(REPO_ROOT / 'apps' / 'backend')):
	if entry not in sys.path:
		sys.path.insert(0, entry)
