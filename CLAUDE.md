# Hinweise für Claude

## Workflow
- **Immer alles mergen!** PRs nach grünem CI/Deploy **direkt mergen** –
  nicht auf Freigabe warten und nie nachfragen, ob gemergt werden soll.
  Wichtig ist nur, dass ein Rollback möglich bleibt: immer per
  **Merge-Commit** mergen (kein Squash/Rebase), dann reicht
  `git revert -m 1 <merge-commit>` zum Zurückrollen.
- Default-Branch ist `claude/flunk-des-lebens-app-iprjtq`.

## Projekt
- Vite + React + TypeScript; Build/Typecheck: `npm run build` (`tsc -b && vite build`).
- Live-Sync läuft über Supabase (`src/lib/supabase.ts`); ohne konfigurierten
  Server läuft die App im lokalen Modus. Geteilter Zustand = `SharedState`
  in `src/types.ts` – neue live zu syncende Felder dort und in
  `sharedOf`/`loadState`/`initialState` ergänzen.
- Sprache in UI, Kommentaren und Commits: Deutsch.
