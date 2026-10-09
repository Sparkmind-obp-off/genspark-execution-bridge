#!/usr/bin/env bash
# Read-only account-specific model inventory for the official Genspark GenCode CLI.
# This script does not submit a generation task, modify a project, or print API keys.
set -euo pipefail

if ! command -v gencode >/dev/null 2>&1; then
  cat >&2 <<'EOF'
GenCode CLI is not installed.
Install from the official package:
  npm install -g @genspark/gencode
Then sign in:
  gencode login
EOF
  exit 127
fi

printf '\n== GenCode CLI version ==\n'
gencode --version

printf '\n== Models available to the authenticated Genspark account ==\n'
printf 'This is a live account-level inventory; availability and credit cost may change.\n\n'
gencode models

printf '\n== Important boundary ==\n'
printf 'A visible model in this catalog does not prove a generic app-facing REST API exists.\n'
printf 'This script does not submit a model-generation request.\n'
