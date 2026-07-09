import { useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'
import { useStore } from '../store'
import type { BoardField, BoardFieldType, BoardState } from '../types'
import { BOARD_FIELD_DEFS, boardFieldDef } from '../data/board'
import { Modal } from './Modal'

/**
 * Temporäre Spielbrett-Seite: das Brett aus dem alten Canva-PDF als
 * bearbeitbares Serpentinen-Brett – Felder verschieben, Typ/Text ändern,
 * einfügen/löschen und als PDF exportieren. Alle Änderungen liegen im
 * geteilten Zustand und werden gespeichert/gesynct.
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

  // Serpentinen-Reihen: gerade Reihen links→rechts, ungerade rechts→links.
  const rows: Array<{ fields: Array<{ field: BoardField; index: number }>; rtl: boolean }> = []
  for (let i = 0; i < board.fields.length; i += board.cols) {
    const slice = board.fields.slice(i, i + board.cols).map((field, j) => ({ field, index: i + j }))
    rows.push({ fields: slice, rtl: (i / board.cols) % 2 === 1 })
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
    say(`${boardFieldDef(type).icon} ${boardFieldDef(type).label} ans Ende angefügt – per Verschieben platzieren`)
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
  const editIndex = editField ? board.fields.findIndex((f) => f.id === editField.id) : -1

  // Touch-Events nicht zur App durchreichen – sonst wechselt ein Drag die Seite.
  const swallowTouch = (e: TouchEvent) => e.stopPropagation()

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

      {/* Das Brett – Serpentinen-Reihen aus Chevron-Feldern. */}
      <div className={moveMode ? 'sb-board moving' : 'sb-board'}>
        <div className="sb-board-head">
          <img src="./logo-fdl.png" alt="" className="sb-logo" />
          <div>
            <strong className="sb-title">Flunk des Lebens</strong>
            <span className="sb-subtitle">Spielbrett · von Chris &amp; Marlon</span>
          </div>
        </div>
        {rows.map((row, r) => (
          <div
            key={r}
            className="sb-row"
            style={{ '--cols': board.cols, direction: row.rtl ? 'rtl' : 'ltr' } as CSSProperties}
          >
            {row.fields.map(({ field, index }) => {
              const def = boardFieldDef(field.type)
              const isDragged = drag?.fromIndex === index
              const isOver = drag?.overIndex === index && drag.fromIndex !== index
              const cls = [
                'sb-tile',
                row.rtl ? 'rtl' : '',
                isDragged ? 'dragging' : '',
                isOver ? 'drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const showTextOnly = (field.type === 'text' || field.type === 'aussetzen' || field.type === 'start') && field.text
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
                  <span className="sb-num">{index + 1}</span>
                  {showTextOnly ? (
                    <span className="sb-text only">{field.text}</span>
                  ) : (
                    <>
                      <span className="sb-icon">{def.icon}</span>
                      {field.text && <span className="sb-text">{field.text}</span>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Ghost, der beim Verschieben am Finger klebt. */}
      {drag && (
        <div className="sb-ghost" style={{ left: drag.x, top: drag.y }}>
          {boardFieldDef(board.fields[drag.fromIndex]?.type ?? 'text').icon}
        </div>
      )}

      {editField && (
        <FieldEditor
          field={editField}
          index={editIndex}
          total={board.fields.length}
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

/** Sheet zum Bearbeiten eines Felds: Typ, Text, Einfügen, Löschen. */
function FieldEditor({
  field,
  index,
  total,
  onClose,
}: {
  field: BoardField
  index: number
  total: number
  onClose: () => void
}) {
  const { updateBoardField, insertBoardField, removeBoardField } = useStore()
  const def = boardFieldDef(field.type)

  return (
    <Modal title={`${def.icon} Feld ${index + 1} von ${total}`} onClose={onClose}>
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
          onClick={() => insertBoardField(index, field.type)}
        >
          ＋ Davor einfügen
        </button>
        <button
          className="btn big ghost"
          onClick={() => insertBoardField(index + 1, field.type)}
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
// PDF-Export: Brett auf Canvas zeichnen und als A4-quer-PDF herunterladen.

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

  // Heller, druckfreundlicher Hintergrund mit dezentem Verlauf.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#fafaf7')
  bg.addColorStop(1, '#f1efe9')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Kopfzeile mit Logo und Titel.
  const margin = 110
  const logo = await loadImage('./logo-fdl.png')
  let headH = 150
  if (logo) {
    ctx.drawImage(logo, margin, 40, 130, 130)
  }
  ctx.fillStyle = '#1c1917'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 84px Georgia, serif'
  ctx.fillText('Flunk des Lebens', margin + (logo ? 160 : 0), 90)
  ctx.font = '44px Georgia, serif'
  ctx.fillStyle = '#78716c'
  ctx.fillText('Spielbrett · von Chris & Marlon', margin + (logo ? 160 : 0), 155)
  headH = 220

  // Brettmaße: Serpentinen-Reihen à `cols` Felder.
  const cols = board.cols
  const rowCount = Math.max(1, Math.ceil(board.fields.length / cols))
  const boardW = W - margin * 2
  const boardH = H - headH - margin
  const rowGap = 26
  const tileH = Math.min(300, (boardH - (rowCount - 1) * rowGap) / rowCount)
  const notch = tileH * 0.3
  const slotW = (boardW - notch) / cols

  for (let i = 0; i < board.fields.length; i++) {
    const field = board.fields[i]
    const def = boardFieldDef(field.type)
    const r = Math.floor(i / cols)
    const cRaw = i % cols
    const rtl = r % 2 === 1
    const c = rtl ? cols - 1 - cRaw : cRaw
    const x = margin + c * slotW
    const y = headH + r * (tileH + rowGap)

    // Chevron-Pfeil in Laufrichtung (gerade Reihe →, ungerade ←).
    ctx.beginPath()
    if (!rtl) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + slotW, y)
      ctx.lineTo(x + slotW + notch, y + tileH / 2)
      ctx.lineTo(x + slotW, y + tileH)
      ctx.lineTo(x, y + tileH)
      ctx.lineTo(x + notch, y + tileH / 2)
    } else {
      const xr = x + slotW + notch
      ctx.moveTo(xr, y)
      ctx.lineTo(x + notch, y)
      ctx.lineTo(x, y + tileH / 2)
      ctx.lineTo(x + notch, y + tileH)
      ctx.lineTo(xr, y + tileH)
      ctx.lineTo(xr - notch, y + tileH / 2)
    }
    ctx.closePath()
    ctx.fillStyle = def.color
    ctx.fill()
    ctx.strokeStyle = '#fafaf7'
    ctx.lineWidth = 10
    ctx.stroke()

    // Feldinhalt: Icon (Emoji) und/oder Text.
    const cx = x + (slotW + notch) / 2
    const cy = y + tileH / 2
    const textOnly =
      (field.type === 'text' || field.type === 'aussetzen' || field.type === 'start') && field.text
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1c1917'
    if (textOnly) {
      ctx.font = `bold ${tileH * 0.13}px Georgia, serif`
      const lines = wrapText(ctx, field.text!, slotW - notch)
      lines.forEach((line, li) => {
        ctx.fillText(line, cx, cy + (li - (lines.length - 1) / 2) * tileH * 0.17)
      })
    } else if (field.text) {
      ctx.font = `${tileH * 0.42}px "Segoe UI Emoji", "Apple Color Emoji", serif`
      ctx.fillText(def.icon, cx, cy - tileH * 0.14)
      ctx.font = `bold ${tileH * 0.12}px Georgia, serif`
      const lines = wrapText(ctx, field.text, slotW - notch)
      lines.forEach((line, li) => {
        ctx.fillText(line, cx, cy + tileH * 0.24 + li * tileH * 0.14)
      })
    } else {
      ctx.font = `${tileH * 0.5}px "Segoe UI Emoji", "Apple Color Emoji", serif`
      ctx.fillText(def.icon, cx, cy)
    }
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210)
  pdf.save('flunk-des-lebens-spielbrett.pdf')
}
