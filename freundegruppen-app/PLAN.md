# Tripanion – Ausflugs-Organizer für Freundesgruppen (Konzept v2)

> Arbeitstitel „Tripanion" (Trip + Companion, Schwester-App zu Flunkpanion).
> Klickbares Mockup: [`mockup/index.html`](mockup/index.html).

## 1. Vision

Eine App, mit der Freundesgruppen ihre gemeinsamen Anlässe organisieren –
Festival, Wochenendtrip, Geburtstag, Stammtisch. Modular: Jede Gruppe nutzt
nur die Bausteine, die sie braucht. Und lebendig: Die App weiß, in welcher
**Phase** ein Anlass gerade steckt, und zeigt genau das, was jetzt dran ist.

## 2. Was gegenüber v1 hinterfragt und geändert wurde

| v1 | Problem | v2 |
|---|---|---|
| Gruppe = Anlass | Für jeden Trip eine neue Gruppe; Freundeskreis zerfasert | **Crew** (dauerhaft) + **Events** (pro Anlass). Module gelten pro Event. |
| Paketwahl als Namensliste | Abstrakt; man muss raten, was drinsteckt | **Frage-Onboarding** (3 kurze Fragen) leitet Module her; Pakete sind Shortcuts, die die Antworten vorbelegen |
| Statisches Kachel-Dashboard | Zeigt immer alles, egal ob relevant | **Phasen-Dashboard**: „Jetzt wichtig"-Feed je Phase + Countdown-Hero |
| Module = einziges Konzept | Konfiguration ist kein Erlebnis | Module bleiben die Konfigurationsebene; **Phasen** sind die Erlebnisebene |

## 3. Grundkonzept

### Crew & Events
- Eine **Crew** ist der dauerhafte Freundeskreis (Mitglieder, Einladungslink).
- Ein **Event** ist ein Anlass der Crew („Hurricane 2026", „Skiwochenende").
  Pro Event: eigene Modulauswahl, eigene Daten, eigene Abrechnung.
- Beitritt per Link/QR ohne Registrierungszwang (Name reicht, wie Flunkpanion).

### Module (pro Event einzeln aktivierbar)
- 📅 **Kalender** – gemeinsame Termine + Terminfindung (Ja/Nein/Vielleicht).
- 🗳️ **Umfragen** – schnelle Abstimmungen, Einfach-/Mehrfachwahl, optional anonym.
- 📝 **Listen** – Einkaufs-, Pack-, To-do-Listen mit Zuständigkeiten; Vorlagen.
- 💰 **Kasse** – Ausgaben erfassen, Saldenrechnung, minimale Ausgleichszahlungen,
  Settle-Up per Tap.
- Deaktivieren blendet nur aus, löscht nichts; Reaktivieren bringt alles zurück.
- Später denkbar: Ort/Karte, Fotoalbum, Fahrgemeinschaften, Chat/Pinnwand.

### Onboarding: Fragen statt Formulare
Beim Anlegen eines Events beantwortet man drei Fragen:
1. „Steht der Termin schon fest?" → nein: Kalender/Terminfindung an
2. „Plant ihr gemeinsam Einkäufe oder Packen?" → ja: Listen an
3. „Gebt ihr zusammen Geld aus?" → ja: Kasse an

Umfragen sind standardmäßig an (leichtgewichtig, immer nützlich).
**Pakete** (🎪 Festival, 🏔️ Trip, 🍻 Stammtisch, 🎂 Feier …) sind Shortcuts,
die Antworten und passende Listen-Vorlagen vorbelegen. Das Ergebnis ist immer
eine Toggle-Liste, die man vor dem Erstellen und jederzeit danach ändern kann.

### Phasen: Die App lebt mit dem Event
Jedes Event durchläuft einen Lebenszyklus; das Dashboard passt sich an:

| Phase | Auslöser | „Jetzt wichtig" zeigt |
|---|---|---|
| 🧭 **Planung** | Event angelegt | Offene Terminfindung, laufende Umfragen |
| ⏳ **Countdown** | Termin fixiert | Countdown-Hero, offene Listenpunkte, Zuständigkeiten |
| 🔥 **Live** | Event läuft | Ein-Tap-Ausgabe, Tagesplan, Treffpunkte |
| 🧾 **Danach** | Event vorbei | Kassensturz, offene Salden, Abrechnung abschließen |

