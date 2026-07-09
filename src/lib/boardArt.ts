import type { BoardField, BoardFieldType, BoardState } from '../types'
import { boardFieldDef, splitBoardFields } from '../data/board'
import { KINGSTABELLE, MINIGAMES, type TableRow } from '../data/tables'

// ============================================================================
// Spielbrett-Grafik: von Hand gezeichnete Vektor-Icons (statt Emojis),
// fünf wählbare Design-Themes und der Canvas-Renderer für Ansicht/PDF.
// ============================================================================

type G = CanvasRenderingContext2D

// ---- Zeichen-Helfer ---------------------------------------------------------

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rad, y)
  g.arcTo(x + w, y, x + w, y + h, rad)
  g.arcTo(x + w, y + h, x, y + h, rad)
  g.arcTo(x, y + h, x, y, rad)
  g.arcTo(x, y, x + w, y, rad)
  g.closePath()
}

function frr(g: G, x: number, y: number, w: number, h: number, r: number) {
  rr(g, x, y, w, h, r)
  g.fill()
}

function circle(g: G, x: number, y: number, r: number) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

/** Polygon mit runden Ecken (Fill + dicker Stroke in derselben Farbe). */
function poly(g: G, pts: Array<[number, number]>, soft = 5) {
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  g.closePath()
  g.fill()
  if (soft > 0) {
    g.lineWidth = soft
    g.stroke()
  }
}

/** Aus der Silhouette ausstanzen (Löcher, Knockout-Text …). */
function cut(g: G, draw: () => void) {
  g.globalCompositeOperation = 'destination-out'
  draw()
  g.globalCompositeOperation = 'source-over'
}

// ---- Icons ------------------------------------------------------------------
// Jedes Icon wird als einfarbige Silhouette in eine 100×100-Box gezeichnet –
// klare Formen wie bei gedruckten Brettspiel-Symbolen.

export type IconKind =
  | BoardFieldType
  | 'start-ausbildung'
  | 'start-studium'
  | 'crown'

