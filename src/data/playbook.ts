// Das „Flunk-Playbook" – angelehnt an Barney Stinsons Playbook aus
// How I Met Your Mother. Jede Variante ist ein „Flunk" mit Titel,
// erklärender Beschreibung, benötigtem Equipment und einer Kategorie
// (nach Equipment/Thema gruppiert).
//
// Stand: erste Beschreibungs-Entwürfe. Für einige Varianten stammen die
// Regeln direkt aus den Erklärungen (z. B. Flunkiball Standard, Speerwurf,
// Bollerflunken, Ringen, Königsflunken, „Flunk, wo ist die Flasche?");
// der Rest ist ein plausibler Entwurf, den wir noch gemeinsam anpassen.

/** Ausarbeitungsstand einer Variante. */
export type PlaybookStatus = 'fertig' | 'in-arbeit' | 'idee'

/** Kategorie-Schlüssel (Gruppierung nach Equipment/Thema). */
export type PlaybookCategoryKey =
  | 'klassik'
  | 'wurf'
  | 'praezision'
  | 'koerper'
  | 'gross'
  | 'kopf'
  | 'unklar'

export interface PlaybookCategory {
  key: PlaybookCategoryKey
  label: string
  icon: string
}

/** Reihenfolge & Beschriftung der Kategorien (auch für die Filter-Chips). */
export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  { key: 'klassik', label: 'Klassiker', icon: '🍾' },
  { key: 'wurf', label: 'Andere Wurfgeschosse', icon: '🎯' },
  { key: 'praezision', label: 'Präzision & Aufbauten', icon: '🎳' },
  { key: 'koerper', label: 'Körper & Bewegung', icon: '🤸' },
  { key: 'gross', label: 'Bollerwagen & Groß', icon: '🛒' },
  { key: 'kopf', label: 'Köpfchen & Gruppe', icon: '🧠' },
  { key: 'unklar', label: 'Wissen zwar nicht wie, aber klingt geil', icon: '✨' },
]

export function categoryOf(key: PlaybookCategoryKey): PlaybookCategory {
  return PLAYBOOK_CATEGORIES.find((c) => c.key === key) ?? PLAYBOOK_CATEGORIES[0]
}

export interface PlaybookPlay {
  id: string
  /** Name des Flunks. */
  title: string
  /** Erklärende Beschreibung (erklärt den Spielablauf). */
  description: string
  /** Benötigtes Equipment (Kurzliste). */
  equipment: string[]
  /** Kategorie (nach Equipment/Thema). */
  category: PlaybookCategoryKey
  /** Ausarbeitungsstand. */
  status: PlaybookStatus
}

/** Titel des Playbooks (steht als „Buchtitel" auf jedem Blatt). */
export const PLAYBOOK_TITLE = '25 Wege sich die Lichter auszuknipsen'

/**
 * Alle bekannten Flunk-Varianten. Reihenfolge egal – gezogen wird zufällig,
 * optional gefiltert nach Kategorie.
 */
