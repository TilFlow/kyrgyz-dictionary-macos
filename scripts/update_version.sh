#!/bin/bash
set -euo pipefail

VERSION="${1:?Usage: $0 <version> (e.g. 0.0.1)}"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (e.g. 0.0.1)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Updating version to $VERSION"

# 1. package.json
if grep -q '"version"' "$ROOT/package.json"; then
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/package.json"
else
  sed -i "s/\"name\": \"ky-concept\"/\"name\": \"ky-concept\",\n  \"version\": \"$VERSION\"/" "$ROOT/package.json"
fi
echo "  package.json → $VERSION"

# 2. All plist files — add or update CFBundleVersion and CFBundleShortVersionString
for plist in "$ROOT"/templates/Info*.plist; do
  name=$(basename "$plist")

  if grep -q "CFBundleVersion" "$plist"; then
    sed -i "/<key>CFBundleVersion<\/key>/{n;s|<string>[^<]*</string>|<string>$VERSION</string>|}" "$plist"
  else
    sed -i "/<key>CFBundleIdentifier<\/key>/i\\
  <key>CFBundleVersion</key>\\
  <string>$VERSION</string>\\
  <key>CFBundleShortVersionString</key>\\
  <string>$VERSION</string>" "$plist"
  fi

  if grep -q "CFBundleShortVersionString" "$plist"; then
    sed -i "/<key>CFBundleShortVersionString<\/key>/{n;s|<string>[^<]*</string>|<string>$VERSION</string>|}" "$plist"
  fi

  echo "  $name → $VERSION"
done

echo "Done. Version is now $VERSION"
