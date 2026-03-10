#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"

DIRS=(
  "./instance"
  "./web-app"
  "./service"
  "./plugins/sftp/service"
  "./plugins/sftp/web"
  "./plugins/arcgis/service"
  "./plugins/arcgis/web-app"
  "./plugins/nga-msi"
  "./"
)

LOCKFILES=(
  "package-lock.json"
)

echo "Dependency exorcism starting from: $ROOT"
echo

remove_fast() {
  local target="$1"

  if [[ -e "$target" ]]; then
    local trash="${target}.delete.$(date +%s)"
    echo "    moving $target -> $trash"
    mv "$target" "$trash"
    echo "    deleting $trash in background"
    rm -rf "$trash" &
  fi
}

clean_dir () {
  local dir="$1"

  if [[ ! -d "$dir" ]]; then
    echo "Skipping missing folder: $dir"
    return 0
  fi

  if [[ ! -f "$dir/package.json" ]]; then
    echo "Skipping (no package.json): $dir"
    return 0
  fi

  echo "— Cleaning: $dir"

  echo "  removing node_modules..."
  remove_fast "$dir/node_modules"

  echo "  removing lib..."
  remove_fast "$dir/lib"

  echo "  removing lockfiles..."
  for lf in "${LOCKFILES[@]}"; do
    rm -f "$dir/$lf" || true
  done

  echo "  clean complete"
}

install_dir () {
  local dir="$1"
  echo "Installing: $dir"
  (cd "$dir" && npm install)
}

echo "STEP 1/2: Cleaning node_modules + lockfiles"
for dir in "${DIRS[@]}"; do
  clean_dir "$dir"
done

echo
echo "Waiting for background deletions to finish..."
wait || true

echo
echo "STEP 2/2: Reinstalling in order"
for dir in "${DIRS[@]}"; do
  if [[ -d "$dir" && -f "$dir/package.json" ]]; then
    install_dir "$dir"
  fi
done

echo
echo "Done. All listed folders cleaned + reinstalled."