# Flunkpanion 🎲

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
2. Datenbank einrichten — zwei Wege:
   - **Automatisch (empfohlen):** über die CI-Pipeline, siehe
     [Automatisiertes Deployment](#automatisiertes-deployment-cicd) weiter unten.
   - **Manuell:** im **SQL Editor** den Inhalt der neuesten Migration unter
     [`supabase/migrations/`](supabase/migrations/) einfügen und ausführen.
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

## Automatisiertes Deployment (CI/CD)

Nach einmaliger Einrichtung passiert bei jedem Merge nach `main` alles von selbst:

| Was | Wodurch | Auslöser |
|---|---|---|
| **Frontend deployen** | Vercels Git-Integration | jeder Push auf `main` |
| **DB-Migrationen anwenden** | GitHub Action `Supabase Migrationen` | Push auf `main`, der `supabase/migrations/**` ändert |
| **Build/Typen prüfen** | GitHub Action `CI` | jeder Push & Pull Request |

**Einmalige Einrichtung — GitHub Secrets** (Repo → **Settings → Secrets and
variables → Actions → New repository secret**):

| Secret | Wo herbekommen |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → „Generate new token“ |
| `SUPABASE_DB_PASSWORD` | Das Datenbank-Passwort, das beim Anlegen des Projekts gesetzt wurde (bei Bedarf unter **Project Settings → Database → Reset database password** neu setzen) |

Die Projekt-Reference-ID steht offen in [`supabase/config.toml`](supabase/config.toml)
und in der Workflow-Datei — kein Geheimnis.

**Vercel** deployt bereits automatisch über seine GitHub-Integration; als
Production Branch `main` wählen. (Die beiden `VITE_SUPABASE_*`-Variablen dort
wie oben beschrieben setzen.)

**Neue DB-Änderung ausrollen:** einfach eine neue Datei
`supabase/migrations/<zeitstempel>_beschreibung.sql` hinzufügen und mergen — die
Action wendet sie an. Migrationen sind idempotent zu halten (`create ... if not
exists`, `drop policy if exists ...`), damit erneutes Ausführen gefahrlos ist.

## Als Handy-App nutzen (PWA)

Die App ist eine Progressive Web App. Auf dem Handy:

1. Seite im Browser öffnen
2. „Zum Startbildschirm hinzufügen"
3. Läuft dann wie eine normale App im Vollbild

## Altes Spielbrett

Unter [`docs/altes-spielbrett.pdf`](docs/altes-spielbrett.pdf) liegt das
Original-Spielbrett von „Flunk des Lebens“. **Hinweis:** Das PDF besteht
aus 4 DIN-A4-Seiten, die zusammengelegt eine große DIN-A2-Seite ergeben
(2 × 2 Raster). Von dort stammt auch das FdL-Logo der App
(`public/logo-fdl.png`, neben dem Ausbildungs-Start auf dem Brett).

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
