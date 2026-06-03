import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './css/index.css'
import App from './App.tsx'
import { attachPostHogListeners, setPostHogConsentFromStorage } from './lib/posthog'

setPostHogConsentFromStorage()
attachPostHogListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
