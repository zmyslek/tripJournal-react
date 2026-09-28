import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './css/index.css'
import App from './App.tsx'
import { initializePostHog } from './utils/posthog'
import { registerStaleChunkReload } from './utils/staleChunkReload'
import { PostHogPageView } from './components/PostHogPageView'

initializePostHog()
registerStaleChunkReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <PostHogPageView />
      <App />
    </HashRouter>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
