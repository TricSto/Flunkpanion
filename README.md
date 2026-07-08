# Flunk des Lebens 🎲

Companion-App für das Brettspiel **Flunk des Lebens** (Spiel des Lebens meets Funkyball).

Währung im Spiel: **KK = Kronkorken**.

Die App hilft euch beim Tracken während des Spiels:

- **Teams** anlegen und verwalten
- **Kronkorken (KK)** pro Team buchen (Ein- und Auszahlungen, Schnellbeträge)
- **Beruf, Gehalt & Biersteuer (BS)** setzen; Gehalt und Biersteuer per Klick buchen
- **Aktionskarten** pro Team sammeln
- **Besitz / Equipment** mit Wert erfassen → automatische Vermögensberechnung
- **Würfeln / Ziehen** aus mehreren Decks mit euren echten Spielinhalten:
  Berufe (D8), Ereigniskarten, Bonus-Aktionskarten, Spielverändernde Karten,
  Challenges, Lebensstil, Equipment. Ergebnisse lassen sich direkt einem Team
  zuweisen (Job setzen, KK buchen, als Aktionskarte/Besitz übernehmen)
- **Verlauf** aller KK-Buchungen pro Team, mit Undo
- **Decks & Karten** frei anpassen (Tab „Tabellen“)

Alle Daten werden lokal im Browser gespeichert (`localStorage`) — kein Server, kein Login nötig.

## Als Handy-App nutzen (PWA)

Die App ist eine Progressive Web App. Auf dem Handy:

1. Seite im Browser öffnen
2. „Zum Startbildschirm hinzufügen"
3. Läuft dann wie eine normale App im Vollbild

## Entwicklung

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server starten (http://localhost:5173)
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Tech-Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- State via React Context + `localStorage`
- Keine Backend-Abhängigkeiten (bewusst — MVP)

## Roadmap-Ideen

- Backend + Login, damit mehrere Geräte dasselbe Spiel sehen (echtes Team-Sharing)
- Verlauf / Historie der Transaktionen
- Native App via Capacitor (aus derselben Codebasis)
