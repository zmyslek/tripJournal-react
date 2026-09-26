import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim()
const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'

let isInitialized = false

export function initializePostHog(): void {
  if (!posthogKey || isInitialized) {
    return
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
  })
  isInitialized = true
}

export function capturePostHogPageView(url: string): void {
  if (!isInitialized) {
    return
  }

  posthog.capture('$pageview', { $current_url: url })
}