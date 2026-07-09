import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store'
import { App } from './App'
import { applyTheme, loadTheme } from './theme'
import { initViewportHeightVar } from './lib/viewport'
import './styles.css'

// Theme vor dem ersten Rendern setzen, damit nichts aufblitzt.
applyTheme(loadTheme())
// Echte sichtbare Höhe (--vvh) vor dem ersten Rendern messen, damit das
// Spielfeld von Anfang an in den Bildschirm passt (100dvh ist beim ersten
// Laden auf iOS/Android teils zu groß).
initViewportHeightVar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
