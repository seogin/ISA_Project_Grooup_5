#!/bin/bash
# Build script for CPU-only deployment (no CUDA dependencies)
# This prevents installation of large NVIDIA CUDA libraries

set -e

echo "Installing CPU-only PyTorch to prevent CUDA dependencies..."

# Install CPU-only PyTorch from the official CPU index
# This must be done BEFORE installing TTS to prevent CUDA dependencies
pip install torch==2.1.2+cpu torchaudio==2.1.2+cpu \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  --no-cache-dir

echo "Installing remaining requirements (TTS will use existing CPU PyTorch)..."
pip install -r requirements.txt --no-cache-dir

