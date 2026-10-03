import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './css/index.css'
import App from './App.tsx'
import { attachPostHogListeners, setPostHogConsentFromStorage } from './lib/posthog'

setPostHogConsentFromStorage()
attachPostHogListeners()
injectSpeedInsights()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
