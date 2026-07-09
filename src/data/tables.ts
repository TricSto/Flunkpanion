// Die beiden Tabellen, die mit auf das Spielbrett gedruckt werden.
// Kingstabelle: am Brett würfeln, Ergebnis = Zeile. Minigames: direkt am
// Brett auswählen/erwürfeln, welches Minigame gespielt wird.

export interface TableRow {
  /** Nummer in der Tabelle (Würfelergebnis bzw. laufende Nummer). */
  n: number
  text: string
}

export const KINGSTABELLE: TableRow[] = [
  { n: 1, text: '1 Runde aussetzen' },
  { n: 2, text: '2 Felder vor' },
  { n: 3, text: '3 Felder zurück' },
  { n: 4, text: '4 is Floor' },
  { n: 5, text: 'Rhyme' },
  { n: 6, text: 'Regel' },
  { n: 7, text: '7 is Heaven' },
  { n: 8, text: 'Wikingerkönig' },
]

export const MINIGAMES: TableRow[] = [
  { n: 1, text: 'Boden ist Lava' },
  { n: 2, text: 'Pantomime' },
  { n: 3, text: 'Erste Menschenpyramide gewinnt' },
  { n: 4, text: 'Erster gesungener Kanon' },
  { n: 5, text: 'Erster Schuh über 20 m geworfen' },
  { n: 6, text: 'Dampferkollision' },
  { n: 7, text: 'Ball hochhalten – meiste Kicks gewinnen' },
  { n: 8, text: 'Erstes Team, das ein frisches Bier ext' },
  { n: 9, text: 'Erstes Team, das ohne Hände ein frisches Bier leert' },
  { n: 10, text: 'Erstes Team, das die Flasche umwirft' },
  { n: 11, text: '1 Minute: höchster Turm aus Dosen/Flaschen' },
  { n: 12, text: 'Erstes Team, bei dem einer unter allen Beinen durch ist' },
]
