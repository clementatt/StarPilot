import { requestJson } from "./startup.js"
import { ref } from "../vendor/vue/vue.esm-browser.js"

const language = ref(undefined)
const setDisplayLanguage = value => { language.value = value }
export const displayLocale = () => ({"zh-CHS":"zh-Hans","zh-CHT":"zh-Hant"}[language.value] || language.value)

// Translate presentation only: Vue's values, requests and technical identifiers stay in English.
const ATTRIBUTES = ["title", "aria-label", "placeholder", "alt"]
const PROTECTED = "script,style,code,pre,textarea,input,select[hidden],option:not([value]),[contenteditable],[translate=no]"

// The rules are shared with native display text (system/ui/lib/display_translation.py); change both together.
const compiled = new WeakMap()
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const tokens = text => [...text.matchAll(/\{([^{}]*)\}/g)]
const CONNECTIVES = new Set(["to", "of", "in", "on", "at", "by", "for", "or", "and", "a", "the"])
// What a connective-only template may capture: a number with a short unit ("100 %", "3 km") or a short token.
const GENERIC_VALUE = /^[\d.,:+\-−–%°]+(\s?\S{1,5})?$|^\S{0,5}$/
const lowerLiterals = source => source.split(/(\{[^{}]*\})/).map((part, index) => index % 2 ? part : part.toLowerCase()).join("")

function template(source, translated) {
  const fields = tokens(source), target = tokens(translated)
  if (!fields.length || fields.length !== target.length) return
  let offset = 0, pattern = "^"
  // Unnamed fields are numbered among themselves, exactly as they are when the translation is filled in.
  let unnamed = 0
  const keys = fields.map(field => field[1].split(/[!:]/, 1)[0] || String(unnamed++))
  for (const field of fields) {
    pattern += escapeRegex(source.slice(offset, field.index)) + "([^\\n]*?)"
    offset = field.index + field[0].length
  }
  pattern += escapeRegex(source.slice(offset)) + "$"
  const literal = source.replace(/\{[^{}]*\}/g, "")
  const content = (literal.toLowerCase().match(/[a-z]+/g) || []).filter(word => word.length > 1 && !CONNECTIVES.has(word))
  // Without a content word the template needs a number ("Smith Farm" is no "{}h {}m"); with only one it would swallow
  // any sentence that starts or ends with that word ("Set speed is a maximum…"). See fill().
  return { generic: !content.length, short: content.length === 1 && literal.trim().split(/\s+/).length <= 2,
    dotted: literal.includes("·"), specificity: source.length - fields.reduce((sum, field) => sum + field[0].length, 0),
    prefix: source.slice(0, fields[0].index), pattern: new RegExp(pattern), keys, translated }
}

function compile(entries) {
  const result = []
  for (const [source, translated] of entries) {
    const compiledTemplate = translated && template(source, translated)
    if (compiledTemplate) result.push(compiledTemplate)
  }
  return result.sort((a, b) => b.specificity - a.specificity || a.keys.length - b.keys.length)
}

function templates(messages) {
  if (compiled.has(messages)) return compiled.get(messages)
  // Lower-case text such as "always on lateral" falls back to "Always On Lateral". Msgids that are lower-case already are
  // looked up directly; lower-case keys whose variants translate differently ("Drive Above" / "Drive above") are dropped.
  const variants = new Map()
  for (const [source, translated] of Object.entries(messages)) {
    const lowered = lowerLiterals(source)
    if (translated && lowered !== source) variants.set(lowered, (variants.get(lowered) || new Set()).add(translated))
  }
  const lowered = new Map([...variants].filter(([, translations]) => translations.size === 1).map(([key, translations]) => [key, [...translations][0]]))
  const result = { list: compile(Object.entries(messages)), lowered, loweredList: compile(lowered) }
  compiled.set(messages, result)
  return result
}

function lookup(text, messages, catalog) {
  if (Object.hasOwn(messages, text) && messages[text]) return messages[text]
  if (text === text.toLowerCase()) return catalog.lowered.get(text)
}

// A single word such as a device name, or a number with at most two words around it ("25 mph", "3 GiB / 3 GiB").
const plainValue = value => value.split(/\s+/).filter(Boolean).length <= 1 || /\d/.test(value) && (value.match(/[A-Za-z]{2,}/g) || []).length <= 2

// What a one-word template ("Set {}", "{} drive") may capture without swallowing a sentence. A catalog phrase fits a
// {label}, which translates it. In an unnamed {} it would stay English next to the translated word ("active 车型"),
// unless it translates to itself ("mph"); a named field such as {name} keeps it as a literal name.
function shortValue(key, value, messages, catalog) {
  const translated = lookup(value, messages, catalog)
  if (translated && (key === "label" || translated === value)) return true
  return !(translated && /^\d+$/.test(key)) && plainValue(value)
}

