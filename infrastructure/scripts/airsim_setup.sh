#!/usr/bin/env bash
#infrastructure/scripts/airsim_setup.sh

# this is just a workaround for now since airsim is a bit of a broken package
# we need to manually install dependencies and force it to use those 
echo "Installing AirSim dependencies..."

uv pip install msgpack-rpc-python
uv pip install airsim --no-build-isolation

echo "AirSim installation complete"