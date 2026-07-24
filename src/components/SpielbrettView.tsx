import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'
import { useStore } from '../store'
import type { BoardBranch, BoardField, BoardFieldType } from '../types'
import { BOARD_FIELD_DEFS, boardFieldDef, splitBoardFields, type BoardEntry } from '../data/board'
import { boardColorOverrides } from '../data/gameFields'
import { tableRows } from '../data/tables'
import {
  exportBoardPdf,
  exportTablesPdf,
  iconDataUrl,
  iconKindOf,
  renderBoardToDataUrl,
  tablesPdfDataUri,
  type BoardArtExtras,
} from '../lib/boardArt'
import { Modal } from './Modal'

/**
 * Temporäre Spielbrett-Seite: bearbeitbares Brett mit zwei Startwegen
 * (Ausbildung kurz, Studium lang) und Serpentinen-Hauptweg – Felder
 * verschieben, Typ/Text/Weg ändern, einfügen/löschen und im Comic-Design
 * als PDF exportieren. Alle Änderungen liegen im geteilten Zustand und
 * werden gespeichert/gesynct.
 */
export function SpielbrettView() {
  const { state, moveBoardField, insertBoardField, resetBoard } = useStore()
  const board = state.board
  const [moveMode, setMoveMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingTables, setExportingTables] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  // Auf der Karten-Seite eingestellte Farben & Tabellen-Inhalte – fließen
  // in die Editor-Ansicht und in den PDF-Export mit ein.
  const boardColors = boardColorOverrides(state.fieldColors)
  const extras: BoardArtExtras = {
    colors: boardColors,
    kingstabelle: tableRows(state.tables.kingstabelle),
    minigames: tableRows(state.tables.minigames),
  }
  const tileColor = (type: BoardFieldType) => boardColors[type] ?? boardFieldDef(type).color

  // Vorschau-Hooks für automatisierte Layout-Checks & PDF-Erzeugung.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__fdlBoardPreview = (scale = 0.35) => renderBoardToDataUrl(board, scale, extras)
    w.__fdlTablesPdfDataUri = () => tablesPdfDataUri(extras)
    return () => {
      delete w.__fdlBoardPreview
      delete w.__fdlTablesPdfDataUri
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, state.fieldColors, state.tables])

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
    say(`${boardFieldDef(type).label} ans Ende des Hauptwegs angefügt`)
  }

  const exportPdf = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportBoardPdf(board, extras)
      say('Spielbrett als PDF exportiert 🖨️')
    } catch (err) {
      console.error('[spielbrett] PDF-Export fehlgeschlagen –', err)
      say('PDF-Export fehlgeschlagen 😕')
    } finally {
      setExporting(false)
    }
  }

  const exportTables = async () => {
    if (exportingTables) return
    setExportingTables(true)
    try {
      await exportTablesPdf(extras)
      say('Kingstabelle & Minigames als PDF exportiert 🖨️')
    } catch (err) {
      console.error('[spielbrett] Tabellen-PDF-Export fehlgeschlagen –', err)
      say('Tabellen-PDF-Export fehlgeschlagen 😕')
    } finally {
      setExportingTables(false)
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
        style={{ '--f': tileColor(field.type) } as CSSProperties}
        onPointerDown={(e) => onTilePointerDown(e, index)}
        onPointerMove={onTilePointerMove}
        onPointerUp={(e) => onTilePointerUp(e, field)}
        onPointerCancel={cancelDrag}
        onClick={() => {
          if (!moveMode) setEditId(field.id)
        }}
      >
        <span className="sb-num">{num}</span>
        <img className="sb-icon" src={iconDataUrl(iconKindOf(field), 56, '#2b2118')} alt={def.label} />
        {field.text && <span className="sb-text">{field.text}</span>}
      </button>
    )
  }

  return (
    <section className="spielbrett" onTouchStart={swallowTouch} onTouchEnd={swallowTouch}>
      <p className="muted small page-intro">
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
        <button className="btn small ghost" disabled={exporting} onClick={exportPdf}>
          {exporting ? '⏳ Exportiere …' : '📄 Brett als PDF'}
        </button>
        <button className="btn small ghost" disabled={exportingTables} onClick={exportTables}>
          {exportingTables ? '⏳ Exportiere …' : '👑 Tabellen als PDF'}
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
            style={{ '--f': tileColor(d.type) } as CSSProperties}
            onClick={() => addField(d.type)}
            title={`${d.label} hinzufügen`}
          >
            <img
              className="sb-chip-icon"
              src={iconDataUrl(d.type === 'start' ? 'start-ausbildung' : d.type, 36, '#2b2118')}
              alt=""
            />
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
              münden in Feld 1 des Hauptwegs (Flunk-Feld). Auf dem gedruckten
              Brett stehen rechts zusätzlich Kingstabelle &amp; Minigames.
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
      {drag && board.fields[drag.fromIndex] && (
        <div className="sb-ghost">
          <img
            src={iconDataUrl(iconKindOf(board.fields[drag.fromIndex]), 72, '#2b2118')}
            alt=""
            style={{ left: drag.x, top: drag.y, position: 'fixed' }}
            className="sb-ghost-img"
          />
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
  const { state, updateBoardField, insertBoardField, removeBoardField } = useStore()
  const def = boardFieldDef(field.type)
  const boardColors = boardColorOverrides(state.fieldColors)

  return (
    <Modal title={`${def.label} – Feld ${label}`} onClose={onClose}>
      <div className="field">
        <span>Feldtyp</span>
        <div className="sb-type-grid">
          {BOARD_FIELD_DEFS.map((d) => (
            <button
              key={d.type}
              className={d.type === field.type ? 'sb-type selected' : 'sb-type'}
              style={{ '--f': boardColors[d.type] ?? d.color } as CSSProperties}
              onClick={() => updateBoardField(field.id, { type: d.type })}
            >
              <img
                className="sb-type-icon"
                src={iconDataUrl(d.type === 'start' ? 'start-ausbildung' : d.type, 40, '#2b2118')}
                alt=""
              />
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
