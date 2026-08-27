const STORAGE_KEY = 'mafia:ios-install-hint'
const REMINDER_DAYS = 60
const REMINDER_MS = REMINDER_DAYS * 24 * 60 * 60 * 1000

type IosNavigator = Navigator & { standalone?: boolean }

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false

  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true

  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isSafariBrowser() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent

  return /safari/i.test(ua) && !/crios|fxios|edgios|opios|duckduckgo|mercury/i.test(ua)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false

  if ((window.navigator as IosNavigator).standalone === true) return true

  return window.matchMedia('(display-mode: standalone)').matches
}

function readDismissedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const value = Number(raw)

    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function rememberInstallHintDismissal() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    return
  }
}

export type InstallHintDiagnostics = {
  userAgent: string
  ios: boolean
  safari: boolean
  standalone: boolean
  dismissedAt: number | null
  eligible: boolean
}

export function installHintDiagnostics(): InstallHintDiagnostics {
  return {
    userAgent: typeof navigator === 'undefined' ? '?' : navigator.userAgent,
    ios: isIosDevice(),
    safari: isSafariBrowser(),
    standalone: isStandalone(),
    dismissedAt: readDismissedAt(),
    eligible: shouldShowInstallHint(),
  }
}

export function shouldShowInstallHint() {
  if (!isIosDevice() || !isSafariBrowser() || isStandalone()) return false

  const dismissedAt = readDismissedAt()

  return dismissedAt === null || Date.now() - dismissedAt > REMINDER_MS
}