const ICONS: Record<IconKind, (g: G) => void> = {
  // 📣 Megafon
  ereignis(g) {
    g.translate(50, 50)
    g.rotate(-0.18)
    g.translate(-50, -50)
    poly(g, [
      [14, 38],
      [58, 18],
      [58, 82],
      [14, 62],
    ], 7)
    frr(g, 55, 14, 11, 72, 5)
    frr(g, 20, 60, 14, 28, 6)
    g.lineWidth = 6.5
    g.beginPath()
    g.arc(70, 50, 14, -0.9, 0.9)
    g.stroke()
    g.beginPath()
    g.arc(70, 50, 24, -0.8, 0.8)
    g.stroke()
  },
  // ❗ Ausrufezeichen
  aktion(g) {
    frr(g, 42, 8, 16, 54, 8)
    circle(g, 50, 81, 10)
  },
  // ⚡ Blitz
  gamechanger(g) {
    poly(g, [
      [58, 6],
      [20, 56],
      [42, 56],
      [34, 94],
      [80, 40],
      [54, 40],
    ], 6)
  },
  // ⚔️ Gekreuzte Schwerter
  challenge(g) {
    const sword = () => {
      poly(g, [
        [50, 4],
        [56.5, 14],
        [56.5, 58],
        [43.5, 58],
        [43.5, 14],
      ], 4)
      frr(g, 36, 57, 28, 9, 4.5)
      frr(g, 45.5, 66, 9, 19, 4.5)
      circle(g, 50, 89, 5.5)
    }
    g.save()
    g.translate(50, 50)
    g.rotate(Math.PI / 4)
    g.translate(-50, -50)
    sword()
    g.restore()
    g.save()
    g.translate(50, 50)
    g.rotate(-Math.PI / 4)
    g.translate(-50, -50)
    sword()
    g.restore()
  },
  // 🎮 Gamepad
  minigame(g) {
    frr(g, 6, 29, 88, 44, 22)
    cut(g, () => {
      frr(g, 20, 46.5, 24, 9, 4.5)
      frr(g, 27.5, 39, 9, 24, 4.5)
      circle(g, 67, 44, 5.5)
      circle(g, 78, 56, 5.5)
    })
  },
  // 🍺 Bierkrug
  flunk(g) {
    frr(g, 18, 30, 46, 56, 8)
    // Henkel als Ring
    circle(g, 70, 57, 16)
    cut(g, () => circle(g, 70, 57, 8))
    // Schaumkrone
    circle(g, 24, 28, 11)
    circle(g, 41, 20, 14)
    circle(g, 58, 27, 10)
    g.fillRect(18, 26, 46, 12)
    // Bläschen
    cut(g, () => {
      circle(g, 33, 52, 4.5)
      circle(g, 47, 66, 3.5)
    })
  },
  // 💰 KK-Sack (Zahltag)
  zahltag(g) {
    g.beginPath()
    g.moveTo(41, 27)
    g.bezierCurveTo(20, 38, 12, 58, 17, 74)
    g.bezierCurveTo(22, 90, 78, 90, 83, 74)
    g.bezierCurveTo(88, 58, 80, 38, 59, 27)
    g.closePath()
    g.fill()
    frr(g, 36, 16, 28, 12, 6)
    poly(g, [
      [40, 15],
      [32, 6],
      [46, 12],
    ], 3)
    poly(g, [
      [60, 15],
      [68, 6],
      [54, 12],
    ], 3)
    cut(g, () => {
      g.font = '900 30px "Trebuchet MS", Verdana, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('KK', 50, 62)
    })
  },
  // 💸 Steuer-Schein mit Prozentzeichen (Biersteuer)
  biersteuer(g) {
    g.translate(50, 50)
    g.rotate(-0.1)
    g.translate(-50, -50)
    frr(g, 6, 27, 88, 46, 8)
    cut(g, () => {
      g.lineWidth = 5
      g.beginPath()
      g.arc(33, 41, 8, 0, Math.PI * 2)
      g.stroke()
      g.beginPath()
      g.arc(67, 59, 8, 0, Math.PI * 2)
      g.stroke()
      g.save()
      g.translate(50, 50)
      g.rotate(-0.85)
      frr(g, -4, -19, 8, 38, 4)
      g.restore()
    })
  },
  // 🔄 Berufs-/Gehaltswechsel: Pfeil-Kreis mit Koffer
  berufswechsel(g) {
    const arrow = (deg: number) => {
      const a = (deg * Math.PI) / 180
      const x = 50 + 31 * Math.cos(a)
      const y = 50 + 31 * Math.sin(a)
      const tx = -Math.sin(a)
      const ty = Math.cos(a)
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      poly(g, [
        [x + tx * 16, y + ty * 16],
        [x + nx * 9, y + ny * 9],
        [x - nx * 9, y - ny * 9],
      ], 3)
    }
    g.lineWidth = 10
    g.beginPath()
    g.arc(50, 50, 31, (205 * Math.PI) / 180, (320 * Math.PI) / 180)
    g.stroke()
    arrow(320)
    g.beginPath()
    g.arc(50, 50, 31, (25 * Math.PI) / 180, (140 * Math.PI) / 180)
    g.stroke()
    arrow(140)
    // Köfferchen in der Mitte
    frr(g, 37, 44, 26, 18, 3)
    frr(g, 44, 38, 12, 8, 3)
    cut(g, () => g.fillRect(37, 51.5, 26, 3))
  },
  // 🏁 Startflagge (Fallback)
  start(g) {
    frr(g, 24, 8, 7, 84, 3.5)
    g.beginPath()
    g.moveTo(31, 12)
    g.quadraticCurveTo(52, 4, 72, 12)
    g.lineTo(78, 44)
    g.quadraticCurveTo(56, 36, 35, 44)
    g.closePath()
    g.fill()
    cut(g, () => {
      g.fillRect(42, 14, 11, 11)
      g.fillRect(64, 14, 11, 11)
      g.fillRect(53, 25, 11, 11)
      g.fillRect(42, 36, 11, 5)
      g.fillRect(64, 36, 11, 5)
    })
  },
  // 🛠️ Schraubenschlüssel (Start Ausbildung)
  'start-ausbildung'(g) {
    g.translate(50, 50)
    g.rotate(Math.PI / 4)
    circle(g, -24, 0, 18)
    cut(g, () => frr(g, -48, -6, 26, 12, 5))
    frr(g, -16, -7.5, 56, 15, 7.5)
    cut(g, () => circle(g, 33, 0, 4))
  },
  // 🎓 Doktorhut (Start Studium)
  'start-studium'(g) {
    poly(g, [
      [50, 16],
      [90, 34],
      [50, 52],
      [10, 34],
    ], 5)
    g.beginPath()
    g.moveTo(29, 44)
    g.lineTo(71, 44)
    g.lineTo(71, 60)
    g.quadraticCurveTo(50, 72, 29, 60)
    g.closePath()
    g.fill()
    g.lineWidth = 4.5
    g.beginPath()
    g.moveTo(50, 34)
    g.quadraticCurveTo(82, 38, 82, 56)
    g.stroke()
    circle(g, 82, 62, 5.5)
  },
  // 🏖️ Sonnenschirm (Rente/Ziel)
  rente(g) {
    g.translate(50, 50)
    g.rotate(-0.16)
    g.translate(-50, -50)
    g.beginPath()
    g.arc(50, 46, 37, Math.PI, Math.PI * 2)
    g.arc(74.7, 46, 12.3, 0, Math.PI)
    g.arc(50, 46, 12.3, 0, Math.PI)
    g.arc(25.3, 46, 12.3, 0, Math.PI)
    g.closePath()
    g.fill()
    cut(g, () => {
      g.lineWidth = 3.5
      g.beginPath()
      g.moveTo(30, 13)
      g.quadraticCurveTo(26, 34, 27, 45)
      g.stroke()
      g.beginPath()
      g.moveTo(70, 13)
      g.quadraticCurveTo(74, 34, 73, 45)
      g.stroke()
    })
    frr(g, 47.5, 12, 6, 78, 3)
    circle(g, 50.5, 10, 4.5)
    g.beginPath()
    g.ellipse(58, 90, 26, 6, 0, 0, Math.PI * 2)
    g.fill()
  },
  // 👑 Krone (Tabellen-Kopf)
  crown(g) {
    poly(g, [
      [15, 62],
      [15, 30],
      [34, 44],
      [50, 18],
      [66, 44],
      [85, 30],
      [85, 62],
    ], 5)
    frr(g, 15, 66, 70, 12, 5)
    cut(g, () => {
      circle(g, 33, 55, 3.5)
      circle(g, 50, 52, 3.5)
      circle(g, 67, 55, 3.5)
    })
  },
}

