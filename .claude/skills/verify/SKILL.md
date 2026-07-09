---
name: verify
description: Flunkpanion bauen, im Browser starten und Layout/Flows auf Handy-Viewports prüfen.
---

# Flunkpanion verifizieren

## Bauen & starten
```bash
npm ci                 # falls node_modules fehlt
npm run build          # tsc -b && vite build
npx vite preview --port 4173 --strictPort &   # serviert dist/
```
Ohne Supabase-Env läuft die App im lokalen Modus – für Layout-Checks reicht das.

## Treiben (Playwright)
- Chromium liegt unter `/opt/pw-browsers/chromium` (kein `playwright install`).
- `playwright-core` bei Bedarf mit `npm i --no-save playwright-core` holen.
- ESM-Skripte müssen im Repo-Root liegen (Paketauflösung), z. B. als
  `verify-*.tmp.mjs` kopieren und danach löschen.
- App startet auf dem Setup-Tab; zum Spielfeld per
  `page.getByRole('button', { name: /Spiel/ }).click()`.

## Was prüfen
- Spielfeld (`.app-fit`/`.board-grid`) muss OHNE Scrollen passen: pro
  `.field-tile` prüfen, dass Kind-Rects in der Box bleiben (Kinder mit
  0×0-Rect überspringen – ausgeblendete `.field-sub`!) und keine Kachel
  unter der `.tabbar` beginnt.
- Wichtige Viewports: 320×548 (SE mit Browserleiste), 390×664 / 390×844
  (iPhone 14 mit/ohne Leiste), 412×839 / 412×915 (Pixel), 430×932 (Pro Max).
- Adressleisten-Verhalten simulieren: nach dem Laden `setViewportSize` auf
  die größere/kleinere Höhe und prüfen, dass `--vvh` (von
  `src/lib/viewport.ts` gesetzt) mitzieht – `100dvh` ist auf echten Geräten
  beim ersten Laden nicht verlässlich, deshalb hängt das Board an `--vvh`.
