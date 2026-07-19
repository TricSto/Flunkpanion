# Tripanion – Ausflugs-Organizer für Freundesgruppen

> Arbeitstitel „Tripanion" (Trip + Companion, als Schwester-App zu Flunkpanion).
> Dieses Dokument ist der Projektplan; ein klickbares Mockup liegt unter
> [`mockup/index.html`](mockup/index.html).

## 1. Vision

Eine App, mit der Freundesgruppen ihre gemeinsamen Ausflüge und Anlässe
organisieren – vom Festival über den Wochenendtrip bis zur Geburtstagsfeier.

Das Kernprinzip: **Die App ist modular.** Jede Gruppe aktiviert nur die
Bausteine, die sie wirklich braucht. Für typische Anlässe gibt es
**Vorlagen-Pakete**, die eine sinnvolle Vorauswahl treffen – aber jedes Modul
lässt sich einzeln dazu- oder abschalten, auch nachträglich jederzeit.

## 2. Zielgruppe & Grundidee

- Freundesgruppen von ca. 3–20 Personen.
- Eine Gruppe entspricht einem Anlass („Hurricane 2026", „Skiwochenende",
  „Papas 60.") oder einer dauerhaften Runde („Stammtisch").
- Beitritt unkompliziert per Einladungslink/-code, ohne Zwang zur
  Registrierung (wie bei Flunkpanion: erst mal nur Name wählen).
- Mobile-first: Die App wird unterwegs und nebenbei benutzt.

## 3. Module (einzeln aktivierbar)

Jedes Modul ist in sich abgeschlossen und kann pro Gruppe an-/abgeschaltet
werden. Deaktivieren blendet nur aus, löscht keine Daten – beim
Reaktivieren ist alles wieder da.

### 3.1 Kalender 📅
- Gemeinsamer Gruppenkalender mit Terminen (Titel, Datum/Zeit, Ort, Notiz).
- Terminfindung: Vorschläge mit Verfügbarkeits-Abstimmung
  (Ja / Nein / Vielleicht), Bestätigung durch Organisator:in.
- Erinnerungen (später, siehe Roadmap).

