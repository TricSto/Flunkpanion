import type { AppState, Card, Deck, DeckType } from '../types'

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

// --- Berufe (D8-Tabelle) – Gehalt & Biersteuer aus dem Sheet -----------------
const berufe = deck('berufe', 'Berufe', '💼', 'job', 'roll', [
  c('Braumeister (Diplom)', '1× 0,3 im Team pro Flunk', null, { salary: 10, beerTax: 5 }),
  c('Bier Sommelier (Diplom)', '1× kleiner Schluck', null, { salary: 12, beerTax: 6 }),
  c('Flunkologe (Diplom)', 'Erster Wurf immer Advantage', null, { salary: 14, beerTax: 7 }),
  c('Flunk Consultant (Diplom)', 'Darf 1 Aktionskarte pro Runde ziehen', null, { salary: 14, beerTax: 7 }),
  c('Dr. Flunk (Diplom)', 'Kronkorkenregel: Gegner trinken aus, wenn fertig', null, { salary: 16, beerTax: 8 }),
  c('Flunkierer (Diplom)', 'Darf links & rechts je einen Spieler positionieren', null, { salary: 16, beerTax: 8 }),
  c('Hartz-Bier-Empfänger', 'Darf chillen', null, { salary: 18, beerTax: 9 }),
  c('Bierwart', 'Verantwortlich für Bierholung', null, { salary: 20, beerTax: 10 }),
])

// --- Ereigniskarten ----------------------------------------------------------
const ereignisse = deck('ereignisse', 'Ereigniskarten', '🎲', 'event', 'draw', [
  c('Wildes Bier', 'Ein wildes Bier erscheint. Exe es, bevor es deine KK stiehlt – sonst -5 KK.', -5),
  c('Beerpongbar-König', 'Mittwochs 1. in der Beerpongbar geworden.', 3),
  c('Verlaufen', 'Auf dem Heimweg verlaufen – Uber bezahlen.', -2),
  c('Kranker Hund', 'Dein Hund hat eine Alkoholvergiftung. Behandlung zahlen.', -2),
  c('Elektrolyte', 'Du kaufst Elektrolyte.', -1),
  c('Geschummelt', 'Bei der letzten Flunkrunde geschummelt.', -1),
  c('Wer das liest ist doof', 'Selbsterklärend.', -1),
  c('Zu viele Festivals', 'Leberzirrose behandeln lassen.', -2),
  c('Falsches Bier', 'Alkoholfreies Bier gekauft.', -3),
  c('League of Legends', 'Ein Jahr verschwendet. Aussetzen.', -1),
  c('E-Roller', 'Betrunken erwischt. Aussetzen und zahlen.', -1),
  c('Verlorener Hund', 'Streichle einen Mitspieler, den du vorher nicht kanntest.', 0),
  c('Aktien-Boom', '+1 Aktie.', null),
  c('Aktien-Crash', '-1 Aktie.', null),
  c('Lottogewinn', 'Im Lotto gewonnen (war nicht viel drin).', 1),
])

// --- Bonus-Aktionskarten -----------------------------------------------------
const bonus = deck('bonus', 'Bonus-Aktionskarten', '🃏', 'action', 'draw', [
  c('Wurfvorteil', '1 Spieler hat doppelte Würfe.'),
  c('Wurfjoker', 'Wurf von einem anderen Team.'),
  c('Trinkjoker', 'Kriegt bei Sieg 5 KK.', 5),
  c('Bier-Segen', 'Ein 0,3 statt 0,5.'),
  c('Aus dem Bierfängnis frei', '1× kein Strafbier.'),
  c('Fluchsche', '1 Spieler muss zwei Flaschen treffen.'),
  c('Counterspell', 'Negiert einen beliebigen Effekt.'),
  c('Fluch der Schwäche', '1 Spieler wirft nur mit schwachem Arm.'),
  c('Würfel-Segen', '1× d12 würfeln.'),
  c('Gehaltserhöhung', '+1 KK pro Lohn.'),
])

// --- Spielverändernde Aktionskarten -----------------------------------------
const special = deck('special', 'Spielverändernde Karten', '⚡', 'special', 'draw', [
  c('Doppelflunken', 'Beide müssen treffen.'),
  c('Miniflunken', 'Kleinen Gegenstand umwerfen / reinwerfen.'),
  c('Würfelflunken', 'Mit Binden werfen.'),
  c('Reverse Flunken', 'Wir werfen die Flasche auf den Ball.'),
  c('Cornhole Flunken', 'Cornhole-Variante.'),
  c('Schnick-Schnack-Schnunken', 'Schere-Stein-Papier-Variante.'),
  c('Flasche verstecken', 'Gegner müssen die Flasche finden.'),
  c('Sticky-Fluch', 'Arme/Beine werden zusammengetapet.'),
  c('Taifun-Fluch', 'Nach dem Aufstellen einmal um die Flasche drehen.'),
  c('Fluch der Ferne', '1 Schritt weiter weg werfen.'),
  c('Segen der Nähe', '1 Schritt näher ran.'),
  c('Fluch des Blinden', '1 Spieler wirft blind.'),
  c('Fluch des Faulen', '1 Spieler darf nicht laufen.'),
  c('Fluch des Aussetzens', '1 Spieler darf nicht werfen.'),
  c('Schwindel-Fluch', 'Team dreht sich um (nicht der Werfer).'),
])

// --- Challenges (Belohnung in KK) -------------------------------------------
const challenges = deck('challenges', 'Challenges', '🎯', 'challenge', 'draw', [
  c('Armdrücken / Daumenwrestling', '1 gegen 1.', 5),
  c('Bottleflip', '3 Versuche.', 3),
  c('Pferderennen', 'Gambling – Einsatz ×2 (max 10).', null),
  c('Mini-Bierpong', '1 Becher.', null),
  c('Melodie-Gurgel-Raten', 'Melodie in 1 Minute.', 3),
  c('Seifenblasen blasen', 'Größere, 2 Teams VS.', 5),
  c('Tischtennis hochhalten', '2 Teams VS.', 5),
  c('Boccia', 'Wer am nächsten liegt.', null),
  c('Mini-Fangen', '1 gegen 1.', null),
  c('Turmbau', '1 Minute höchster Turm aus Dosen/Flaschen.', null),
])

// --- Lebensstil --------------------------------------------------------------
const lebensstil = deck('lebensstil', 'Lebensstil', '🏠', 'lifestyle', 'draw', [
  c('Im Lotto gewonnen', ''),
  c('Zwei-Zimmer-Wohnung', ''),
  c('Rich geheiratet', ''),
  c('Ohne Kinder', ''),
  c('Master in LoL', ''),
  c('Mit Zeltnachbar angefreundet', ''),
  c('Gürtel verdient', ''),
])

// --- Equipment ---------------------------------------------------------------
const equipment = deck('equipment', 'Equipment', '🎒', 'equipment', 'draw', [
  c('Tape', ''),
  c('Zweite Flasche + Ball', ''),
  c('Würfelset', ''),
  c('2 Bälle', ''),
  c('Bollerwagen', ''),
  c('Zwei verschiedene Abwurfflaschen', ''),
])

const defaultDecks: Deck[] = [
  berufe,
  ereignisse,
  bonus,
  special,
  challenges,
  lebensstil,
  equipment,
]

export const initialState: AppState = {
  teams: [],
  decks: defaultDecks,
}