function fill(template, text, messages, catalog, lowered) {
  if (!text.startsWith(template.prefix)) return
  const matched = template.pattern.exec(text)
  if (!matched) return
  const captured = matched.slice(1).map(value => value.trim())
  // A connective-only template takes numbers ("0 to 100 %", "In 3 km"), not "…up to 30 seconds…".
  if (template.generic && (!captured.some(value => /\d/.test(value)) || !captured.every(value => GENERIC_VALUE.test(value)))) return
  if (template.short && !captured.every((value, index) => shortValue(template.keys[index], value, messages, catalog))) return
  // Lower-case text has lost the capitals that start a name, so a lower-cased template takes only catalog phrases,
  // numbers and single words: "less than a minute left" is no "{} minute Left".
  if (lowered && !captured.every(value => lookup(value, messages, catalog) || plainValue(value))) return
  const values = Object.fromEntries(template.keys.map((key, index) => [key, matched[index + 1]]))
  if (Object.hasOwn(values, "label")) values.label = lookup(values.label, messages, catalog) || values.label
  let auto = 0
  return template.translated.replace(/\{([^{}]*)\}/g, (token, field) => {
    const key = field.split(/[!:]/, 1)[0] || String(auto++)
    return Object.hasOwn(values, key) ? values[key] : token
  })
}

export function translateText(source, messages) {
  const text = source.trim()
  const catalog = templates(messages)
  let translated = Object.hasOwn(messages, text) ? messages[text] : lookup(text, messages, catalog) || text
  if (translated === text && text.length <= 1024) {
    // Text joined by " · " is translated segment by segment below, unless a template spans the separator itself.
    const segmented = /\s+·\s+/.test(text)
    const groups = text === text.toLowerCase() ? [catalog.list, catalog.loweredList] : [catalog.list]
    search: for (const group of groups) {
      for (const template of group) {
        if (segmented && !template.dotted) continue
        const filled = fill(template, text, messages, catalog, group === catalog.loweredList)
        if (filled !== undefined) { translated = filled; break search }
      }
    }
  }
  if (translated === text && /\n|\s+·\s+/.test(text)) {
    translated = text.split(/(\n|\s+·\s+)/).map((part, index) => index % 2 === 0 ? translateText(part, messages) : part).join("")
  }
  if (translated === text && /^·\s|\s·$/.test(text)) {
    // Try again without the separator at either edge ("Date unavailable ·"), then put it back.
    const [, before = "", inner, after = ""] = /^(·\s*)?([\s\S]*?)(\s*·)?$/.exec(text)
    const result = translateText(inner, messages)
    if (result !== inner) translated = before + result + after
  }
  return translated !== text ? source.replace(text, () => translated) : source
}

export function localizeDocument(root, { language, messages }, records = new WeakMap()) {
  function translate(node, key, source, write) {
    const saved = records.get(node) || {}
    const prior = saved[key]
    const original = prior && prior.output === source ? prior.source : source
    const output = translateText(original, messages)
    saved[key] = { source: original, output }
    records.set(node, saved)
    if (output !== source) write(output)
  }
  function visit(node) {
    if (node.nodeType === 3) {
      if (!node.parentElement?.closest(PROTECTED)) translate(node, "text", node.nodeValue, value => { node.nodeValue = value })
      return
    }
    if (node.nodeType !== 1 || node.matches("script,style,code,pre,[translate=no],[contenteditable]")) return
    for (const key of ATTRIBUTES) {
      if (node.hasAttribute(key)) translate(node, key, node.getAttribute(key), value => node.setAttribute(key, value))
    }
    if (!node.matches(PROTECTED)) for (const child of node.childNodes) visit(child)
  }
  visit(root)
  root.ownerDocument.documentElement.lang = language
  setDisplayLanguage(language)
  appliedMessages = messages
  return records
}

// Text shown outside the DOM (window.confirm) uses the catalog last applied to the page; English until one loads.
let appliedMessages = null
export function localize(text) {
  return appliedMessages && typeof text === "string" ? translateText(text, appliedMessages) : text
}

export function startLocalization(root = document.body, fetcher = fetch) {
  let state = { language: "en", messages: {} }, stopped = false, timer, scheduled = false, generation = 0, request
  const records = new WeakMap()
  const dirty = new Set()
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) dirty.add(mutation.target)
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      const changed = [...dirty].filter(node => node.isConnected)
      dirty.clear()
      if (!stopped) apply(changed)
    })
  })
  function apply(nodes = [root]) {
    observer.disconnect()
    for (const node of nodes) localizeDocument(node, state, records)
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES })
  }
  async function refresh() {
    clearTimeout(timer)
    request?.abort()
    const current = ++generation
    request = new AbortController()
    try {
      const next = await requestJson(`./api/localization?language=${encodeURIComponent(state.language)}`,
        { fetcher, timeout: 4000, request: { signal: request.signal } })
      if (!stopped && current === generation && typeof next.language === "string" && next.messages && typeof next.messages === "object") {
        state = next
        apply()
      }
    } catch { /* Keep the last confirmed language during connection loss. */ }
    if (!stopped && current === generation) timer = setTimeout(refresh, 2000)
  }
  apply()
  globalThis.addEventListener?.("galaxy-language-changed", refresh)
  refresh()
  return () => {
    stopped = true; generation++; request?.abort(); clearTimeout(timer); observer.disconnect()
    globalThis.removeEventListener?.("galaxy-language-changed", refresh)
  }
}
