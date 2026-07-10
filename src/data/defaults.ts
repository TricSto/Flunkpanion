import type { AppState, Card, Deck, DeckType } from '../types'
import { defaultBoard } from './board'

export const TEAM_COLORS = [
  '#ef4444', // rot
  '#f59e0b', // orange
  '#eab308', // gelb
  '#22c55e', // grün
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // violett
  '#ec4899', // pink
]

// Kleiner Helfer, damit die Deck-Definitionen unten kompakt bleiben.
let counter = 0
function c(
  title: string,
  detail = '',
  amount: number | null = null,
  extra: Partial<Card> = {},
): Card {
  counter += 1
  return { id: `c${counter}`, title, detail, amount, ...extra }
}

function deck(
  id: string,
  name: string,
  icon: string,
  type: DeckType,
  mode: 'roll' | 'draw',
  cards: Card[],
): Deck {
  return { id, name, icon, type, mode, cards }
}

// --- Berufe – nur Beruf & Effekt, Gehalt separat -----------------------------
const berufe = deck('berufe', 'Berufe', '💼', 'job', 'roll', [
  c('Braumeister (Diplom)', '1× 0,3 im Team pro Flunk'),
  c('Bier Sommelier (Diplom)', '1× Schluck (wirklich klein)'),
  c('Flunkologe (Diplom)', 'Immer erster Wurf Advantage'),
  c('Flunk Consultant (Diplom)', 'Darf 1 Aktionskarte pro Runde ziehen'),
  c('Dr. Flunk (Diplom)', 'Kronkorkenregel → Gegner alle Bier rein, wenn fertig'),
  c('Flunkierer (Diplom)', 'Darf links & rechts je einen Spieler positionieren'),
  c('Hartz-Bier-Empfänger', 'Darf chillen'),
  c('Bierwart', 'Verantwortlich für Bierholung'),
  c('Pfandsammler', 'Verantwortlich für Flaschen sammeln'),
  c('Flaschenöffner', 'Verantwortlich für Bieröffnung'),
  c('Etikettknibbler', 'Verantwortlich für Bieranknibblung'),
  c('Streit-Bier-chter', 'Sorgt für Aufmerksamkeit & Ruhe bei Erklärungen/Diskussionen'),
])

// --- Gehalt – wird separat vom Beruf gewürfelt (BS = Biersteuer) -------------
const gehalt = deck('gehalt', 'Gehalt', '💶', 'salary', 'roll', [
  c('Gehalt', '', null, { salary: 10, beerTax: 5 }),
  c('Gehalt', '', null, { salary: 12, beerTax: 6 }),
  c('Gehalt', '', null, { salary: 14, beerTax: 7 }),
  c('Gehalt', '', null, { salary: 14, beerTax: 7 }),
  c('Gehalt', '', null, { salary: 16, beerTax: 8 }),
  c('Gehalt', '', null, { salary: 16, beerTax: 8 }),
  c('Gehalt', '', null, { salary: 18, beerTax: 9 }),
  c('Gehalt', '', null, { salary: 20, beerTax: 10 }),
])

