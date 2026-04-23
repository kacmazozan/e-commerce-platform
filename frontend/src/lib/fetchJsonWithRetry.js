function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJsonWithRetry(
  url,
  { attempts = 10, delayMs = 1000, fetchOptions } = {}
) {
  let lastError = new Error('Request failed')

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      await delay(delayMs)
    }
  }

  throw lastError
}
