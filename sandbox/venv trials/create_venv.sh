set -e

echo "Creating Python 3.11 virtual environment..."

#check python3.11 exists
if ! command -v python3.11 &> /dev/null
then
    echo "ERROR: python3.11 not found"
    exit 1
fi

python3.11 -m venv .venv

echo "Activating environment..."

source .venv/bin/activate

echo "Upgrading pip tooling..."

pip install --upgrade pip setuptools wheel

echo "Installing dependencies..."

pip install -r requirements.txt
pip install airsim --no-build-isolation

echo ""
echo "Setup complete."
echo ""
echo "Activate using:"
echo "source .venv/bin/activate"