Phasen wechseln automatisch (Datum) oder manuell. Module bleiben immer über
die Tab-Leiste erreichbar – die Phase ändert nur, was oben priorisiert wird.

### Momente, die die App „geil" machen
- **Countdown-Hero**: „Noch 12 Tage" als Herzstück der Vorfreude.
- **Ein-Tap-Ausgabe** in der Live-Phase: Betrag, wer zahlt, fertig.
- **Settle-Up**: „Miri → Alex 28,50 €" mit einem Tap als beglichen markieren.
- **Aktivitäts-Feed**: „Jo hat Pavillon abgehakt", „3/5 haben abgestimmt".

## 4. Nutzerfluss

1. Crew anlegen oder per Link beitreten.
2. Event erstellen → Name + 3 Fragen (oder Paket-Shortcut).
3. Modul-Toggles prüfen → Event erstellen.
4. Dashboard: Countdown/Phase + „Jetzt wichtig" + Tab-Leiste mit aktiven Modulen.
5. Nachträglich: Module in den Event-Einstellungen jederzeit an/aus.

## 5. Technik

Bewährter Stack aus Flunkpanion:

- **Frontend:** Vite + React + TypeScript, mobile-first, PWA-fähig.
- **Sync:** Supabase (Postgres + Realtime); ohne Server lokaler Demo-Modus.
- **Hosting:** Vercel. **Sprache:** Deutsch (UI, Kommentare, Commits).

### Datenmodell (Skizze)

```
Crew        id, name, erstellt_am
Mitglied    id, crew_id, name, (optional user_id)
Event       id, crew_id, name, paket?, phase (planung|countdown|live|danach),
            start?, ende?,
            module: { kalender, umfragen, listen, kasse }  // bools
Termin      id, event_id, titel, start, ende?, ort?, status (vorschlag|fix)
TerminVote  termin_id, mitglied_id, antwort (ja|nein|vielleicht)
Umfrage     id, event_id, frage, mehrfach, anonym, deadline?
Option      id, umfrage_id, text
Stimme      option_id, mitglied_id
Liste       id, event_id, name, typ (einkauf|packen|todo)
Eintrag     id, liste_id, text, menge?, zustaendig?, erledigt
Ausgabe     id, event_id, zahler_id, betrag, beschreibung, beteiligte[]
Ausgleich   id, event_id, von_id, an_id, betrag, beglichen_am?
Aktivitaet  id, event_id, mitglied_id, typ, referenz, zeit   // Feed
```

Pakete und Listen-Vorlagen sind reine Daten (JSON), keine Sonderlogik.

## 6. Roadmap

- **M0 – Konzept & Mockup (dieser Stand):** Plan v2, klickbares Mockup.
- **M1 – Grundgerüst:** Eigenes Repo, Crew + Event anlegen, Frage-Onboarding,
  Modul-Toggles, Phasen-Dashboard (lokal, ohne Backend).
- **M2 – Module MVP:** Kasse und Listen zuerst (größter Alltagsnutzen),
  dann Umfragen, dann Kalender/Terminfindung.
- **M3 – Live-Sync:** Supabase, Einladungslinks, Realtime, Aktivitäts-Feed.
- **M4 – Politur:** Vorlagen, automatischer Phasenwechsel, PWA/Homescreen,
  Erinnerungen/Push.

## 7. Offene Fragen

- Repo-Name (Vorschlag `tripanion`); muss vom Maintainer angelegt und für
  die Claude-Session freigeschaltet werden.
- Braucht die Kasse echte Accounts (Wiedererkennung über Geräte hinweg)
  oder reicht der Name+Link-Ansatz von Flunkpanion?
- Crew-übergreifende Salden („Dauerschulden" im Freundeskreis) – v2-Feature?
- Währung fix EUR oder konfigurierbar? Web-Push im MVP oder später?
