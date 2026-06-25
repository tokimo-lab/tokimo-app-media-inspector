#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/apps/tokimo-app-media-inspector"
cargo fmt -- --check
