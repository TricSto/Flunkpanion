import type { CSSProperties } from 'react'
import { iconDataUrl, type IconKind } from '../lib/boardArt'
import type { DeckType } from '../types'

/**
 * Vektor-Icon vom Spielbrett als Inline-Symbol für Buttons, Überschriften
 * und Kacheln in der App. Das Icon wird als CSS-Maske gerendert und färbt
 * sich über `currentColor` automatisch passend zur umgebenden Textfarbe.
 */
export function FieldIcon({
  kind,
  size = '1em',
  className,
}: {
  kind: IconKind
  /** Kantenlänge, z. B. '1em' (Standard) oder eine feste Pixelzahl. */
  size?: number | string
  className?: string
}) {
  const mask = `url(${iconDataUrl(kind, 96, '#000')})`
  const style: CSSProperties = {
    width: size,
    height: size,
    WebkitMaskImage: mask,
    maskImage: mask,
  }
  return (
    <span
      className={className ? `ficon ${className}` : 'ficon'}
      style={style}
      aria-hidden="true"
    />
  )
}

/** Brett-Icon zu einem Karten-Deck (nach Deck-Art). */
export const DECK_ICON_KIND: Record<DeckType, IconKind> = {
  job: 'berufswechsel',
  salary: 'zahltag',
  action: 'aktion',
  special: 'gamechanger',
  challenge: 'challenge',
  event: 'ereignis',
}
