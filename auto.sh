#!/usr/bin/env bash
set -euo pipefail

for file in .github/workflows/*.yml .github/workflows/*.yaml; do
  [[ -e "$file" ]] || continue

  echo "Patching $file"

  sed -i '' -e '/^[[:space:]]*steps:/a\
\      - name: Harden Runner\
\        uses: step-security/harden-runner@c6295a65d1254861815972266d5933fd6e532bdf # v2.11.1\
\        with:\
\          egress-policy: audit
' "$file"

done

echo "✅ Done!"
