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
- **Challenges** (Tab „Challenge“): Gegner-Team wählen, Challenge auslosen,
  Gewinner angeben — der bekommt automatisch eine **Live-Nachricht** und als
  Belohnung eine **Aktionskarte** oder **Kronkorken**
- **Verlauf** aller KK-Buchungen pro Team, mit Undo
- **Decks & Karten** frei anpassen (Tab „Tabellen“)

Standardmäßig werden alle Daten lokal im Browser gespeichert (`localStorage`) —
kein Server, kein Login nötig. Optional lässt sich ein **Live-Modus** aktivieren,
in dem alle Geräte per **Spiel-Code** denselben Spielstand in Echtzeit teilen
(siehe unten).

## Live-Modus / Server (optional)

Damit mehrere Handys am Tisch **dasselbe Spiel live** sehen (KK-Buchungen,
Challenges, Nachrichten erscheinen sofort überall), nutzt die App
[Supabase](https://supabase.com) — kostenlos in eurer Größenordnung.

**Einrichten (einmalig):**

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen.
2. Im Supabase-Dashboard den **SQL Editor** öffnen, den Inhalt von
   [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
3. Unter **Project Settings → API** die „Project URL“ und den „anon public“ Key
   kopieren.
4. `.env.example` zu `.env` kopieren und die zwei Werte eintragen:

   ```bash
   cp .env.example .env
   # VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY ausfüllen
   ```

5. App neu starten. Oben erscheint jetzt eine Verbindungsleiste.

**So spielt ihr live:**

- Ein Gerät tippt **„Spiel erstellen“** → bekommt einen kurzen Code (z. B. `7Q2X`).
- Alle anderen tippen **„Beitreten“** und geben den Code ein.
- Ab jetzt synchronisiert sich alles live. Jedes Gerät wählt sein eigenes Team
  im Tab „Mein Team“.

> Ohne `.env`-Werte läuft die App unverändert im lokalen Offline-Modus.

**Kosten:** Für ein paar Spieler am Tisch bleibt alles im kostenlosen Tarif von
Supabase und des Frontend-Hostings (z. B. Vercel/Netlify/Cloudflare Pages).

### Online stellen (Vercel)

Damit alle am Tisch die App über eine feste URL erreichen:

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto anmelden und dieses
   Repository importieren. Vite wird automatisch erkannt (`vercel.json` liegt bei).
2. Im Vercel-Projekt unter **Settings → Environment Variables** die beiden
   Supabase-Werte hinterlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deploy** klicken → ihr bekommt eine URL wie `flunk.vercel.app`.

Nach jedem Push auf den Branch deployt Vercel automatisch neu.

> Alternativ funktionieren Netlify oder Cloudflare Pages genauso — Build-Befehl
> `npm run build`, Ausgabeordner `dist`, dieselben zwei Environment-Variablen.

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
- Optionaler Live-Sync über [Supabase](https://supabase.com) (Postgres + Realtime)

## Roadmap-Ideen

- Login / echte Nutzerkonten (aktuell reicht der Spiel-Code)
- Automatisches Aufräumen alter Spiele
- Native App via Capacitor (aus derselben Codebasis)
