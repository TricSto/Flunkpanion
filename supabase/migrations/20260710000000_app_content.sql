-- Migration: Global gespeicherte App-Inhalte (Karten-Seite).
--
-- Karteninhalte (Decks) und Feldfarben hingen bisher nur am geteilten
-- Spielzustand (Tabelle games, eine Zeile pro Spiel-Code) – ein neues Spiel
-- startete damit wieder mit den Standardkarten. Diese Tabelle hält die
-- Inhalte der Karten-Seite global in einer einzigen Zeile: Änderungen gelten
-- dauerhaft für alle Geräte und alle zukünftigen Spiele/Sessions.
-- Alle Anweisungen sind idempotent – erneutes Ausführen ist gefahrlos.

create table if not exists public.app_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- Tabellenrechte für die öffentlichen (nicht eingeloggten) Rollen – ohne
-- diese Grants greift keine Policy (wie bei games).
grant select, insert, update, delete on public.app_content to anon, authenticated;

alter table public.app_content enable row level security;

-- Kein Login-System (siehe games): Alle dürfen lesen und schreiben – die App
-- ist ein Tischspiel unter Freunden mit einer gemeinsamen Inhalte-Zeile.
drop policy if exists "app_content_select" on public.app_content;
create policy "app_content_select" on public.app_content
  for select to anon, authenticated using (true);

drop policy if exists "app_content_insert" on public.app_content;
create policy "app_content_insert" on public.app_content
  for insert to anon, authenticated with check (true);

drop policy if exists "app_content_update" on public.app_content;
create policy "app_content_update" on public.app_content
  for update to anon, authenticated using (true) with check (true);

-- Realtime-Broadcast einschalten, damit Änderungen live auf allen Geräten
-- ankommen. REPLICA IDENTITY FULL für vollständige payload.new-Zeilen.
alter table public.app_content replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.app_content;
exception
  when duplicate_object then null; -- schon Teil der Publication
end $$;