// --- Aktionskarten -----------------------------------------------------------
const aktionskarten = deck('aktionskarten', 'Aktionskarten', '🃏', 'action', 'draw', [
  c('Wurfvorteil', '1 Spieler hat doppelte Würfe.'),
  c('Bier-Segen', 'Ein 0,3 statt 0,5.'),
  c('Wurfjoker', 'Wurf von einem anderen Team.'),
  c('Aus dem Bierfängnis frei', '1× kein Strafbier.'),
  c('Trinkjoker', 'Kriegt bei Sieg 5 KK.', 5),
  c('Fluchsche', '1 Spieler muss zwei Flaschen treffen.'),
  c('Counterspell', 'Negiert einen beliebigen Effekt.'),
  c('Fluch der Schwäche', '1 Spieler wirft nur mit schwachem Arm.'),
  c('Spiegel', 'Effekt zurückwerfen.'),
  c('KK-Fluch', 'Team startet mit geschlossenen Bieren.'),
  c('Bier-Fluch', '1× extra Bier.'),
  c('Taifun-Fluch', 'Nach dem Aufstellen einmal um die Flasche rum.'),
  c('Schwindel-Fluch', 'Team dreht sich um (nicht der Werfer).'),
  c('Fluch der Ferne', '1 Schritt weiter weg.'),
  c('Sticky-Fluch (Variante 1)', 'Linker Arm, rechtes Bein tapen.'),
  c('Sticky-Fluch (Variante 2)', 'Rechtes Bein, linkes Bein tapen.'),
  c('Sticky-Fluch (Variante 3)', 'Rechter Arm, rechter Arm tapen.'),
  c('Sticky-Fluch (Variante 4)', 'Linkes Bein, rechter Arm tapen.'),
  c('Hindernis hinzufügen', 'Eigene Teammitglieder erlaubt (darf nicht aufstellen/laufen).'),
  c('Segen der Nähe', '1 Schritt näher ran.'),
  c('Fluch des Aussetzens', '1 Spieler darf nicht werfen.'),
  c('Fluch der Faulen', '1 Spieler darf nicht laufen.'),
  c('Fluch des Blinden', '1 Spieler ist blind.'),
])

// --- Game-Changer-Karten (jeder Spieler muss einmal so werfen) ---------------
const spielveraendernd = deck(
  'spielveraendernd',
  'Game-Changer-Karten',
  '⚡',
  'special',
  'draw',
  [
    c('Nur mit Füßen', 'Ball nur mit den Füßen berühren.'),
    c('T-Rex', 'Mit angelegten Armen werfen.'),
    c('Flunk – don’t touch the Flasche', 'Flasche nicht berühren.'),
    c('Doppelflunken', 'Beide müssen treffen.'),
    c('Würfelflunken', 'Mit Binden werfen.'),
    c('Irgendwas anderes werfen', 'Anderer Wurfgegenstand.'),
    c('Miniflunken', 'Kleinen Gegenstand umwerfen/reinwerfen.'),
    c('Schnick-Schnack-Schnunken', 'Schere-Stein-Papier-Variante.'),
    c('Reverse Flunken', 'Wir werfen die Flasche auf den Ball.'),
    c('Cornhole Flunken', 'Cornhole-Variante.'),
  ],
)

// --- Challenges --------------------------------------------------------------
const challenges = deck('challenges', 'Challenges', '🎯', 'challenge', 'draw', [
  c('Mini-Bierpong', '1 Becher.'),
  c('Armdrücken / Daumenwrestling', '1 gegen 1.'),
  c('Schluckmeister', 'Wettexen.'),
  c('Melodie-Gurgel-Raten', 'Melodie erraten.'),
  c('Bottleflip', 'Flasche flippen.'),
  c('Pferderennen', 'Gambling.'),
  c('Mini-Fangen', '1 gegen 1.'),
  c('Flasche verstecken', 'Gegner müssen sie finden.'),
  c('Seifenblasen blasen', 'Größere, 2 Teams VS.'),
  c('Tischtennis hochhalten', '2 Teams VS.'),
])

