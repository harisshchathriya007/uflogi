let mapsLoader = null

function waitForMaps(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const check = () => {
      if (window.google?.maps?.Map) {
        resolve(window.google)
        return
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Google Maps failed to initialize'))
        return
      }
      window.setTimeout(check, 100)
    }
    check()
  })
}

export function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps key missing'))
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google)
  }
  if (mapsLoader) {
    return mapsLoader
  }

  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="urbanflow"]')
    if (existing) {
      existing.addEventListener('load', () => waitForMaps().then(resolve).catch(reject), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps', 'urbanflow')
    script.onload = () => waitForMaps().then(resolve).catch(reject)
    script.onerror = reject
    document.body.appendChild(script)
  })

  return mapsLoader
}
