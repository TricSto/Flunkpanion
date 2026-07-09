/* Misst die tatsächlich sichtbare Viewport-Höhe und hält sie als
   CSS-Variable --vvh auf <html> aktuell.

   Hintergrund: `100dvh` ist auf Mobilgeräten beim ersten Laden nicht
   verlässlich – iOS Safari rechnet die eingeblendete Adressleiste erst nach
   dem ersten Scrollen heraus, Chrome auf Android verhält sich je nach Version
   ähnlich. Dadurch war das Spielfeld anfangs höher als der sichtbare Bereich
   und die unteren Texte der Felder wurden abgeschnitten.
   `window.innerHeight` liefert dagegen von Anfang an den korrekten Wert. */
export function initViewportHeightVar(): void {
  const update = () => {
    document.documentElement.style.setProperty('--vvh', `${window.innerHeight}px`)
  }
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  window.addEventListener('pageshow', update)
  // iOS feuert beim Ein-/Ausblenden der Browserleiste nicht immer ein
  // window-resize – der visualViewport meldet die Änderung zuverlässig.
  window.visualViewport?.addEventListener('resize', update)
}