// --- Ereigniskarten ----------------------------------------------------------
const ereignisse = deck('ereignisse', 'Ereigniskarten', '🎲', 'event', 'draw', [
  c('Kranker Hund', 'Dein Hund hat eine Alkoholvergiftung. Behandlung zahlen.', -4),
  c('Wildes Bier', 'Ein wildes Bier erscheint. Exe es, bevor es deine KK stiehlt – sonst -10 KK.', -10),
  c('Beerpongbar-König', 'Am Mittwoch 1. in der Beerpongbar geworden.', 8),
  c('Elektrolyte', 'Du kaufst Elektrolyte.', -2),
  c('Verlaufen', 'Auf dem Heimweg verlaufen – Uber bezahlen.', -4),
  c('Geschummelt', 'Bei der letzten Flunkrunde geschummelt.', -2),
  c('Wer das liest ist doof', 'Selbsterklärend.', -2),
  c('Zu viele Festivals', 'Leberzirrose behandeln lassen.', -5),
  c('Falsches Bier', 'Beim letzten Einkauf alkoholfreies Bier gekauft.', -8),
  c('Zu freundlich', 'Zu Mutter/Vater deines Freundes zu freundlich. Erhalte Backpfeife.', -4),
  c('Leeres Haus besetzt', 'Zwei Monate Miete gespart.', 6),
  c('Ladendiebstahl', 'Du klaust deine Lebensmittel im Supermarkt.', 2),
  c('Erwischt', 'Beim Klauen im Supermarkt erwischt.', -2),
  c('Dieselbe Unterhose', 'Seit drei Wochen dieselbe Unterhose.', 2),
  c('U got lamp, brøther', '', 4),
  c('Buchstabierwettbewerb', 'Zweiter Platz. Dein Wort war „Korifäe“.', 2),
  c('Kronkorken gefunden', 'Auf dem Boden gefunden.', 2),
  c('Böhler geplündert', 'Die Kronkorkensammlung bei Böhler geplündert.', 10),
  c('Harry-Potter-Quiz', 'Erster geworden.', 4),
  c('Schwarzfahren', 'Du fährst schwarz in der Eisenbahn.', 2),
  c('Verwechslung', 'Flensburger mit Krombacher verwechselt.', -10),
  c('Schwarzfahren erwischt', 'Beim Schwarzfahren erwischt.', -4),
  c('Nat 20', 'Du wirfst eine Nat20.', 6),
  c('Nat 1', 'Du wirfst eine Nat1.', -4),
  c('Nur Dosen', 'Es gab nur Dosen.', -2),
  c('Bewerbungsgespräch', 'Du scheißt dich auf dem Weg dorthin ein.', -2),
  c('Kronkorken vergessen', 'Die geklauten Kronkorken bei Böhler auf der Fensterbank liegen gelassen.', -6),
  c('Kronkorkenmonster', 'Würfle eine 8 oder höher – sonst -6 KK.', null),
  c('Die Lichtung', 'Deine Mutter wartet am Flughafen. Die Vampire haben gewonnen.', -4),
  c('Mayonnaise', 'Mayonnaise ist doch ein Instrument.', 6),
  c('Gürtel verloren', 'Dein/e beste/r Freund/in hat den Gürtel vor dir verdient.', -4),
  c('Aus Köln', 'Du kommst aus Köln.', -10),
  c('Kompliment für Marlon', 'Mache Marlon ein Kompliment, dann kassiere.', 2),
  c('FdL feiern', 'Zeigt, wie sehr ihr FdL feiert, dann kassiert.', 6),
  c('League of Legends', 'Ein Jahr verschwendet. Aussetzen.', -1),
  c('E-Roller', 'Betrunken erwischt. Aussetzen.', -2),
  c('Bierdurstige Zombies', 'Verstecke dein Kaltgetränk bei „Flunk, wo ist die Flasche?“.', null),
  c('Gehaltserhöhung', '+1 KK dauerhaft auf das Gehalt – bleibt auch beim Neuwürfeln.', null),
  c('Hund verloren', 'Streichle einen Mitspieler, den du vor heute nicht kanntest.', null),
  c('Du stinkst', '', null),
  c('Pipikakiland', 'Lasse Pipi und Kaki im Pipikakiland anmachen.', null),
])

const defaultDecks: Deck[] = [
  berufe,
  gehalt,
  aktionskarten,
  spielveraendernd,
  challenges,
  ereignisse,
]

// Bei jeder inhaltlichen Aktualisierung der mitgelieferten Decks erhöhen –
// dann übernehmen bestehende Geräte die neuen Karten (Teams bleiben erhalten).
export const DECKS_VERSION = 4

export const initialState: AppState = {
  teams: [],
  decks: defaultDecks,
  currentTeamId: null,
  decksVersion: DECKS_VERSION,
  challenge: null,
  flunk: null,
  announcements: [],
  feedback: [],
  board: defaultBoard(),
  fieldColors: {},
}