// Gerenderte Icons cachen (Kind + Größe + Farbe).
const iconCache = new Map<string, HTMLCanvasElement>()

/** Icon als Offscreen-Canvas in gewünschter Größe und Farbe. */
export function iconCanvas(kind: IconKind, px: number, color: string): HTMLCanvasElement {
  const key = `${kind}|${px}|${color}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = Math.max(2, Math.round(px))
  const g = c.getContext('2d')!
  g.scale(c.width / 100, c.height / 100)
  g.fillStyle = '#000'
  g.strokeStyle = '#000'
  g.lineJoin = 'round'
  g.lineCap = 'round'
  ;(ICONS[kind] ?? ICONS.ereignis)(g)
  // Einfärben
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  iconCache.set(key, c)
  return c
}

/** Icon als Data-URL (für <img> in der App-Ansicht). */
export function iconDataUrl(kind: IconKind, px: number, color: string): string {
  return iconCanvas(kind, px, color).toDataURL('image/png')
}

/** Icon-Art eines Felds (Startfelder je nach Weg). */
export function iconKindOf(field: BoardField): IconKind {
  if (field.type === 'start') {
    return field.branch === 'studium' ? 'start-studium' : 'start-ausbildung'
  }
  return field.type
}

// ---- Themes -----------------------------------------------------------------

export interface BoardTheme {
  id: string
  name: string
  desc: string
  bg: [string, string]
  decor: 'confetti' | 'stars' | 'coaster' | 'halftone' | 'none'
  titleFamily: string
  titleColor: string
  titleUpper: boolean
  subColor: string
  tileShape: 'rounded' | 'circle'
  /** 'fill' = bunte Fläche + dunkle Icons; 'outline' = dunkle Fläche + bunte Ränder/Icons. */
  tileMode: 'fill' | 'outline'
  tileBase: string
  colors: Record<BoardFieldType, string>
  /** 'type' = Icon in Feldfarbe (Neon), sonst feste Farbe. */
  iconColor: string
  tileStroke: string
  tileStrokeFactor: number
  doubleRing: boolean
  shadow: 'soft' | 'hard' | 'none'
  gloss: boolean
  /** Max. Zufallsrotation der Felder in Grad. */
  rotation: number
  textColor: string
  numBg: string
  numText: string
  path: { fill: string; edge?: string; center?: string; dash: [number, number] | null; glow?: string }
  lanes: { studium: string; ausbildung: string }
  table: {
    bg: string
    border: string
    borderW: number
    headBg: string
    headText: string
    text: string
    chipBg: string
    chipText: string
    zebra: string | null
  }
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'sommerfest',
    name: 'Sommerfest',
    desc: 'Bunt & verspielt wie Mario Party – Konfetti, Candy-Farben, Straßen-Look.',
    bg: ['#fdf7ec', '#f3e6cc'],
    decor: 'confetti',
    titleFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
    titleColor: '#2b2018',
    titleUpper: true,
    subColor: '#8a7a63',
    tileShape: 'rounded',
    tileMode: 'fill',
    tileBase: '#ffffff',
    colors: {
      ereignis: '#54c3f1',
      aktion: '#ffc53d',
      gamechanger: '#bd8df5',
      challenge: '#3fd1be',
      minigame: '#ff8fcf',
      flunk: '#ff5d5d',
      zahltag: '#55d287',
      biersteuer: '#ff9f45',
      berufswechsel: '#7ea6ff',
      start: '#f1ead9',
      rente: '#ffd166',
    },
    iconColor: '#2b2018',
    tileStroke: '#fffdf6',
    tileStrokeFactor: 0.055,
    doubleRing: false,
    shadow: 'soft',
    gloss: true,
    rotation: 3,
    textColor: '#2b2018',
    numBg: '#fffdf6',
    numText: '#4b4238',
    path: { fill: '#e7d6b0', center: 'rgba(255,255,255,0.75)', dash: [26, 34] },
    lanes: { studium: '#d6cff0', ausbildung: '#efdcba' },
    table: {
      bg: '#fffdf4',
      border: '#e4d5b2',
      borderW: 4,
      headBg: '#2b2018',
      headText: '#ffe9b0',
      text: '#3b3126',
      chipBg: '#2b2018',
      chipText: '#ffe9b0',
      zebra: '#f7efdc',
    },
  },
  {
    id: 'neon',
    name: 'Neonnacht',
    desc: 'Dunkles Brett, leuchtende Felder – Arcade-Look für Abendrunden.',
    bg: ['#191430', '#0d0b1a'],
    decor: 'stars',
    titleFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
    titleColor: '#f4f1ff',
    titleUpper: true,
    subColor: '#8f87b8',
    tileShape: 'rounded',
    tileMode: 'outline',
    tileBase: '#221d40',
    colors: {
      ereignis: '#4dd8ff',
      aktion: '#ffd54d',
      gamechanger: '#c07bff',
      challenge: '#3ff0d0',
      minigame: '#ff6ad5',
      flunk: '#ff4d6d',
      zahltag: '#55ff9f',
      biersteuer: '#ffa04d',
      berufswechsel: '#7d9bff',
      start: '#cfc9e8',
      rente: '#ffd166',
    },
    iconColor: 'type',
    tileStroke: 'type',
    tileStrokeFactor: 0.045,
    doubleRing: false,
    shadow: 'none',
    gloss: false,
    rotation: 0,
    textColor: '#e8e4ff',
    numBg: '#141126',
    numText: '#b9b1e0',
    path: { fill: '#282250', edge: '#3a3468', center: '#6ee7ff', dash: [22, 30], glow: '#6ee7ff' },
    lanes: { studium: '#3b2f68', ausbildung: '#4a3350' },
    table: {
      bg: '#1d1838',
      border: '#3a3468',
      borderW: 4,
      headBg: '#2c2554',
      headText: '#6ee7ff',
      text: '#d9d3f2',
      chipBg: '#6ee7ff',
      chipText: '#141126',
      zebra: '#231d45',
    },
  },
  {
    id: 'brauhaus',
    name: 'Brauhaus',
    desc: 'Vintage-Bierdeckel auf altem Papier – warm, gemütlich, Wirtshaus-Charme.',
    bg: ['#f4ead2', '#e3d0a4'],
    decor: 'coaster',
    titleFamily: 'Georgia, "Times New Roman", serif',
    titleColor: '#4b3621',
    titleUpper: false,
    subColor: '#8c7350',
    tileShape: 'circle',
    tileMode: 'fill',
    tileBase: '#ffffff',
    colors: {
      ereignis: '#5e8aa8',
      aktion: '#d9a13b',
      gamechanger: '#8d6ba0',
      challenge: '#64a08b',
      minigame: '#c96f8e',
      flunk: '#c14f38',
      zahltag: '#6f9a4f',
      biersteuer: '#a8763e',
      berufswechsel: '#647cae',
      start: '#e9dfc6',
      rente: '#c9972f',
    },
    iconColor: '#332211',
    tileStroke: '#f6efdc',
    tileStrokeFactor: 0.05,
    doubleRing: true,
    shadow: 'soft',
    gloss: false,
    rotation: 2,
    textColor: '#332211',
    numBg: '#f6efdc',
    numText: '#5a452c',
    path: { fill: '#c9ae7f', edge: '#a98d5e', center: '#f0e4c6', dash: [8, 26] },
    lanes: { studium: '#b3a487', ausbildung: '#c4a06b' },
    table: {
      bg: '#f8f1de',
      border: '#8c7350',
      borderW: 6,
      headBg: '#4b3621',
      headText: '#f0e0b8',
      text: '#43331e',
      chipBg: '#4b3621',
      chipText: '#f0e0b8',
      zebra: '#efe5c9',
    },
  },
  {
    id: 'minimal',
    name: 'Studio Minimal',
    desc: 'Ruhig & aufgeräumt – Pastellfelder, feine Linien, viel Weißraum.',
    bg: ['#fafaf8', '#fafaf8'],
    decor: 'none',
    titleFamily: '"Helvetica Neue", Arial, sans-serif',
    titleColor: '#1c1c21',
    titleUpper: false,
    subColor: '#a1a19a',
    tileShape: 'rounded',
    tileMode: 'fill',
    tileBase: '#ffffff',
    colors: {
      ereignis: '#d4eaf7',
      aktion: '#fdeec2',
      gamechanger: '#e9ddfb',
      challenge: '#d2f2ea',
      minigame: '#fbddec',
      flunk: '#ffd9d9',
      zahltag: '#d8f3e0',
      biersteuer: '#ffe7cf',
      berufswechsel: '#dde5fb',
      start: '#efefec',
      rente: '#fff0c2',
    },
    iconColor: '#42424c',
    tileStroke: 'rgba(0,0,0,0)',
    tileStrokeFactor: 0,
    doubleRing: false,
    shadow: 'none',
    gloss: false,
    rotation: 0,
    textColor: '#42424c',
    numBg: 'rgba(255,255,255,0.85)',
    numText: '#8a8a92',
    path: { fill: '#e3e3dc', dash: null },
    lanes: { studium: '#e6e3f2', ausbildung: '#eee7d9' },
    table: {
      bg: '#ffffff',
      border: '#e6e6df',
      borderW: 2,
      headBg: '#f2f2ee',
      headText: '#1c1c21',
      text: '#4a4a52',
      chipBg: '#1c1c21',
      chipText: '#ffffff',
      zebra: '#f7f7f3',
    },
  },
  {
    id: 'comic',
    name: 'Comic Pop',
    desc: 'Fette schwarze Outlines, knallige Farben, Sticker-Optik wie im Comicheft.',
    bg: ['#fff8e0', '#ffedc2'],
    decor: 'halftone',
    titleFamily: '"Comic Sans MS", "Trebuchet MS", sans-serif',
    titleColor: '#17130d',
    titleUpper: true,
    subColor: '#6b5c3f',
    tileShape: 'rounded',
    tileMode: 'fill',
    tileBase: '#ffffff',
    colors: {
      ereignis: '#29abe2',
      aktion: '#ffb703',
      gamechanger: '#9b5de5',
      challenge: '#06d6a0',
      minigame: '#ff70a6',
      flunk: '#ef476f',
      zahltag: '#4ad66d',
      biersteuer: '#ff8c42',
      berufswechsel: '#5c7cfa',
      start: '#f4f4f4',
      rente: '#ffd23f',
    },
    iconColor: '#17130d',
    tileStroke: '#17130d',
    tileStrokeFactor: 0.05,
    doubleRing: false,
    shadow: 'hard',
    gloss: false,
    rotation: 5,
    textColor: '#17130d',
    numBg: '#ffffff',
    numText: '#17130d',
    path: { fill: '#fffdf4', edge: '#17130d', center: '#c9c2b2', dash: [24, 28] },
    lanes: { studium: '#e6e0ff', ausbildung: '#ffe3b8' },
    table: {
      bg: '#fffdf4',
      border: '#17130d',
      borderW: 8,
      headBg: '#ffd23f',
      headText: '#17130d',
      text: '#241d12',
      chipBg: '#17130d',
      chipText: '#ffd23f',
      zebra: '#f6efdb',
    },
  },
]

export function boardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]
}

// ---- Renderer ---------------------------------------------------------------

/** Deterministischer Pseudo-Zufall (0..1) – Export bleibt reproduzierbar. */
function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Text in maximal `max` Zeilen umbrechen. */
function wrapText(g: G, text: string, maxWidth: number, max = 3): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w
    if (g.measureText(probe).width <= maxWidth || !line) {
      line = probe
    } else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, max)
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Canvas-Grundmaß: A4 quer bei 300 dpi.
const W = 3508
const H = 2480

// Reihen 1–4 des Hauptwegs sind kürzer – rechts daneben wohnen die Tabellen.
const SHORT_ROW_CAP = 5
function rowCapacity(row: number, cols: number): number {
  return row >= 1 && row <= 4 ? Math.min(SHORT_ROW_CAP, cols) : cols
}

interface Pos {
  x: number
  y: number
}

/**
 * Zeichnet das komplette Brett in den Canvas. `scale` skaliert das
 * Grundmaß 3508×2480 (z. B. 0.25 für Vorschau-Thumbnails).
 */
export async function renderBoardCanvas(
  canvas: HTMLCanvasElement,
  board: BoardState,
  themeId: string,
  scale = 1,
): Promise<void> {
  const theme = boardTheme(themeId)
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')
  ctx.scale(scale, scale)

  const { ausbildung, studium, main } = splitBoardFields(board.fields)
  const cols = Math.max(4, board.cols)
  const color = (t: BoardFieldType) => theme.colors[t] ?? boardFieldDef(t).color

  // ---- Hintergrund ----------------------------------------------------------
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, theme.bg[0])
  bg.addColorStop(1, theme.bg[1])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  drawDecor(ctx, theme)

  // ---- Kopfzeile -------------------------------------------------------------
  const margin = 130
  const logo = await loadImage('./logo-fdl.png')
  if (logo) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.2)'
    ctx.shadowBlur = 12
    ctx.drawImage(logo, margin, 46, 138, 138)
    ctx.restore()
  }
  const textX = margin + (logo ? 172 : 0)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.titleColor
  ctx.font = `900 92px ${theme.titleFamily}`
  ctx.fillText(theme.titleUpper ? 'FLUNK DES LEBENS' : 'Flunk des Lebens', textX, 104)
  ctx.font = `600 42px ${theme.titleFamily}`
  ctx.fillStyle = theme.subColor
  ctx.fillText('Das Spielbrett · von Chris & Marlon', textX, 178)

  // ---- Geometrie --------------------------------------------------------------
  const laneRanks: Array<'studium' | 'ausbildung'> = []
  if (studium.length) laneRanks.push('studium')
  if (ausbildung.length) laneRanks.push('ausbildung')
  const laneCount = laneRanks.length

  // Hauptweg-Reihen anhand der Kapazitäten aufteilen.
  const rows: number[] = []
  let left = main.length
  let r = 0
  while (left > 0) {
    const cap = rowCapacity(r, cols)
    rows.push(Math.min(cap, left))
    left -= cap
    r += 1
  }
  const mainRows = Math.max(rows.length, 1)

  const top = 240
  const bottom = H - 84
  const ranks = laneCount + Math.max(mainRows, 5)
  const rowPitch = (bottom - top) / ranks
  const turnR = rowPitch / 2
  const colPitch = (W - 2 * (margin + turnR)) / (cols - 1)
  const cx = (c: number) => margin + turnR + c * colPitch
  const cy = (rank: number) => top + rank * rowPitch + rowPitch / 2
  const tile = Math.min(rowPitch * 0.76, colPitch * 0.66)

  // Positionen des Hauptwegs: Reihe 0 läuft rechts→links (Start oben rechts,
  // dort münden die Startwege), danach Serpentinen mit runden Wenden.
  const mainPos: Pos[] = []
  {
    let idx = 0
    for (let row = 0; row < rows.length; row++) {
      const cap = rowCapacity(row, cols)
      const rtl = row % 2 === 0
      for (let i = 0; i < rows[row]; i++) {
        const c = rtl ? cap - 1 - i : i
        mainPos[idx] = { x: cx(c), y: cy(laneCount + row) }
        idx += 1
      }
    }
  }

  // Startwege: enden in Spalte cols-2, kürzerer Weg startet eingerückt.
  const lanePositions = (count: number, rank: number): Pos[] => {
    const endX = cx(cols - 2)
    const pitch = count > 1 ? Math.min(colPitch, (endX - cx(0)) / (count - 1)) : colPitch
    return Array.from({ length: count }, (_, j) => ({
      x: endX - (count - 1 - j) * pitch,
      y: cy(rank),
    }))
  }
  const lanePos: Record<'studium' | 'ausbildung', Pos[]> = { studium: [], ausbildung: [] }
  laneRanks.forEach((branch, rank) => {
    lanePos[branch] = lanePositions(branch === 'studium' ? studium.length : ausbildung.length, rank)
  })

  // ---- Wege -------------------------------------------------------------------
  const ribbonWidth = tile * 0.6

  const strokeAlong = (build: () => void, width: number, style: string, dash: [number, number] | null, glow?: string) => {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = style
    ctx.lineWidth = width
    if (dash) ctx.setLineDash(dash)
    if (glow) {
      ctx.shadowColor = glow
      ctx.shadowBlur = 26
    } else if (theme.shadow === 'soft') {
      ctx.shadowColor = 'rgba(60, 40, 10, 0.14)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 8
    }
    ctx.beginPath()
    build()
    ctx.stroke()
    ctx.restore()
  }

  const ribbon = (build: () => void, fill: string) => {
    if (theme.path.edge) strokeAlong(build, ribbonWidth * 1.16, theme.path.edge, null)
    strokeAlong(build, ribbonWidth, fill, null)
    if (theme.path.center) {
      strokeAlong(build, 7, theme.path.center, theme.path.dash, theme.path.glow)
    }
  }

  const mainPath = () => {
    if (!mainPos.length) return
    ctx.moveTo(mainPos[0].x, mainPos[0].y)
    let idx = 0
    for (let row = 0; row < rows.length; row++) {
      const rowEndIdx = idx + rows[row] - 1
      const end = mainPos[rowEndIdx]
      ctx.lineTo(end.x, end.y)
      if (rowEndIdx < main.length - 1) {
        const next = mainPos[rowEndIdx + 1]
        const midY = (end.y + next.y) / 2
        // Halbkreis-Wende: links bei Spalte 0, sonst rechts.
        ctx.arc(end.x, midY, Math.abs(next.y - end.y) / 2, -Math.PI / 2, Math.PI / 2, end.x < W / 2)
      }
      idx += rows[row]
    }
  }

  // Einmündung der Startwege: beide biegen als Viertelkurve in den Korridor
  // rechts ein und laufen von oben gemeinsam in Feld 1 – wie eine Auffahrt.
  const lanePath = (pos: Pos[]) => () => {
    if (!pos.length || !mainPos.length) return
    const last = pos[pos.length - 1]
    const target = mainPos[0]
    ctx.moveTo(pos[0].x, pos[0].y)
    ctx.lineTo(last.x, last.y)
    ctx.quadraticCurveTo(target.x, last.y, target.x, target.y)
  }

  // Länge zuerst zeichnen, damit der kürzere Weg beim Einfädeln oben liegt.
  laneRanks.forEach((branch) => {
    ribbon(lanePath(lanePos[branch]), theme.lanes[branch])
  })
  ribbon(mainPath, theme.path.fill)

  // ---- Felder -----------------------------------------------------------------
  const drawTile = (pos: Pos, field: BoardField, num: string, seed: number) => {
    const special = field.type === 'start' || field.type === 'rente'
    const t = special ? tile * 1.22 : tile
    const c = color(field.type)
    const fillColor = theme.tileMode === 'outline' ? theme.tileBase : c
    const strokeColor = theme.tileStroke === 'type' ? c : theme.tileStroke
    const iconColor = theme.iconColor === 'type' ? c : theme.iconColor
    const rot = theme.rotation ? ((hash01(seed, 9) - 0.5) * 2 * theme.rotation * Math.PI) / 180 : 0

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rot)

    const shape = () => {
      if (theme.tileShape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, t / 2, 0, Math.PI * 2)
      } else {
        rr(ctx, -t / 2, -t / 2, t, t, t * 0.26)
      }
    }

    // Schatten + Grundfläche
    if (theme.shadow === 'soft') {
      ctx.shadowColor = 'rgba(60, 38, 8, 0.24)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 9
    } else if (theme.shadow === 'hard') {
      ctx.shadowColor = '#17130d'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = t * 0.045
      ctx.shadowOffsetY = t * 0.055
    } else if (theme.tileMode === 'outline') {
      ctx.shadowColor = c
      ctx.shadowBlur = t * 0.12
    }
    ctx.fillStyle = fillColor
    shape()
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    if (theme.gloss) {
      const gloss = ctx.createLinearGradient(0, -t / 2, 0, t / 2)
      gloss.addColorStop(0, 'rgba(255,255,255,0.36)')
      gloss.addColorStop(0.5, 'rgba(255,255,255,0)')
      ctx.fillStyle = gloss
      shape()
      ctx.fill()
    }

    if (theme.tileStrokeFactor > 0) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = t * theme.tileStrokeFactor
      shape()
      ctx.stroke()
      if (theme.doubleRing) {
        ctx.lineWidth = t * 0.018
        ctx.beginPath()
        ctx.arc(0, 0, t / 2 - t * 0.1, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Nummern-Plakette
    const numR = t * 0.135
    const numX = theme.tileShape === 'circle' ? 0 : -t * 0.33
    const numY = theme.tileShape === 'circle' ? -t * 0.36 : -t * 0.33
    ctx.beginPath()
    ctx.arc(numX, numY, numR, 0, Math.PI * 2)
    ctx.fillStyle = theme.numBg
    ctx.fill()
    if (theme.tileMode === 'outline' || theme.id === 'comic') {
      ctx.strokeStyle = theme.tileMode === 'outline' ? c : theme.tileStroke
      ctx.lineWidth = t * 0.02
      ctx.stroke()
    }
    ctx.fillStyle = theme.numText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${t * 0.125}px ${theme.titleFamily}`
    ctx.fillText(num, numX, numY + t * 0.005)

    // Inhalt: Icon + Beschriftung
    const icon = (px: number, dy: number) => {
      const img = iconCanvas(iconKindOf(field), Math.max(24, Math.round(px * scale * 2)), iconColor)
      ctx.drawImage(img, -px / 2, dy - px / 2, px, px)
    }
    ctx.fillStyle = theme.textColor
    if (field.type === 'start') {
      icon(t * 0.34, -t * 0.2)
      ctx.font = `900 ${t * 0.16}px ${theme.titleFamily}`
      ctx.fillText('START', 0, t * 0.08)
      if (field.text) {
        ctx.font = `700 ${t * 0.115}px ${theme.titleFamily}`
        ctx.fillText(field.text.toUpperCase(), 0, t * 0.27)
      }
    } else if (field.type === 'rente') {
      icon(t * 0.44, -t * 0.12)
      ctx.font = `900 ${t * 0.145}px ${theme.titleFamily}`
      ctx.fillText('ZIEL: RENTE', 0, t * 0.26)
    } else if (field.text) {
      icon(t * 0.42, -t * 0.15)
      ctx.font = `700 ${t * 0.105}px ${theme.titleFamily}`
      const lines = wrapText(ctx, field.text, t * 0.84, 2)
      lines.forEach((line, li) => {
        ctx.fillText(line, 0, t * 0.2 + li * t * 0.125)
      })
    } else {
      icon(t * 0.52, 0)
    }
    ctx.restore()
  }

  laneRanks.forEach((branch) => {
    const entries = branch === 'studium' ? studium : ausbildung
    const prefix = branch === 'studium' ? 'S' : 'A'
    entries.forEach(({ field, index }, j) => drawTile(lanePos[branch][j], field, `${prefix}${j + 1}`, index))
  })
  main.forEach(({ field, index }, m) => drawTile(mainPos[m], field, `${m + 1}`, index))

  // ---- Tabellen (Kingstabelle + Minigames) ------------------------------------
  const zoneX = cx(SHORT_ROW_CAP - 1) + turnR + tile * 0.62
  const zoneW = W - margin - zoneX
  const zoneY = cy(laneCount + 1) - rowPitch * 0.44
  const zoneH = cy(laneCount + 4) + rowPitch * 0.44 - zoneY
  if (zoneW > 400) {
    const gap = 30
    const kingsH = (zoneH - gap) * 0.42
    drawTable(ctx, theme, zoneX, zoneY, zoneW, kingsH, 'KINGSTABELLE', 'crown', KINGSTABELLE, scale)
    drawTable(
      ctx,
      theme,
      zoneX,
      zoneY + kingsH + gap,
      zoneW,
      zoneH - kingsH - gap,
      'MINIGAMES',
      'minigame',
      MINIGAMES,
      scale,
    )
  }
}

