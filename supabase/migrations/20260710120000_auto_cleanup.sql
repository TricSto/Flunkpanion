-- Migration: Alte Spiele vollautomatisch aufräumen.
--
-- Bisher musste das Löschen alter Spiele manuell angestoßen werden (siehe
-- Hinweis am Ende von 20260708000000_init.sql). Diese Migration erledigt das
-- dauerhaft in der Datenbank selbst: pg_cron löscht täglich alle Spiele, die
-- seit 30 Tagen nicht mehr aktualisiert wurden. Es ist kein externer Auslöser
-- (GitHub Action, Handgriff im Dashboard) mehr nötig.
--
-- Alle Anweisungen sind idempotent – erneutes Ausführen ist gefahrlos.

create extension if not exists pg_cron;

-- Standard-Grants laut Supabase-Doku, damit die postgres-Rolle die
-- Cron-Jobs verwalten kann.
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Täglich um 04:00 UTC (nachts, wenn niemand spielt). cron.schedule mit
-- Job-Namen ist idempotent: ein bestehender Job gleichen Namens wird
-- aktualisiert statt doppelt angelegt. Aufbewahrungsfrist bei Bedarf hier
-- anpassen und die Migration erneut ausführen lassen.
select cron.schedule(
  'flunkpanion-alte-spiele-loeschen',
  '0 4 * * *',
  $$ delete from public.games where updated_at < now() - interval '30 days' $$
);
