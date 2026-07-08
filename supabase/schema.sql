-- Datenbankschema für "Flunk des Lebens" (Supabase / Postgres).
--
-- So einrichten:
--   1. Bei https://supabase.com kostenloses Projekt anlegen.
--   2. Im Dashboard: SQL Editor öffnen, diesen kompletten Inhalt einfügen,
--      "Run" klicken.
--   3. Unter "Project Settings → API" die "Project URL" und den
--      "anon public" Key kopieren und in die .env eintragen (siehe .env.example).
--
-- Ein "Spiel" ist eine Zeile: der geteilte Spielzustand als JSON, adressiert
-- über einen kurzen Code. Alle Geräte mit demselben Code sehen live dasselbe.

create table if not exists public.games (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Tabellenrechte für die öffentlichen (nicht eingeloggten) Rollen. Ohne diese
-- Grants greift keine Policy – Schreibzugriffe schlagen sonst still fehl.
grant select, insert, update, delete on public.games to anon, authenticated;

-- Row Level Security aktivieren.
alter table public.games enable row level security;

-- Kein Login-System: Der Spiel-Code selbst ist das "Passwort". Wer den Code
-- kennt, darf lesen und schreiben. Für ein Tischspiel unter Freunden ist das
-- ausreichend. (Für höhere Sicherheit könnte man später Auth ergänzen.)
drop policy if exists "games_select" on public.games;
create policy "games_select" on public.games
  for select to anon, authenticated using (true);

drop policy if exists "games_insert" on public.games;
create policy "games_insert" on public.games
  for insert to anon, authenticated with check (true);

drop policy if exists "games_update" on public.games;
create policy "games_update" on public.games
  for update to anon, authenticated using (true) with check (true);

-- Realtime-Broadcast für diese Tabelle einschalten (Live-Updates).
-- Für zeilengenaue Updates (payload.new vollständig) REPLICA IDENTITY FULL setzen.
alter table public.games replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception
  when duplicate_object then null; -- schon Teil der Publication
end $$;

-- Optional: alte Spiele automatisch aufräumen (hier nur als Hinweis).
-- Zum Beispiel per geplanter Funktion Spiele älter als 30 Tage löschen:
--   delete from public.games where updated_at < now() - interval '30 days';