### 3.2 Umfragen 🗳️
- Schnelle Abstimmungen mit freien Optionen („Welches Festival?",
  „Auto oder Zug?").
- Einfach- oder Mehrfachauswahl, optional anonym.
- Deadline optional; Ergebnis live sichtbar.

### 3.3 Listen 📝
- Beliebig viele Listen pro Gruppe: Einkaufsliste, Packliste, To-dos.
- Einträge mit Menge, Zuständigkeit („bringt Alex mit") und Abhaken.
- Vorlagen je Paket (z. B. Festival-Packliste als Startpunkt).

### 3.4 Finanzen 💰
- Ausgaben eintragen: Wer hat wie viel wofür bezahlt, für wen.
- Automatische Saldenrechnung („Wer schuldet wem wie viel?") mit
  minimalen Ausgleichszahlungen (à la Splitwise).
- Ausgleich als „beglichen" markierbar; Verlauf bleibt nachvollziehbar.

### Später denkbare Module (nicht im MVP)
- 📍 Ort/Karte (Treffpunkte, geteilte Standorte)
- 📷 Foto-Album der Gruppe
- 💬 Chat / Pinnwand
- 🚗 Fahrgemeinschaften

## 4. Pakete (Vorlagen je Anlass)

Ein Paket ist **nur eine Vorauswahl** von Modulen plus passender Vorlagen
(z. B. Listen-Templates). Bei der Gruppenerstellung wählt man ein Paket,
sieht sofort, welche Module es enthält, und kann jedes einzelne Häkchen
noch umlegen. Auch nach der Erstellung sind Module jederzeit in den
Gruppeneinstellungen änderbar.

| Paket | Kalender | Umfragen | Listen | Finanzen | Besonderheit |
|---|---|---|---|---|---|
| 🎪 Festival | – | ✓ | ✓ | ✓ | Termin steht fest → kein Kalender; Packlisten-Vorlage |
| 🏔️ Wochenendtrip | ✓ | ✓ | ✓ | ✓ | Terminfindung im Fokus |
| 🎂 Geburtstag/Feier | ✓ | ✓ | ✓ | ✓ | Einkaufslisten-Vorlage, Aufgabenverteilung |
| 🍻 Stammtisch | ✓ | ✓ | – | ✓ | Wiederkehrende Termine |
| 🏖️ Urlaub | ✓ | ✓ | ✓ | ✓ | Alles an, Packlisten-Vorlage |
| ⚙️ Individuell | frei | frei | frei | frei | Leere Auswahl, alles manuell |

Pakete sind als Daten definiert (keine Sonderlogik im Code), damit neue
Anlässe leicht ergänzt werden können.

## 5. Nutzerfluss

1. **Gruppe erstellen** → Name der Gruppe eingeben.
2. **Paket wählen** → Karte je Anlass mit Kurzbeschreibung.
3. **Module feinjustieren** → Toggle-Liste, vorbelegt durch das Paket.
4. **Freunde einladen** → Link/QR-Code teilen.
5. **Loslegen** → Dashboard zeigt nur die aktiven Module als Tabs/Karten.
6. **Nachträglich anpassen** → Gruppeneinstellungen: Module an/aus,
   Paket-Vorlagen nachladen.

## 6. Technik

Bewährter Stack aus Flunkpanion, damit Wissen und Code wiederverwendbar sind:

- **Frontend:** Vite + React + TypeScript, mobile-first.
- **Sync/Backend:** Supabase (Postgres + Realtime); ohne konfigurierten
  Server lokaler Modus (localStorage) für Demos.
- **Hosting:** Vercel.
- **Sprache:** UI, Kommentare und Commits auf Deutsch.

### Datenmodell (Skizze)

```
Gruppe      id, name, paket, erstellt_am
            module: { kalender: bool, umfragen: bool, listen: bool, finanzen: bool }
Mitglied    id, gruppe_id, name, (optional user_id)
Termin      id, gruppe_id, titel, start, ende?, ort?, status (vorschlag|fix)
TerminVote  termin_id, mitglied_id, antwort (ja|nein|vielleicht)
Umfrage     id, gruppe_id, frage, mehrfach: bool, anonym: bool, deadline?
Option      id, umfrage_id, text
Stimme      option_id, mitglied_id
Liste       id, gruppe_id, name, typ (einkauf|packen|todo)
Eintrag     id, liste_id, text, menge?, zustaendig?, erledigt: bool
Ausgabe     id, gruppe_id, zahler_id, betrag, beschreibung, beteiligte: [mitglied_id]
Ausgleich   id, gruppe_id, von_id, an_id, betrag, beglichen_am
```

Modul-Aktivierung ist ein simples Flag-Objekt an der Gruppe → Deaktivieren
ist nicht-destruktiv.

## 7. Roadmap

- **M0 – Plan & Mockup (dieser Stand):** Konzept, klickbares HTML-Mockup.
- **M1 – Grundgerüst:** Neues Repo, Projekt-Setup, Gruppe erstellen/beitreten,
  Paketauswahl + Modul-Toggles (nur lokal, ohne Backend).
- **M2 – Module MVP:** Listen und Finanzen (größter Alltagsnutzen),
  dann Umfragen, dann Kalender.
- **M3 – Live-Sync:** Supabase-Anbindung, Einladungslinks, Realtime.
- **M4 – Politur:** Paket-Vorlagen (Packlisten etc.), PWA/Homescreen,
  Erinnerungen, Dark Mode.

## 8. Offene Fragen

- Eigenes Repo: Name? (Vorschlag: `tripanion`) – muss vom Maintainer
  angelegt bzw. für die Claude-Session freigeschaltet werden.
- Accounts: Reicht dauerhaft der Flunkpanion-Ansatz (Name + Link) oder
  braucht Finanzen echte Accounts (Wiedererkennung über Geräte hinweg)?
- Währung/Format: Nur EUR oder konfigurierbar?
- Push-Benachrichtigungen: Web-Push im MVP oder später?
