import { useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'
import { useStore } from '../store'
import type { BoardBranch, BoardField, BoardFieldType, BoardState } from '../types'
import {
  BOARD_FIELD_DEFS,
  boardFieldDef,
  boardFieldIcon,
  splitBoardFields,
  type BoardEntry,
} from '../data/board'
import { Modal } from './Modal'

/**
 * Temporäre Spielbrett-Seite: bearbeitbares Brett mit zwei Startwegen
 * (Ausbildung kurz, Studium lang) und Serpentinen-Hauptweg – Felder
 * verschieben, Typ/Text/Weg ändern, einfügen/löschen und als modernes
 * Spielbrett-PDF exportieren. Alle Änderungen liegen im geteilten Zustand
 * und werden gespeichert/gesynct.
 */
export function SpielbrettView() {
  const { state, moveBoardField, insertBoardField, resetBoard } = useStore()
  const board = state.board
  const [moveMode, setMoveMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  // Laufender Drag (nur im Verschieben-Modus).
  const dragRef = useRef<{
    pointerId: number
    fromIndex: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const [drag, setDrag] = useState<{ fromIndex: number; overIndex: number | null; x: number; y: number } | null>(
    null,
  )

  const say = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2500)
  }

  // Felder nach Weg gruppieren: zwei Startwege + Hauptweg.
  const { ausbildung, studium, main } = splitBoardFields(board.fields)

  // Serpentinen-Reihen des Hauptwegs: gerade Reihen links→rechts, ungerade rechts→links.
  const rows: Array<{ entries: BoardEntry[]; rtl: boolean }> = []
  for (let i = 0; i < main.length; i += board.cols) {
    rows.push({ entries: main.slice(i, i + board.cols), rtl: (i / board.cols) % 2 === 1 })
  }

  const onTilePointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (!moveMode) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      fromIndex: index,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
  }

  const onTilePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    if (!d.moved) {
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      if (dist < 8) return
      d.moved = true
    }
    // Ziel-Feld unter dem Finger/Mauszeiger suchen (Ghost hat pointer-events:none).
    const over = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => (el as HTMLElement).dataset?.sbIdx != null) as HTMLElement | undefined
    const overIndex = over ? Number(over.dataset.sbIdx) : null
    setDrag({ fromIndex: d.fromIndex, overIndex, x: e.clientX, y: e.clientY })
  }

  const onTilePointerUp = (e: PointerEvent<HTMLButtonElement>, field: BoardField) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    if (d.moved) {
      if (drag?.overIndex != null && drag.overIndex !== d.fromIndex) {
        moveBoardField(d.fromIndex, drag.overIndex)
      }
    } else {
      // Kein Drag → normaler Tap: Feld bearbeiten.
      setEditId(field.id)
    }
    setDrag(null)
  }

  const cancelDrag = () => {
    dragRef.current = null
    setDrag(null)
  }

  const addField = (type: BoardFieldType) => {
    insertBoardField(board.fields.length, type)
    say(`${boardFieldDef(type).icon} ${boardFieldDef(type).label} ans Ende des Hauptwegs angefügt`)
  }

  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportBoardPdf(board)
    } catch (err) {
      console.error('[spielbrett] PDF-Export fehlgeschlagen –', err)
      say('PDF-Export fehlgeschlagen 😕')
    } finally {
      setExporting(false)
    }
  }

  const editField = editId ? board.fields.find((f) => f.id === editId) ?? null : null
  // Beschriftung des bearbeiteten Felds: A1/S1 auf den Startwegen, sonst Nummer.
  const entryLabel = (field: BoardField): string => {
    const group = field.branch === 'ausbildung' ? ausbildung : field.branch === 'studium' ? studium : main
    const pos = group.findIndex((e) => e.field.id === field.id) + 1
    return field.branch === 'ausbildung' ? `A${pos}` : field.branch === 'studium' ? `S${pos}` : `${pos}`
  }

  // Touch-Events nicht zur App durchreichen – sonst wechselt ein Drag die Seite.
  const swallowTouch = (e: TouchEvent) => e.stopPropagation()

  const renderTile = ({ field, index }: BoardEntry, num: string) => {
    const def = boardFieldDef(field.type)
    const isDragged = drag?.fromIndex === index
    const isOver = drag?.overIndex === index && drag.fromIndex !== index
    const cls = [
      'sb-tile',
      field.type === 'start' || field.type === 'rente' ? 'special' : '',
      isDragged ? 'dragging' : '',
      isOver ? 'drop-target' : '',
    ]
      .filter(Boolean)
      .join(' ')
    return (
      <button
        key={field.id}
        data-sb-idx={index}
        className={cls}
        style={{ '--f': def.color } as CSSProperties}
        onPointerDown={(e) => onTilePointerDown(e, index)}
        onPointerMove={onTilePointerMove}
        onPointerUp={(e) => onTilePointerUp(e, field)}
        onPointerCancel={cancelDrag}
        onClick={() => {
          if (!moveMode) setEditId(field.id)
        }}
      >
        <span className="sb-num">{num}</span>
        <span className="sb-icon">{boardFieldIcon(field)}</span>
        {field.text && <span className="sb-text">{field.text}</span>}
      </button>
    )
  }

  return (
    <section className="spielbrett" onTouchStart={swallowTouch} onTouchEnd={swallowTouch}>
      <p className="muted small feedback-intro">
        Temporäre Seite zum Bauen des Spielbretts: Felder antippen zum
        Bearbeiten, im ✋-Modus verschieben. Alles wird automatisch gespeichert
        und live geteilt.
      </p>

      <div className="sb-toolbar">
        <button
          className={moveMode ? 'btn small primary' : 'btn small ghost'}
          onClick={() => setMoveMode((m) => !m)}
        >
          ✋ Verschieben {moveMode ? 'an' : 'aus'}
        </button>
        <button className="btn small ghost" onClick={exportPdf} disabled={exporting}>
          {exporting ? '⏳ Exportiere …' : '📄 Als PDF exportieren'}
        </button>
        <button className="btn small ghost" onClick={() => setConfirmReset(true)}>
          ↩︎ Zurücksetzen
        </button>
      </div>

      {/* Palette: neues Feld ans Ende anfügen. */}
      <div className="sb-palette">
        {BOARD_FIELD_DEFS.map((d) => (
          <button
            key={d.type}
            className="sb-chip"
            style={{ '--f': d.color } as CSSProperties}
            onClick={() => addField(d.type)}
            title={`${d.label} hinzufügen`}
          >
            <span>{d.icon}</span>
            <span className="sb-chip-label">{d.label}</span>
          </button>
        ))}
      </div>

      {flash && <div className="flash">{flash}</div>}

      {/* Das Brett: erst die zwei Startwege, darunter der Hauptweg. */}
      <div className={moveMode ? 'sb-board moving' : 'sb-board'}>
        <div className="sb-board-head">
          <img src="./logo-fdl.png" alt="" className="sb-logo" />
          <div>
            <strong className="sb-title">Flunk des Lebens</strong>
            <span className="sb-subtitle">Spielbrett · von Chris &amp; Marlon</span>
          </div>
        </div>

        {(studium.length > 0 || ausbildung.length > 0) && (
          <div className="sb-lanes">
            {studium.length > 0 && (
              <div className="sb-lane">
                <span className="sb-lane-label">🎓 Studiums-Weg</span>
                <div className="sb-lane-row" style={{ '--sb-cols': board.cols } as CSSProperties}>
                  {studium.map((entry, j) => renderTile(entry, `S${j + 1}`))}
                </div>
              </div>
            )}
            {ausbildung.length > 0 && (
              <div className="sb-lane">
                <span className="sb-lane-label">🛠️ Ausbildungs-Weg</span>
                <div className="sb-lane-row" style={{ '--sb-cols': board.cols } as CSSProperties}>
                  {ausbildung.map((entry, j) => renderTile(entry, `A${j + 1}`))}
                </div>
              </div>
            )}
            <p className="sb-merge-hint">
              ↳ Zwei Startpunkte: Jedes Team beginnt auf einem der Wege – beide
              münden in Feld 1 des Hauptwegs.
            </p>
          </div>
        )}

        {rows.map((row, r) => (
          <div
            key={r}
            className="sb-row"
            style={{ '--cols': board.cols, direction: row.rtl ? 'rtl' : 'ltr' } as CSSProperties}
          >
            {row.entries.map((entry, j) => renderTile(entry, `${r * board.cols + j + 1}`))}
          </div>
        ))}
      </div>

      {/* Ghost, der beim Verschieben am Finger klebt. */}
      {drag && (
        <div className="sb-ghost" style={{ left: drag.x, top: drag.y }}>
          {board.fields[drag.fromIndex] ? boardFieldIcon(board.fields[drag.fromIndex]) : '❓'}
        </div>
      )}

      {editField && (
        <FieldEditor
          field={editField}
          label={entryLabel(editField)}
          index={board.fields.findIndex((f) => f.id === editField.id)}
          onClose={() => setEditId(null)}
        />
      )}

      {confirmReset && (
        <Modal title="↩︎ Brett zurücksetzen?" onClose={() => setConfirmReset(false)}>
          <p className="sheet-info">
            Das Spielbrett wird auf das mitgelieferte Standard-Layout
            zurückgesetzt. Alle verschobenen und geänderten Felder gehen verloren.
          </p>
          <div className="event-actions">
            <button className="btn big ghost" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </button>
            <button
              className="btn big minus"
              onClick={() => {
                resetBoard()
                setConfirmReset(false)
              }}
            >
              ↩︎ Zurücksetzen
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

const BRANCH_OPTIONS: Array<{ value: BoardBranch | undefined; label: string }> = [
  { value: undefined, label: '🛣️ Hauptweg' },
  { value: 'ausbildung', label: '🛠️ Ausbildung' },
  { value: 'studium', label: '🎓 Studium' },
]

/** Sheet zum Bearbeiten eines Felds: Typ, Text, Weg, Einfügen, Löschen. */
function FieldEditor({
  field,
  label,
  index,
  onClose,
}: {
  field: BoardField
  label: string
  index: number
  onClose: () => void
}) {
  const { updateBoardField, insertBoardField, removeBoardField } = useStore()
  const def = boardFieldDef(field.type)

  return (
    <Modal title={`${boardFieldIcon(field)} Feld ${label}`} onClose={onClose}>
      <div className="field">
        <span>Feldtyp</span>
        <div className="sb-type-grid">
          {BOARD_FIELD_DEFS.map((d) => (
            <button
              key={d.type}
              className={d.type === field.type ? 'sb-type selected' : 'sb-type'}
              style={{ '--f': d.color } as CSSProperties}
              onClick={() => updateBoardField(field.id, { type: d.type })}
            >
              <span className="sb-type-icon">{d.icon}</span>
              <span className="sb-type-label">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Weg (Startwege münden in den Hauptweg)</span>
        <div className="sb-branch-row">
          {BRANCH_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={field.branch === opt.value ? 'sb-branch selected' : 'sb-branch'}
              onClick={() => updateBoardField(field.id, { branch: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Text auf dem Feld (optional, z. B. „−2 KK“)</span>
        <input
          type="text"
          value={field.text ?? ''}
          placeholder={def.hint}
          onChange={(e) => updateBoardField(field.id, { text: e.target.value || undefined })}
        />
      </label>

      <div className="event-actions">
        <button
          className="btn big ghost"
          onClick={() => insertBoardField(index, field.type, field.branch)}
        >
          ＋ Davor einfügen
        </button>
        <button
          className="btn big ghost"
          onClick={() => insertBoardField(index + 1, field.type, field.branch)}
        >
          ＋ Danach einfügen
        </button>
      </div>

      <button
        className="btn danger block"
        onClick={() => {
          removeBoardField(field.id)
          onClose()
        }}
      >
        🗑️ Feld löschen
      </button>

      <button className="btn ghost block sheet-done" onClick={onClose}>
        ✓ Fertig
      </button>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// PDF-Export: das Brett als modernes Spielbrett (Stil: Spiel des Lebens /
// Mario Party) auf Canvas zeichnen und als A4-quer-PDF herunterladen –
// geschwungener Laufweg mit runden Wenden statt Flowchart-Pfeilen.

/** Zusatztext in maximal drei Zeilen fürs Feld umbrechen. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w
    if (ctx.measureText(probe).width <= maxWidth || !line) {
      line = probe
    } else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

/** Logo laden – schlägt der Load fehl, wird ohne Logo exportiert. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Deterministischer Pseudo-Zufall (0..1) – Export bleibt reproduzierbar. */
function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Abgerundetes Rechteck als Pfad (zentriert um 0/0 wird NICHT angenommen). */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

const SANS = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif'
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", serif'

async function exportBoardPdf(board: BoardState): Promise<void> {
  const { jsPDF } = await import('jspdf')

  // A4 quer bei 300 dpi.
  const W = 3508
  const H = 2480
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  const { ausbildung, studium, main } = splitBoardFields(board.fields)
  const cols = Math.max(3, board.cols)

  // ---- Hintergrund: warmer Verlauf + dezentes Party-Konfetti ---------------
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fdf7ec')
  bg.addColorStop(1, '#f3e8d3')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const confetti = ['#5bc8f5', '#ffc53d', '#c68ef9', '#4fd8c6', '#ff8fcf', '#ff9f45', '#5ad584', '#ff5d5d']
  ctx.save()
  ctx.globalAlpha = 0.14
  for (let i = 0; i < 130; i++) {
    const x = hash01(i, 1) * W
    const y = hash01(i, 2) * H
    const c = confetti[Math.floor(hash01(i, 3) * confetti.length) % confetti.length]
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
      roundRectPath(ctx, -s * 0.7, -s * 0.22, s * 1.4, s * 0.44, s * 0.22)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()

  // ---- Kopfzeile ------------------------------------------------------------
  const margin = 130
  const logo = await loadImage('./logo-fdl.png')
  if (logo) ctx.drawImage(logo, margin, 48, 140, 140)
  const textX = margin + (logo ? 175 : 0)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#292018'
  ctx.font = `900 92px ${SANS}`
  ctx.fillText('FLUNK DES LEBENS', textX, 105)
  ctx.font = `600 42px ${SANS}`
  ctx.fillStyle = '#8a7a63'
  ctx.fillText('Das Spielbrett · von Chris & Marlon', textX, 178)

  // ---- Geometrie: 2 Startwege oben, darunter der Serpentinen-Hauptweg ------
  const laneRanks: Array<'studium' | 'ausbildung'> = []
  if (studium.length) laneRanks.push('studium')
  if (ausbildung.length) laneRanks.push('ausbildung')
  const laneCount = laneRanks.length
  const mainRows = Math.max(1, Math.ceil(main.length / cols))
  const ranks = laneCount + mainRows

  const top = 250
  const bottom = H - 90
  const rowPitch = (bottom - top) / ranks
  const turnR = rowPitch / 2
  const colPitch = (W - 2 * (margin + turnR)) / (cols - 1)
  const cx = (c: number) => margin + turnR + c * colPitch
  const cy = (rank: number) => top + rank * rowPitch + rowPitch / 2
  const tile = Math.min(rowPitch * 0.76, colPitch * 0.66)

  // Der Hauptweg beginnt oben RECHTS (Reihe 0 läuft rechts→links), damit die
  // Startwege von links kommend dort einmünden können.
  const mainPos = main.map((_, m) => {
    const r = Math.floor(m / cols)
    const cRaw = m % cols
    const rtl = r % 2 === 0
    const c = rtl ? cols - 1 - cRaw : cRaw
    return { x: cx(c), y: cy(laneCount + r) }
  })

  // Startwege: enden beide in der vorletzten Spalte und biegen dann in
  // Feld 1 des Hauptwegs ein. Kürzerer Weg = späterer (eingerückter) Start.
  const lanePositions = (count: number, rank: number) => {
    const endX = cx(cols - 2)
    const pitch = count > 1 ? Math.min(colPitch, (endX - cx(0)) / (count - 1)) : colPitch
    return Array.from({ length: count }, (_, j) => ({
      x: endX - (count - 1 - j) * pitch,
      y: cy(rank),
    }))
  }
  const lanePos: Record<'studium' | 'ausbildung', Array<{ x: number; y: number }>> = {
    studium: [],
    ausbildung: [],
  }
  laneRanks.forEach((branch, rank) => {
    lanePos[branch] = lanePositions(branch === 'studium' ? studium.length : ausbildung.length, rank)
  })

  // ---- Wege als breite „Straßen“-Bänder zeichnen ----------------------------
  const ribbon = (path: () => void, color: string) => {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineWidth = tile * 0.6
    ctx.shadowColor = 'rgba(90, 60, 20, 0.16)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 9
    ctx.beginPath()
    path()
    ctx.stroke()
    ctx.restore()
    // Gestrichelte Mittellinie wie auf einer Rennstrecke.
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 7
    ctx.setLineDash([26, 34])
    ctx.beginPath()
    path()
    ctx.stroke()
    ctx.restore()
  }

  const mainPath = () => {
    if (!mainPos.length) return
    ctx.moveTo(mainPos[0].x, mainPos[0].y)
    for (let r = 0; r < mainRows; r++) {
      const rowEnd = Math.min(r * cols + cols, main.length) - 1
      const end = mainPos[rowEnd]
      ctx.lineTo(end.x, end.y)
      if (rowEnd < main.length - 1) {
        const next = mainPos[rowEnd + 1]
        // Halbkreis-Wende an der Brettkante (links bzw. rechts).
        const midY = (end.y + next.y) / 2
        ctx.arc(end.x, midY, rowPitch / 2, -Math.PI / 2, Math.PI / 2, end.x < W / 2)
      }
    }
  }

  const lanePath = (pos: Array<{ x: number; y: number }>) => () => {
    if (!pos.length || !mainPos.length) return
    const last = pos[pos.length - 1]
    ctx.moveTo(pos[0].x, pos[0].y)
    ctx.lineTo(last.x, last.y)
    // Sanfter Bogen vom Ende des Startwegs in Feld 1 des Hauptwegs.
    ctx.quadraticCurveTo(mainPos[0].x + colPitch * 0.5, last.y, mainPos[0].x, mainPos[0].y)
  }

  if (studium.length) ribbon(lanePath(lanePos.studium), '#d8d2f0')
  if (ausbildung.length) ribbon(lanePath(lanePos.ausbildung), '#f0ddbc')
  ribbon(mainPath, '#e7d7b2')

  // ---- Felder zeichnen -------------------------------------------------------
  const drawTile = (
    pos: { x: number; y: number },
    field: BoardField,
    num: string,
    seed: number,
  ) => {
    const def = boardFieldDef(field.type)
    const special = field.type === 'start' || field.type === 'rente'
    const t = special ? tile * 1.22 : tile
    const rot = (hash01(seed, 9) - 0.5) * 0.1 // ±3° – wirkt „von Hand gelegt“

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rot)

    // Grundfläche mit Schatten und weißem Rand.
    ctx.shadowColor = 'rgba(70, 45, 10, 0.25)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 9
    ctx.fillStyle = def.color
    roundRectPath(ctx, -t / 2, -t / 2, t, t, t * 0.26)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    // Leichter Glanz oben.
    const gloss = ctx.createLinearGradient(0, -t / 2, 0, t / 2)
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.38)')
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gloss
    roundRectPath(ctx, -t / 2, -t / 2, t, t, t * 0.26)
    ctx.fill()
    ctx.strokeStyle = '#fffdf6'
    ctx.lineWidth = t * 0.055
    roundRectPath(ctx, -t / 2, -t / 2, t, t, t * 0.26)
    ctx.stroke()

    // Nummern-Plakette oben links.
    ctx.beginPath()
    ctx.arc(-t * 0.33, -t * 0.33, t * 0.135, 0, Math.PI * 2)
    ctx.fillStyle = '#fffdf6'
    ctx.fill()
    ctx.fillStyle = '#4b4238'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${t * 0.13}px ${SANS}`
    ctx.fillText(num, -t * 0.33, -t * 0.325)

    ctx.fillStyle = '#292018'
    if (field.type === 'start') {
      ctx.font = `${t * 0.3}px ${EMOJI}`
      ctx.fillText(boardFieldIcon(field), 0, -t * 0.22)
      ctx.font = `900 ${t * 0.17}px ${SANS}`
      ctx.fillText('START', 0, t * 0.06)
      if (field.text) {
        ctx.font = `700 ${t * 0.13}px ${SANS}`
        ctx.fillText(field.text.toUpperCase(), 0, t * 0.28)
      }
    } else if (field.type === 'rente') {
      ctx.font = `${t * 0.38}px ${EMOJI}`
      ctx.fillText(def.icon, 0, -t * 0.13)
      ctx.font = `900 ${t * 0.17}px ${SANS}`
      ctx.fillText('ZIEL: RENTE', 0, t * 0.24)
    } else if (field.text) {
      ctx.font = `${t * 0.36}px ${EMOJI}`
      ctx.fillText(def.icon, 0, -t * 0.16)
      ctx.font = `700 ${t * 0.115}px ${SANS}`
      const lines = wrapText(ctx, field.text, t * 0.85)
      lines.forEach((line, li) => {
        ctx.fillText(line, 0, t * 0.19 + li * t * 0.135)
      })
    } else {
      ctx.font = `${t * 0.46}px ${EMOJI}`
      ctx.fillText(def.icon, 0, 0)
    }
    ctx.restore()
  }

  laneRanks.forEach((branch) => {
    const entries = branch === 'studium' ? studium : ausbildung
    const prefix = branch === 'studium' ? 'S' : 'A'
    entries.forEach(({ field, index }, j) => drawTile(lanePos[branch][j], field, `${prefix}${j + 1}`, index))
  })
  main.forEach(({ field, index }, m) => drawTile(mainPos[m], field, `${m + 1}`, index))

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210)
  pdf.save('flunk-des-lebens-spielbrett.pdf')
}
