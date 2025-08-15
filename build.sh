#!/usr/bin/env bash
# File: build.sh
# Build script for Render deployment

set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

echo "Build completed successfully!"