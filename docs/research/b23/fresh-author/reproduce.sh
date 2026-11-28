#!/usr/bin/env bash
# Rebuild three editions in disposable checkouts. Copies only the authored episode.
set -eu
base="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "${1:?repository with tools/creatures dependencies}" && pwd)"
output="${2:?output directory}"
mkdir -p "$output"
output="$(cd "$output" && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
git clone -q --local --shared --no-checkout "$repo" "$scratch/source"
git -C "$scratch/source" sparse-checkout set tools/creatures assets/creatures .agents/skills/pixel-bosses
git -C "$scratch/source" checkout -q --detach c1eaf999c09d53ff72385721ddb09eaff1949b62
cd "$scratch/source/tools/creatures"
ln -s "$repo/tools/creatures/node_modules" node_modules
npm run -s ws -- new fzero_b --body light-quadruped --theme meadow --rarity common
for edition in round1 round2 episode; do
  cp "$base"/source/* c/
  if test "$edition" != episode; then cp "$base/versions/$edition/"* c/; fi
  npm run -s ws -- render fzero_b --anim fidget_a --jobs 1
  cp "$scratch/source/assets/creatures/fzero_b/gif/painting-fidget_a.gif" "$output/$edition.gif"
done
(cd "$output" && sha256sum -c "$base/sha256.txt")
