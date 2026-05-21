import json 
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from apps.backend.app.main import app

def main():
    openapi_schema = app.openapi()

    docs_path = Path("docs/openapi.json")
    docs_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(docs_path, "w") as file:
        json.dump(openapi_schema, file, indent=2)
    
if __name__ == "__main__":
    main()