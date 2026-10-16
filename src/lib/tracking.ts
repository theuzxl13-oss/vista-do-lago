/** Captura parâmetros UTM da visita para identificar a origem do lead. */
const KEY = 'vdl_utm'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']

export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const k of UTM_KEYS) {
      const v = params.get(k)
      if (v) utm[k] = v.slice(0, 120)
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
      utm.referrer = document.referrer.slice(0, 200)
    }
    if (Object.keys(utm).length) sessionStorage.setItem(KEY, JSON.stringify(utm))
  } catch {
    /* armazenamento indisponível: segue sem UTM */
  }
}

export function getUtm(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : null
  } catch {
    return null
  }
}