function drawDecor(ctx: G, theme: BoardTheme) {
  ctx.save()
  if (theme.decor === 'confetti') {
    const palette = Object.values(theme.colors)
    ctx.globalAlpha = 0.13
    for (let i = 0; i < 130; i++) {
      const x = hash01(i, 1) * W
      const y = hash01(i, 2) * H
      const c = palette[Math.floor(hash01(i, 3) * palette.length) % palette.length]
      const s = 8 + hash01(i, 4) * 22
      ctx.fillStyle = c
      ctx.strokeStyle = c
      ctx.lineWidth = 7
      const kind = Math.floor(hash01(i, 5) * 3)
      if (kind === 0) {
        ctx.beginPath()
        ctx.arc(x, y, s * 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === 1) {
        ctx.beginPath()
        ctx.arc(x, y, s * 0.55, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(hash01(i, 6) * Math.PI)
        frr(ctx, -s * 0.7, -s * 0.22, s * 1.4, s * 0.44, s * 0.22)
        ctx.restore()
      }
    }
  } else if (theme.decor === 'stars') {
    for (let i = 0; i < 180; i++) {
      const x = hash01(i, 1) * W
      const y = hash01(i, 2) * H
      const r = 1.5 + hash01(i, 3) * 3
      ctx.globalAlpha = 0.1 + hash01(i, 4) * 0.22
      ctx.fillStyle = i % 9 === 0 ? '#6ee7ff' : '#cfc9e8'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (theme.decor === 'coaster') {
    ctx.strokeStyle = '#7a5c33'
    for (let i = 0; i < 12; i++) {
      const x = hash01(i, 1) * W
      const y = hash01(i, 2) * H
      const r = 70 + hash01(i, 3) * 110
      ctx.globalAlpha = 0.045
      ctx.lineWidth = 16 + hash01(i, 4) * 14
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (theme.decor === 'halftone') {
    const cols2 = ['#ff8c42', '#29abe2', '#9b5de5']
    for (let k = 0; k < 9; k++) {
      const bx = hash01(k, 1) * W
      const by = hash01(k, 2) * H
      const c = cols2[k % cols2.length]
      ctx.fillStyle = c
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          ctx.globalAlpha = 0.1
          ctx.beginPath()
          ctx.arc(bx + i * 34, by + j * 34, 4 + ((i + j) % 3) * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
  ctx.restore()
}

function drawTable(
  ctx: G,
  theme: BoardTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  iconKind: IconKind,
  rows: TableRow[],
  scale: number,
) {
  const r = 26
  ctx.save()
  if (theme.shadow === 'soft') {
    ctx.shadowColor = 'rgba(60, 38, 8, 0.18)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 8
  } else if (theme.shadow === 'hard') {
    ctx.shadowColor = theme.table.border
    ctx.shadowOffsetX = 10
    ctx.shadowOffsetY = 12
  }
  ctx.fillStyle = theme.table.bg
  frr(ctx, x, y, w, h, r)
  ctx.restore()
  ctx.strokeStyle = theme.table.border
  ctx.lineWidth = theme.table.borderW
  rr(ctx, x, y, w, h, r)
  ctx.stroke()

  // Kopfzeile
  const headH = Math.min(84, h * 0.16)
  ctx.save()
  rr(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.fillStyle = theme.table.headBg
  ctx.fillRect(x, y, w, headH)
  ctx.restore()
  const iconPx = headH * 0.62
  ctx.drawImage(
    iconCanvas(iconKind, Math.max(24, Math.round(iconPx * scale * 2)), theme.table.headText),
    x + 26,
    y + (headH - iconPx) / 2,
    iconPx,
    iconPx,
  )
  ctx.fillStyle = theme.table.headText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${headH * 0.46}px ${theme.titleFamily}`
  ctx.fillText(title, x + 26 + iconPx + 18, y + headH / 2 + 2)

  // Zeilen
  const pad = 14
  const rowH = (h - headH - pad * 2) / rows.length
  const chipR = Math.min(rowH * 0.36, 26)
  ctx.textBaseline = 'middle'
  rows.forEach((row, i) => {
    const ry = y + headH + pad + i * rowH
    if (theme.table.zebra && i % 2 === 1) {
      ctx.fillStyle = theme.table.zebra
      ctx.fillRect(x + theme.table.borderW, ry, w - theme.table.borderW * 2, rowH)
    }
    const cyy = ry + rowH / 2
    ctx.beginPath()
    ctx.arc(x + 26 + chipR, cyy, chipR, 0, Math.PI * 2)
    ctx.fillStyle = theme.table.chipBg
    ctx.fill()
    ctx.fillStyle = theme.table.chipText
    ctx.textAlign = 'center'
    ctx.font = `800 ${chipR * 1.05}px ${theme.titleFamily}`
    ctx.fillText(`${row.n}`, x + 26 + chipR, cyy + 1)
    ctx.fillStyle = theme.table.text
    ctx.textAlign = 'left'
    const fontPx = Math.min(rowH * 0.5, 32)
    ctx.font = `600 ${fontPx}px ${theme.titleFamily}`
    const textX = x + 26 + chipR * 2 + 20
    const lines = wrapText(ctx, row.text, w - (textX - x) - 24, 2)
    if (lines.length === 1) {
      ctx.fillText(lines[0], textX, cyy + 1)
    } else {
      lines.forEach((line, li) => {
        ctx.fillText(line, textX, cyy + (li - 0.5) * fontPx * 1.08 + 1)
      })
    }
  })
}

/** Brett rendern und als Data-URL zurückgeben (Vorschau/Tests). */
export async function renderBoardToDataUrl(
  board: BoardState,
  themeId: string,
  scale = 0.35,
): Promise<string> {
  const canvas = document.createElement('canvas')
  await renderBoardCanvas(canvas, board, themeId, scale)
  return canvas.toDataURL('image/png')
}

/** Brett im gewählten Design als A4-quer-PDF herunterladen. */
export async function exportBoardPdf(board: BoardState, themeId: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const canvas = document.createElement('canvas')
  await renderBoardCanvas(canvas, board, themeId, 1)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210)
  pdf.save(`flunk-des-lebens-spielbrett-${themeId}.pdf`)
}