export const PLAYBOOK_PLAYS: PlaybookPlay[] = [
  // ---- Klassiker (Flasche + Ball) -----------------------------------------
  {
    id: 'flunkiball-standard',
    title: 'Flunkiball Standard',
    description:
      'Zwei Teams stehen sich mit fünf Schritten Abstand gegenüber, in der ' +
      'Mitte steht eine Flasche, vor jeder Person ein Getränk. Trifft dein ' +
      'Wurf die Flasche, darf dein Team trinken – so lange, bis das ' +
      'Gegnerteam die Flasche wieder aufgestellt, den Ball geholt und alle ' +
      'hinter der Linie hat und „Stopp!" ruft. Wer zuerst alle Getränke ' +
      'leer hat, gewinnt.',
    equipment: ['Flasche', 'Ball', 'Getränke'],
    category: 'klassik',
    status: 'fertig',
  },
  {
    id: 'doppelflunken-lr',
    title: 'Doppelflunken links/rechts',
    description:
      'Statt einer stehen zwei Flaschen nebeneinander in der Mitte. ' +
      'Getrunken wird nur, wenn die vorher angesagte – linke oder rechte – ' +
      'Flasche fällt. Trifft die falsche, war der Wurf umsonst. Sonst läuft ' +
      'alles wie beim Standard.',
    equipment: ['2 Flaschen', 'Ball', 'Getränke'],
    category: 'klassik',
    status: 'in-arbeit',
  },
  {
    id: 'doppelflunken-beide',
    title: 'Doppelflunken (beide treffen)',
    description:
      'Zwei Flaschen in der Mitte, aber hier zählt nur der Volltreffer: Erst ' +
      'wenn beide Flaschen liegen, darf getrunken werden. Ein Ball, zwei ' +
      'Ziele – Präzision schlägt rohe Kraft.',
    equipment: ['2 Flaschen', 'Ball', 'Getränke'],
    category: 'klassik',
    status: 'in-arbeit',
  },
  {
    id: 'kreuz-t-flunken',
    title: 'Kreuz-/T-Flunken (drei-/vierfach)',
    description:
      'Mehrere Flaschen stehen als Kreuz oder T aufgebaut (drei- oder ' +
      'vierfach). Je nachdem, welche und wie viele Flaschen fallen, wird ' +
      'unterschiedlich lange getrunken – die Aufstellung macht das Zielen ' +
      'zur Wissenschaft.',
    equipment: ['3–4 Flaschen', 'Ball', 'Getränke'],
    category: 'klassik',
    status: 'in-arbeit',
  },
  {
    id: 'miniflunken',
    title: 'Miniflunken',
    description:
      'Flunkyball im Kleinformat: Mini-Flasche, kurzer Abstand, kleiner ' +
      'Ball – perfekt für drinnen, den Balkon oder wenig Platz. Regeln wie ' +
      'beim Standard, nur alles eine Nummer kleiner.',
    equipment: ['Mini-Flasche', 'kleiner Ball', 'Getränke'],
    category: 'klassik',
    status: 'fertig',
  },
  {
    id: 'reverse-flunken',
    title: 'Reverse Flunken',
    description:
      'Alles andersherum: Nicht der Ball fliegt auf die Flasche, sondern die ' +
      'Flasche auf den Ball. Der Ball steht in der Mitte, geworfen wird mit ' +
      'der (leeren) Flasche. Sonst gelten die normalen Flunk-Regeln.',
    equipment: ['Flasche', 'Ball', 'Getränke'],
    category: 'klassik',
    status: 'idee',
  },
  {
    id: 'flunk-flunken',
    title: 'Flunk Flunken',
    description:
      'Doppelter Einsatz: Bevor du werfen darfst, kippst du einen Shot. ' +
      'Erst dann geht dein Wurf auf die Flasche – und triffst du, muss ' +
      'trotzdem noch das Flunkbier geleert werden. Trinkfest und treffsicher ' +
      'zugleich, sonst wird es ein langer Abend.',
    equipment: ['Flasche', 'Ball', 'Shots', 'Getränke'],
    category: 'klassik',
    status: 'fertig',
  },

  // ---- Andere Wurfgeschosse ------------------------------------------------
  {
    id: 'speerwurf',
    title: 'Speerwurf Flunken',
    description:
      'Statt eines Balls fliegt ein Speer – zum Beispiel zusammengeklebte ' +
      'Dosen. Beide Teams stehen auf derselben Seite und bauen sich ihren ' +
      'eigenen Dosen-Speer als Ziel. Das werfende Team trinkt; das andere ' +
      'muss schnell den näher liegenden Speer holen und hinter die Linie ' +
      'bringen, dann ist Stopp. Ansonsten normal geflunkt.',
    equipment: ['Dosen-Speer', 'Getränke'],
    category: 'wurf',
    status: 'fertig',
  },
  {
    id: 'alternativflunken',
    title: 'Alternativflunken',
    description:
      'Kein Fass, kein Ball, kein Problem: Geflunkt wird mit allem, was ' +
      'gerade rumliegt – Reifen, Schuh, was auch immer. Ziel und Wurfobjekt ' +
      'werden improvisiert, die Regeln bleiben die vom Standard. Der ' +
      'Notnagel für jede Situation.',
    equipment: ['Improvisiertes Wurfobjekt (Reifen, Schuh …)', 'Getränke'],
    category: 'wurf',
    status: 'fertig',
  },
  {
    id: 'dosenwerfen',
    title: 'Dosenwerfen Flunken',
    description:
      'Klassisches Dosenwerfen trifft Flunkyball: In der Mitte steht ein ' +
      'Turm aus Dosen. Wer ihn abräumt, darf trinken, bis das Gegnerteam den ' +
      'Turm neu gestapelt, den Ball geholt und „Stopp" gerufen hat.',
    equipment: ['Dosenturm', 'Ball', 'Getränke'],
    category: 'wurf',
    status: 'fertig',
  },
  {
    id: 'ring-werfen',
    title: 'Ringe werfen Flunken',
    description:
      'Statt zu werfen wird geringelt: Ein Wurfring muss über die Flasche ' +
      '(oder einen Stab) in der Mitte. Sitzt der Ring, darf getrunken ' +
      'werden, bis das andere Team ihn geholt und wieder hinter der Linie ' +
      'ist.',
    equipment: ['Wurfring', 'Flasche/Stab', 'Getränke'],
    category: 'wurf',
    status: 'fertig',
  },
  {
    id: 'bottleflip-flipken',
    title: 'Bottleflip Flunken („Flipken")',
    description:
      'Erst der Flip, dann der Schluck: Getrunken werden darf nur, solange ' +
      'der eigene Bottleflip noch nicht sauber gestanden hat. Beide Teams ' +
      'flippen gegeneinander – wer zuerst landet, stoppt das andere Team. ' +
      'Zittrige Hände sind hier ein echtes Handicap.',
    equipment: ['Halbvolle Flasche', 'Getränke'],
    category: 'wurf',
    status: 'in-arbeit',
  },
  {
    id: 'bola-steinschleuder',
    title: 'Bolaflunken (Steinschleuder)',
    description:
      'Mit Steinschleuder oder Bola (zwei per Schnur verbundene ' +
      'Wurfgewichte) wird das Ziel abgeräumt – Reichweite und Wucht ' +
      'inklusive. Achtung, hohes Verletzungsrisiko: nur mit viel Platz und ' +
      'Vorsicht. Sonst gelten die normalen Flunk-Regeln.',
    equipment: ['Steinschleuder oder Bola', 'Ziel', 'Getränke'],
    category: 'wurf',
    status: 'in-arbeit',
  },
  {
    id: 'katapult',
    title: 'Katapult Flunken',
    description:
      'Schwere Geschütze: Ein selbstgebautes Katapult schleudert das ' +
      'Wurfobjekt auf das Ziel. Reichweite top, Zielgenauigkeit Glückssache. ' +
      'Aufbau und Trinkregel müssen wir noch feinschleifen.',
    equipment: ['Katapult', 'Wurfobjekt', 'Getränke'],
    category: 'wurf',
    status: 'in-arbeit',
  },
  {
    id: 'ritterflunken-lanzen',
    title: 'Ritterflunken (Lanzen)',
    description:
      'Wie beim Ritterturnier: Mit einer Lanze (langer Stab) wird das Ziel ' +
      'im Anlauf aufgespießt oder umgestoßen. Anlauf, Sicherheitsabstand und ' +
      'Trinkregel arbeiten wir noch gemeinsam aus.',
    equipment: ['Lanze/Stab', 'Ziel', 'Getränke'],
    category: 'wurf',
    status: 'in-arbeit',
  },

  // ---- Präzision & Aufbauten ----------------------------------------------
  {
    id: 'flunkibowl',
    title: 'Flunkibowl (Bowling Flunken)',
    description:
      'Bowling trifft Flunk: In der Mitte steht ein Set Kegel (oder ' +
      'Flaschen). Pro Runde hast du zwei Würfe, um alles abzuräumen. ' +
      'Schaffst du den Räumer, trinkt dein Team, bis das Gegnerteam wieder ' +
      'aufgebaut hat.',
    equipment: ['Kegel/Flaschen', 'Ball', 'Getränke'],
    category: 'praezision',
    status: 'fertig',
  },
  {
    id: 'cornhole',
    title: 'Cornhole Flunken',
    description:
      'Cornhole mit Konsequenzen: Säckchen müssen aufs Zielbrett oder ins ' +
      'Loch geworfen werden. Loch = lange trinken, Brett = kurz. Getrunken ' +
      'wird, bis das andere Team seine Würfe gelandet und die Säckchen ' +
      'zurückgeholt hat.',
    equipment: ['Cornhole-Brett', 'Wurfsäckchen', 'Getränke'],
    category: 'praezision',
    status: 'fertig',
  },
  {
    id: 'wuerfelflunken',
    title: 'Würfelflunken (Binden)',
    description:
      'Der Würfel entscheidet: Vor dem Wurf kommt ein Würfel ins Spiel und ' +
      'bestimmt, wie lange getrunken wird oder wer „gebunden" wird (z. B. ' +
      'eine Hand hinter dem Rücken). Die genaue Bindungs-Mechanik müssen wir ' +
      'noch festzurren.',
    equipment: ['Würfel', 'Flasche', 'Ball', 'Getränke'],
    category: 'praezision',
    status: 'in-arbeit',
  },
  {
    id: 'flunk-aerger-dich',
    title: 'Mensch, Flunki dich nicht!',
    description:
      'Brettspiel-Flunk für 2–4 Teams: Auf einem kreisförmigen Feld mit ' +
      'mehreren Zonen werft ihr Säckchen von der Mittelscheibe (wie beim ' +
      'Bogenschießen in 1/2/3 unterteilt) und zieht so vorwärts. Landet ihr ' +
      'auf einem gegnerischen Feld, gibt es ein Strafbier und zurück zum ' +
      'Start. Aufbau und Feinregeln sind noch in Arbeit.',
    equipment: ['Rundes Spielfeld/Zonen', 'Wurfsäckchen', 'Getränke'],
    category: 'praezision',
    status: 'in-arbeit',
  },
  {
    id: 'flunk-pong',
    title: 'Flunk Pong',
    description:
      'Beer Pong im Flunk-Gewand: Bälle müssen in die gegnerischen Becher ' +
      'geworfen werden. Jeder Treffer heißt trinken – klassisch, schnell, ' +
      'immer ein Selbstläufer.',
    equipment: ['Becher', 'Tischtennisbälle', 'Getränke'],
    category: 'praezision',
    status: 'fertig',
  },
  {
    id: 'golf',
    title: 'Golf Flunken',
    description:
      'Abschlag mit Ansage: Der Ball wird wie beim Golf mit einem Schläger ' +
      'Richtung Ziel (Flasche oder Loch) befördert. Wer trifft oder ' +
      'einlocht, trinkt – bis das Gegnerteam den Ball zurückgeholt hat.',
    equipment: ['Golfschläger', 'Ball', 'Ziel', 'Getränke'],
    category: 'praezision',
    status: 'in-arbeit',
  },
  {
    id: 'bocciaball',
    title: 'Bocciaball Flunken',
    description:
      'Nicht geworfen, sondern gekullert: Wie beim Boccia rollt jedes Team ' +
      'seine Kugeln möglichst nah an die Zielkugel. Wer am dichtesten liegt, ' +
      'darf trinken, bis die Kugeln eingesammelt und neu gesetzt sind.',
    equipment: ['Boccia-/Boulekugeln', 'Zielkugel', 'Getränke'],
    category: 'praezision',
    status: 'in-arbeit',
  },

  // ---- Körper & Bewegung ---------------------------------------------------
  {
    id: 'fussflunken',
    title: 'Fußflunken',
    description:
      'Flunkyball nur mit den Füßen: Der Ball darf ausschließlich getreten – ' +
      'nicht geworfen – werden, um die Flasche zu treffen. Trittsicherheit ' +
      'gefragt, sonst bleibt das Getränk voll.',
    equipment: ['Flasche', 'Ball', 'Getränke'],
    category: 'koerper',
    status: 'fertig',
  },
  {
    id: 'zusammengeflunden',
    title: 'Zusammengeflunden',
    description:
      'Team-Handicap: Die Füße des ganzen Teams sind aneinandergebunden. ' +
      'Werfen, Ball holen, Flasche aufstellen – alles nur gemeinsam und im ' +
      'Gleichschritt. Wer sich verheddert, verliert kostbare Trinkzeit.',
    equipment: ['Seil/Bänder', 'Flasche', 'Ball', 'Getränke'],
    category: 'koerper',
    status: 'in-arbeit',
  },
  {
    id: 'sackhuepfen',
    title: 'Sackhüpfen Flunken',
    description:
      'Im Hüpfsack (oder mit dem Ball zwischen den Beinen) müsst ihr zum ' +
      'Werfen, zum Ballholen und zurück hüpfen. Der langsamste Weg zum ' +
      'schnellsten Bier – hier zählt jeder Sprung.',
    equipment: ['Hüpfsäcke/Ball', 'Flasche', 'Getränke'],
    category: 'koerper',
    status: 'in-arbeit',
  },
  {
    id: 'ringen-flunken',
    title: 'Ringen Flunken',
    description:
      'Zweikampf-Flunk: Rotierend tritt aus jedem Team eine Person zum ' +
      'Ringen an. Wer gewinnt, darf trinken; der Verlierer muss erst hinter ' +
      'die Linie, bevor Stopp gerufen wird. Kraft und Ausdauer statt ' +
      'Zielwasser.',
    equipment: ['Platz zum Ringen', 'Getränke'],
    category: 'koerper',
    status: 'fertig',
  },
  {
    id: 'rammbockflunken',
    title: 'Rammbockflunken',
    description:
      'Zwei Träger schleudern einen „fliegenden" Werfer (Engelchen-flieg-' +
      'Style) nach vorne, der im Flug das Ziel abräumt. Schwungvoll und ' +
      'wild – Ablauf und Sicherheitsregeln müssen wir noch festlegen.',
    equipment: ['3 Personen', 'Ziel', 'Getränke'],
    category: 'koerper',
    status: 'in-arbeit',
  },
  {
    id: 'staffelflunken',
    title: 'Staffelflunken',
    description:
      'Flunk als Staffel: Erst eine Strecke bewältigen, dann werfen – ' +
      'nacheinander im Team. Erst wenn alle durch sind und getroffen wurde, ' +
      'wird getrunken. Kondition trifft Treffsicherheit.',
    equipment: ['Flasche', 'Ball', 'Strecke', 'Getränke'],
    category: 'koerper',
    status: 'in-arbeit',
  },
  {
    id: 'hobbyhorsing',
    title: 'Hobbyhorsing Flunken',
    description:
      'Auf dem Steckenpferd durch einen Parcours – eine Jury bewertet Stil ' +
      'und Sprünge, die Wertung entscheidet über die Trinkzeit. Herrlich ' +
      'albern, Regelwerk noch offen.',
    equipment: ['Steckenpferde', 'Parcours', 'Jury', 'Getränke'],
    category: 'koerper',
    status: 'idee',
  },

  // ---- Bollerwagen & Groß --------------------------------------------------
  {
    id: 'bollerflunken',
    title: 'Bollerflunken (fahrender Bollerwagen)',
    description:
      'Flunk auf Rädern: Das Ziel steht auf einem Bollerwagen, den ein ' +
      'Unparteiischer wegzieht. Je weiter der Wagen weg ist, desto länger ' +
      'darf bei einem Treffer getrunken werden. Beide Teams stehen auf ' +
      'derselben Seite; das Gegnerteam muss den Ball holen, um zu stoppen.',
    equipment: ['Bollerwagen', 'Ziel', 'Ball', 'Getränke'],
    category: 'gross',
    status: 'fertig',
  },
  {
    id: 'donnerflunken',
    title: 'Donnerflunken',
    description:
      'Statt nacheinander werfen alle gleichzeitig: Ein Donner aus Bällen ' +
      'prasselt auf die Flaschen. Jeder Treffer zählt, das Getöse entscheidet ' +
      'über die Trinkzeit – Feinheiten arbeiten wir noch aus.',
    equipment: ['viele Bälle', 'Flaschen', 'Getränke'],
    category: 'gross',
    status: 'in-arbeit',
  },
  {
    id: 'ultimate-chicken-horse',
    title: 'Ultimate Chicken Horse Flunken',
    description:
      'Baut euch die Hölle selbst: Jede Runde darf jedes Team einen neuen ' +
      'Gegenstand oder ein Hindernis im Spielbereich platzieren. Nach und ' +
      'nach wird der Flunk-Parcours immer gemeiner – für alle gleichermaßen.',
    equipment: ['diverse Hindernisse', 'Flasche', 'Ball', 'Getränke'],
    category: 'gross',
    status: 'idee',
  },
  {
    id: 'flunk-des-lebens',
    title: 'Flunk des Lebens',
    description:
      'Die Königsdisziplin: eine große Flunk-Variante quer über das ganze ' +
      'Spielfeld, die möglichst viele Elemente vereint. Was „das Leben" hier ' +
      'alles bereithält, bauen wir Stück für Stück aus.',
    equipment: ['Großes Feld', 'diverses Equipment', 'Getränke'],
    category: 'gross',
    status: 'idee',
  },

  // ---- Köpfchen & Gruppe ---------------------------------------------------
  {
    id: 'schnick-schnack-schnunken',
    title: 'Schnick Schnack Schnunken',
    description:
      'Schnick, Schnack, Schnuck entscheidet: Rotierend tritt je eine Person ' +
      'pro Team an. Wer gewinnt, darf trinken, bis der Verlierer ' +
      'ausgetrunken bzw. zurück ist. Kein Ball, kein Wurf – reines Glück und ' +
      'Nervenkitzel.',
    equipment: ['Getränke'],
    category: 'kopf',
    status: 'fertig',
  },
  {
    id: 'tic-tac-tunken',
    title: 'Tic Tac Tunken',
    description:
      'Tic-Tac-Toe mit Bechern: Auf einem 3×3-Feld setzt ihr abwechselnd ' +
      'eure Marken (z. B. Becher). Drei in einer Reihe – und das Gegnerteam ' +
      'trinkt. Köpfchen statt Kraft.',
    equipment: ['3×3-Feld', 'Marken/Becher', 'Getränke'],
    category: 'kopf',
    status: 'in-arbeit',
  },
  {
    id: 'social-anxiety',
    title: 'Social Anxiety Flunken',
    description:
      'Mutprobe mit Fremden: Ein Team gibt eine Aufgabe vor (z. B. „Bring ' +
      'eine fremde Person dazu, sich an die Nase zu fassen"), das andere ' +
      'Team versucht, genau das zu verhindern. Sozial unangenehm, dafür ' +
      'große Belohnung. Feinregeln noch offen.',
    equipment: ['fremde Menschen', 'Mut', 'Getränke'],
    category: 'kopf',
    status: 'in-arbeit',
  },
  {
    id: 'koenigsflunken',
    title: 'Königsflunken',
    description:
      'Der König herrscht: „Ihr trinkt … Stopp!" – die Person mit dem ' +
      'vollsten Getränk (der König) bestimmt, welches Team wie lange trinken ' +
      'muss. Absolute Willkür, absolute Macht.',
    equipment: ['Getränke'],
    category: 'kopf',
    status: 'fertig',
  },
  {
    id: 'flunkern',
    title: 'Flunkern',
    description:
      'Versteckspiel mit Bier: In einer Menschengruppe wird ein Bier ' +
      'versteckt (durchgereicht, hinter dem Rücken gehalten). Das suchende ' +
      'Team muss erraten, wer es hat. Bluffen ausdrücklich erlaubt – daher ' +
      'der Name. Ablauf noch in Arbeit.',
    equipment: ['Bier', 'Menschengruppe'],
    category: 'kopf',
    status: 'in-arbeit',
  },
  {
    id: 'flunk-wo-ist-die-flasche',
    title: 'Flunk, wo ist die Flasche?',
    description:
      'Verstecken und trinken: Ein Team versteckt die Flasche in einem ' +
      'festgelegten Bereich und ruft „Los!". Ab dann darf es trinken, ' +
      'während das Gegnerteam gemeinsam die Flasche sucht. Gefunden = Stopp. ' +
      'Gute Verstecke bedeuten volle Biere.',
    equipment: ['Flasche', 'Suchbereich', 'Getränke'],
    category: 'kopf',
    status: 'fertig',
  },
  {
    id: 'oster-flunken',
    title: 'Oster Flunken',
    description:
      'Ostern für Erwachsene: Jede Person versteckt zwei Biere in einem ' +
      'großen Bereich. Dann wird gesucht – und mit jedem gefundenen Bier ' +
      'direkt weitergeflunkt. Wer am Ende die meisten Biere erbeutet (und ' +
      'geleert) hat, gewinnt. Details noch in Arbeit.',
    equipment: ['viele Biere', 'großes Gelände'],
    category: 'kopf',
    status: 'in-arbeit',
  },
  {
    id: 'stauflunken',
    title: 'Stauflunken',
    description:
      'Der Zeitvertreib für den Stau (oder die Autofahrt): Ein Team zählt ' +
      'bunte Autos, das andere schwarze/weiße/graue. Überholt euch ein ' +
      '„eigenes" Auto, trinkt euer Team – bis das nächste passende Auto ' +
      'überholt. Der einzige Flunk fürs Auto.',
    equipment: ['Auto & Verkehr', 'Getränke'],
    category: 'kopf',
    status: 'in-arbeit',
  },

  // ---- Wissen zwar nicht wie, aber klingt geil ----------------------------
  {
    id: 'terrinen',
    title: 'Terrinen Flunken',
    description:
      'Klingt nach Suppenschüssel, klingt geil – wie es gespielt wird, ' +
      'wissen wir selbst noch nicht. Hauptsache, Terrinen sind irgendwie ' +
      'beteiligt. Vorschläge willkommen.',
    equipment: ['Terrinen (?)'],
    category: 'unklar',
    status: 'idee',
  },
  {
    id: 'kaese',
    title: 'Käse Flunken',
    description:
      'Irgendwas mit Käse. Warum? Bock auf Käse. Mechanik: offen. Wir wissen ' +
      'nur, dass es großartig wird.',
    equipment: ['Käse (?)'],
    category: 'unklar',
    status: 'idee',
  },
  {
    id: 'boellerflunken',
    title: 'Böllerflunken',
    description:
      'Mit Böllern und Krachern – laut, wild, garantiert legendär. Wie genau ' +
      '(und vor allem: wie sicher), ist noch völlig offen. Bisher reine Idee.',
    equipment: ['Böller (?)'],
    category: 'unklar',
    status: 'idee',
  },
  {
    id: 'ballerflunken',
    title: 'Ballerflunken',
    description:
      'Irgendwas zum Ballern – Spielzeugblaster, Wasserpistolen, was auch ' +
      'immer schießt. Konkrete Regeln: Fehlanzeige, aber der Name steht ' +
      'schon mal.',
    equipment: ['Blaster/Spritzpistolen (?)'],
    category: 'unklar',
    status: 'idee',
  },
]
