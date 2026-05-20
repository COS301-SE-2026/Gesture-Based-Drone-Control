#throwaway script to create a python virtual environment to get things
#working on powershell
#airsim is a pain in the ass and doesnt want to work correctly in wsl
#so this will be used for now

$ErrorActionPreference = "Stop"

Write-Host "Cleaning up:"

if (Test-Path ".venv") {
    Remove-Item -Recurse -Force ".venv"
}

Write-Host "Creating environment"

py -3.11 -m venv .venv

Write-Host "Activating environment"

& ".\.venv\Scripts\Activate.ps1"

python -m pip install "pip<24" "setuptools<70" wheel

Write-Host "installing dependencies"

#ripped from the pyproject.toml
pip install numpy
pip install tornado==4.5.3 --no-build-isolation
pip install msgpack-rpc-python
pip install backports.ssl-match-hostname
pip install opencv-python
pip install mediapipe
pip install websockets
pip install keyboard

#for project airsim
pip install pynput

Write-Host "installing airsim"

pip install airsim --no-build-isolation

Write-Host "checking because airsim sucks"

python -c "import airsim; print('AirSim import OK')"

Write-Host "To activate later:"
Write-Host ".\.venv\Scripts\Activate.ps1"

Write-Host "To install project airsim, clone the repo and pip install -e"

Write-Host "done."#throwaway script to create a python virtual environment to get things
#working on powershell
#airsim is a pain in the ass and doesnt want to work correctly in wsl
#so this will be used for now

$ErrorActionPreference = "Stop"

Write-Host "Cleaning up:"

if (Test-Path ".venv") {
    Remove-Item -Recurse -Force ".venv"
}

Write-Host "Creating environment"

py -3.11 -m venv .venv

Write-Host "Activating environment"

& ".\.venv\Scripts\Activate.ps1"

python -m pip install "pip<24" "setuptools<70" wheel

Write-Host "installing dependencies"

#ripped from the pyproject.toml
pip install numpy
pip install tornado==4.5.3 --no-build-isolation
pip install msgpack-rpc-python
pip install backports.ssl-match-hostname
pip install opencv-python
pip install mediapipe
pip install websockets
pip install keyboard
pip install pynput

Write-Host "installing airsim"

pip install airsim --no-build-isolation

Write-Host "checking because airsim sucks"

python -c "import airsim; print('AirSim import OK')"

Write-Host "To activate later:"
Write-Host ".\.venv\Scripts\Activate.ps1"

Write-Host "To install project airsim, clone the repo and pip install -e"

Write-Host "done."