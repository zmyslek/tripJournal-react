import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { capturePostHogPageView } from '../utils/posthog'

export function PostHogPageView() {
  const location = useLocation()
  const lastPage = useRef<string | null>(null)
  const page = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (lastPage.current === page) {
      return
    }

    lastPage.current = page
    capturePostHogPageView(window.location.href)
  }, [page])

  return null
}