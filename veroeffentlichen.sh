#!/bin/sh
# Baut die App und stellt sie auf GitHub Pages (Zweig gh-pages).
set -e
cd "$(dirname "$0")"
npm run build
touch dist/.nojekyll
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Veröffentlichung $(date '+%d.%m.%Y %H:%M')"
git push -q -f https://github.com/princeofvintage/ideen-cockpit.git gh-pages
rm -rf .git
echo "Veröffentlicht: https://princeofvintage.github.io/ideen-cockpit/"
