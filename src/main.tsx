import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store'
import { App } from './App'
import { applyTheme, loadTheme } from './theme'
import './styles.css'

// Theme vor dem ersten Rendern setzen, damit nichts aufblitzt.
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
