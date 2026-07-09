-- Migration: Umsetzungsstatus für Feedback-Einträge.
--
-- Die Feedback-Pipeline (GitHub-Workflow feedback-issues.yml) ruft diese
-- Funktion auf, um den Status der Feedback-Einträge (state->'feedback')
-- anhand der zugehörigen GitHub-Issues zurückzuschreiben. Die App zeigt
-- den Status live in der Feedback-Liste an.
--
-- Wichtig: Ein einzelnes UPDATE statt Lesen+Zurückschreiben des ganzen
-- Zustands – so bleibt der Rest von `state` unangetastet und parallele
-- Live-Writes der Geräte werden nicht mit veralteten Daten überschrieben.

create or replace function public.apply_feedback_status(p_code text, p_statuses jsonb)
returns boolean
language plpgsql
as $$
declare
  v_updated integer;
begin
  update public.games g
  set state = jsonb_set(
        g.state,
        '{feedback}',
        (
          select coalesce(
            jsonb_agg(
              case
                when p_statuses ? (f->>'id')
                  then f || jsonb_build_object('status', p_statuses->(f->>'id'))
                else f
              end
              order by ord
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(g.state->'feedback') with ordinality as t(f, ord)
        )
      ),
      updated_at = now()
  where g.code = p_code
    and jsonb_typeof(g.state->'feedback') = 'array'
    -- Nur schreiben, wenn sich wirklich etwas ändert (sonst unnötige
    -- Realtime-Events auf allen Geräten alle 30 Minuten).
    and g.state->'feedback' is distinct from (
      select coalesce(
        jsonb_agg(
          case
            when p_statuses ? (f->>'id')
              then f || jsonb_build_object('status', p_statuses->(f->>'id'))
            else f
          end
          order by ord
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(g.state->'feedback') with ordinality as t(f, ord)
    );
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.apply_feedback_status(text, jsonb) to anon, authenticated;
