import { requestJson } from "./startup.js"
import { localize } from "./localization.js"

// Whole questions per record type, so each language keeps its own word order (window.confirm is not translated in the DOM).
const DELETE_ALL_QUESTIONS = {
  "crash reports": "Delete all crash reports and their saved artifacts? This cannot be undone.",
  "Sentry events": "Delete all Sentry events and their saved artifacts? This cannot be undone.",
}

export const storedSize = bytes => Number.isFinite(bytes) && bytes >= 0
  ? bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB`
    : bytes < 1073741824 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1073741824).toFixed(2)} GB` : "Unavailable"

export async function deleteRecords(feed, url, selection, { valid, accept, confirm = message => globalThis.confirm(message), subject }) {
  if (!feed.active || feed.deleting) return false
  const question = DELETE_ALL_QUESTIONS[subject] || `Delete all ${subject} and their saved artifacts? This cannot be undone.`
  if (selection.all && !confirm(localize(question))) return false
  feed.deleting = true
  feed.poller.stop()
  const generation = ++feed.generation
  feed.request?.abort()
  if (feed.timer != null) (feed.cancelTimer || feed.cancel)(feed.timer)
  feed.timer = null
  const request = new AbortController()
  feed.request = request
  feed.publish({ deleting: true, error: "", selected: null, preview: null, previewStatus: "idle" })
  try {
    for (let batch = 0; batch < 32; batch++) {
      const data = await requestJson(url, { fetcher: feed.fetcher, later: feed.later, cancel: feed.cancelTimer || feed.cancel,
        request: { method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal, body: JSON.stringify(selection) } })
      if (!feed.active || generation !== feed.generation || request.signal.aborted) return false
      if (!valid(data) || typeof data.more !== "boolean") throw new Error("Invalid deletion response")
      accept(data)
      if (!data.more) return true
      if (!selection.all) throw new Error("Stored artifacts remain; refresh and retry")
    }
    throw new Error("More stored artifacts remain. Delete All again to finish cleanup.")
  } catch (error) {
    if (!feed.active || generation !== feed.generation) return false
    if (error.status === 401 || ["access_unavailable", "setup_required"].includes(error.code)) { feed.stop(); feed.unauthorized(); return false }
    feed.publish({ error: error.message || "Stored records could not be deleted" })
    return false
  } finally {
    feed.deleting = false
    if (feed.active && generation === feed.generation) {
      feed.request = null
      feed.publish({ deleting: false })
      feed.poller.start()
    }
  }
}
