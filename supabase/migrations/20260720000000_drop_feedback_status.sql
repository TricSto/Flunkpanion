-- Migration: Feedback-Pipeline abgebaut.
--
-- Die temporäre Feedback-Seite und der GitHub-Workflow feedback-issues.yml
-- wurden entfernt – die RPC apply_feedback_status hat damit keinen Aufrufer
-- mehr und wird gelöscht. Alte `feedback`-Arrays in games.state bleiben
-- liegen und werden von der App schlicht ignoriert; beim nächsten
-- Voll-Sync des Zustands verschwinden sie von selbst.

drop function if exists public.apply_feedback_status(text, jsonb);
