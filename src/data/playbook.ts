// Das „Flunk-Playbook" – angelehnt an Barney Stinsons Playbook aus
// How I Met Your Mother. Jede Variante ist ein „Flunk": ein Trick mit
// Titel und großspurig-selbstbewusster Beschreibung. Vorerst nur
// Mock-Daten; die Kategorisierung nach Equipment o. Ä. kommt später.

export interface PlaybookPlay {
  id: string
  /** Name des Flunks (bewusst großspurig, wie im Playbook). */
  title: string
  /** Ablauf/Beschreibung im übertrieben selbstsicheren Playbook-Ton. */
  description: string
}

/**
 * Mitgelieferte Flunk-Varianten. Reihenfolge egal – gezogen wird zufällig.
 * Später kommen hier Felder wie „equipment" dazu (siehe #Kategorisierung).
 */
export const PLAYBOOK_PLAYS: PlaybookPlay[] = [
  {
    id: 'ted-mosby',
    title: 'Der Ted Mosby',
    description:
      'Setz dich mit todtrauriger Miene allein an den Rand. Sobald jemand ' +
      'aus Mitleid fragt, was los ist, seufzt du „Ach, nichts …" – und ' +
      'schiebst deine volle Halbe unauffällig rüber. Wer sie annimmt, trinkt.',
  },
  {
    id: 'zeitreisender',
    title: 'Der Zeitreisende',
    description:
      'Du behauptest, du kämst aus der Zukunft und wüsstest bereits, dass ' +
      'das nächste Team den Flunk verliert. Klingt absurd – funktioniert ' +
      'aber immer, weil niemand gegen sein Schicksal antrinken will.',
  },
  {
    id: 'scuba-taucher',
    title: 'Der Taucher',
    description:
      'Trink deine gesamte Runde durch einen Strohhalm, ohne die Flasche ' +
      'abzusetzen. Wer zuerst Luft holt, hat verloren. Regel Nr. 1: Ein ' +
      'echter Taucher taucht nicht auf.',
  },
  {
    id: 'lorenzo',
    title: 'Der Lorenzo von Matterhorn',
    description:
      'Stell dich als sagenhaft reicher Aristokrat vor, der jede Wette ' +
      'annimmt. Verlierst du, „überweist" du später. Gewinnst du, kassierst ' +
      'du sofort. Ein Lorenzo verliert selbstverständlich nie.',
  },
  {
    id: 'snasa',
    title: 'Die SNASA',
    description:
      'Behaupte, es gebe eine geheime zweite NASA – die SNASA. Nur ihre ' +
      'Agent:innen dürfen den letzten Schluck trinken. Bau so viel ' +
      'Verwirrung auf, bis alle mitmachen. Streng geheim, versteht sich.',
  },
  {
    id: 'mrs-stinsfire',
    title: 'Die Frau Stinsfire',
    description:
      'Verkleide dich (Jacke verkehrt herum reicht) als harmlose Aushilfe ' +
      'und misch dich beim Gegner-Team ein. Beim entscheidenden Flunk ' +
      'wechselst du plötzlich die Seite. Der Klassiker unter den Doppelspielen.',
  },
  {
    id: 'penis-wuensche',
    title: 'Der Wunscherfüller',
    description:
      'Verkünde feierlich, dein Daumen erfülle Wünsche – aber nur einen ' +
      'pro Abend. Wer den Wunsch „einlöst", muss vorher ein Bier ex trinken. ' +
      'Erstaunlich viele Leute glauben an Wunder.',
  },
  {
    id: 'billige-nummer',
    title: 'Der billige Trick',
    description:
      'Frag jemanden, ob er weiß, woraus sein Shirt gemacht ist. „Ehm, ' +
      'Baumwolle?" – „Nein: aus Freundschaftsstoff. Prost!" Peinlich, ' +
      'plump, wirkt trotzdem jedes Mal.',
  },
  {
    id: 'trink-das-nicht',
    title: 'Trink das bloß nicht',
    description:
      'Stell dem Gegner betont besorgt eine volle Flasche hin und flüstere: ' +
      '„Trink das auf keinen Fall." Nichts macht durstiger als ein Verbot. ' +
      'Reverse-Psychologie in Reinform.',
  },
  {
    id: 'er-kommt-nicht',
    title: 'Der kommt eh nicht mehr',
    description:
      'Behaupte, das gegnerische Team warte noch auf einen entscheidenden ' +
      'Mitspieler, der längst weg ist. Während sie warten, spielst du den ' +
      'Flunk in aller Ruhe zu Ende. Geduld schlägt Panik.',
  },
  {
    id: 'perfekte-woche',
    title: 'Die perfekte Woche',
    description:
      'Kündige großspurig an, sieben Flunks in Folge zu gewinnen – eine ' +
      'perfekte Woche. Der Druck liegt jetzt bei dir, aber die Show ' +
      'allein verunsichert die Gegner schon genug.',
  },
  {
    id: 'bracket',
    title: 'Das Turnier-Bracket',
    description:
      'Zeichne ein völlig überflüssiges Turnierdiagramm auf einen Bierdeckel ' +
      'und erkläre allen ernsthaft ihren „Seed". Wer sich einordnen lässt, ' +
      'spielt nach deinen Regeln – und die schreibst du gerade selbst.',
  },
]
