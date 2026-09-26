import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './css/index.css'
import App from './App.tsx'
import { initializePostHog } from './utils/posthog'
import { PostHogPageView } from './components/PostHogPageView'

initializePostHog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <PostHogPageView />
      <App />
    </HashRouter>
    <Analytics />
  </StrictMode>,
)
