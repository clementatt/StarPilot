import assert from "node:assert/strict"
import { translateText, localizeDocument } from "../web/js/localization.js"

assert.equal(translateText("  Home\n", { Home: "ホーム" }), "  ホーム\n")
assert.equal(translateText("SpeedLimitController", {}), "SpeedLimitController")
assert.equal(translateText("Save", { Save: "$&<text>" }), "$&<text>", "translations remain literal text")

const doc = { documentElement: {} }
class Element {
  constructor(tag, attrs = {}, children = []) {
    this.nodeType = 1; this.tag = tag; this.attrs = { ...attrs }; this.childNodes = children; this.ownerDocument = doc
    for (const child of children) child.parentElement = this
  }
  matches(selector) {
    return selector.split(",").some(value => value === "select[hidden]" ? this.tag === "select" && this.hasAttribute("hidden") : value === "option:not([value])" ? this.tag === "option" && !this.hasAttribute("value") : value.startsWith("[") ?
      value === "[translate=no]" ? this.attrs.translate === "no" : Object.hasOwn(this.attrs, value.slice(1, -1)) : this.tag === value)
  }
  closest(selector) { return this.matches(selector) || this.parentElement?.closest(selector) }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key) }
  getAttribute(key) { return this.attrs[key] }
  setAttribute(key, value) { this.attrs[key] = value }
}
const text = value => ({ nodeType: 3, nodeValue: value })
const label = text("Home"), dynamic = text("Save"), technical = text("Save")
const input = new Element("input", { placeholder: "Search", value: "Home" })
const root = new Element("main", {}, [new Element("button", { title: "Home" }, [label]),
  new Element("span", {}, [dynamic]), new Element("code", {}, [technical]), input,
  new Element("span", { translate: "no" }, [text("Save")])])
const records = new WeakMap()
localizeDocument(root, { language: "ja", messages: { Home: "ホーム", Save: "保存", Search: "検索" } }, records)
assert.equal(label.nodeValue, "ホーム")
assert.equal(input.attrs.placeholder, "検索")
assert.equal(input.attrs.value, "Home")
assert.equal(technical.nodeValue, "Save")
assert.equal(doc.documentElement.lang, "ja")
dynamic.nodeValue = "Home" // Vue changed the source while another language was active.
localizeDocument(root, { language: "fr", messages: { Home: "Accueil", Save: "Enregistrer", Search: "Rechercher" } }, records)
assert.equal(label.nodeValue, "Accueil")
assert.equal(dynamic.nodeValue, "Accueil")
localizeDocument(root, { language: "en", messages: {} }, records)
assert.equal(label.nodeValue, "Home")
assert.equal(dynamic.nodeValue, "Home")
assert.equal(input.attrs.placeholder, "Search")
assert.equal(root.childNodes[0].attrs.title, "Home")

const dynamicMessages = { "{} drives": "{} trayectos", "Saved {count} items for {name}": "Para {name}: {count} elementos guardados",
  "Preparing {} ({}%)": "Preparando {} ({}%)" }
assert.equal(translateText("3 drives", dynamicMessages), "3 trayectos")
assert.equal(translateText("Saved 12 items for Dom", dynamicMessages), "Para Dom: 12 elementos guardados")
assert.equal(translateText("Preparing Alpha (23%)", dynamicMessages), "Preparando Alpha (23%)")
assert.equal(translateText("Some unknown diagnostic", dynamicMessages), "Some unknown diagnostic")

// A template whose literal lacks "·" must not swallow " · "-joined segments; each segment is translated on its own.
const segmentMessages = { "{} remaining": "剩余 {}", "Updating drive history": "正在更新行驶记录", "In {}": "{} 后",
  "In range, signal {}%": "在范围内，信号 {}%", "{label} AOL steering only · {count} drives": "{label} 仅 AOL 转向 · {count} 次行程",
  "Unavailable": "不可用" }
assert.equal(translateText("Updating drive history · 3 remaining", segmentMessages), "正在更新行驶记录 · 剩余 3")
assert.equal(translateText("3 remaining", segmentMessages), "剩余 3", "undotted text still uses undotted templates")
assert.equal(translateText("In range, signal 80% · Auto-join", segmentMessages), "在范围内，信号 80% · Auto-join")
assert.equal(translateText("In 5 min", segmentMessages), "5 min 后")
assert.equal(translateText("Unavailable AOL steering only · 4 drives", segmentMessages), "不可用 仅 AOL 转向 · 4 次行程",
  "a template whose literal contains · still matches the whole text")
assert.equal(translateText("Updating drive history\n3 remaining", segmentMessages), "正在更新行驶记录\n剩余 3")
assert.equal(translateText("Mise à jour · 3 remaining", { "{} remaining": "{} restants" }), "Mise à jour · 3 restants")

// Single-letter unit marks are as generic as connectives: names without a number stay literal.
const durationMessages = { "{}h {}m": "{} 小时 {} 分" }
assert.equal(translateText("1h 05m", durationMessages), "1 小时 05 分")
assert.equal(translateText("Smith Farm", durationMessages), "Smith Farm")
assert.equal(translateText("Search by platform", durationMessages), "Search by platform")

// Unnamed fields after a named one are numbered like the translation's unnamed fields.
assert.equal(translateText("Partial: Unavailable / 1.2 GB", { "Partial: {label} / {}": "部分：{label} / {}", Unavailable: "不可用" }),
  "部分：不可用 / 1.2 GB")
assert.equal(translateText('Expires in 1 day', {'{} day':'{}일','Expires in {} day{}':'{}일{} 후 만료'}), '1일 후 만료')
assert.equal(translateText('1 minute Left', {'{} minute{} Left':'{}분{} 남음'}), '1분 남음')

const implicitText = text("Save"), explicitText = text("Save")
const selectRoot = new Element("select", {}, [new Element("option", {}, [implicitText]),
  new Element("option", {value:"saved-id"}, [explicitText])])
localizeDocument(selectRoot, {language:"ja",messages:{Save:"保存"}})
assert.equal(implicitText.nodeValue,"Save","implicit option values must remain unchanged")
assert.equal(explicitText.nodeValue,"保存")
assert.equal(selectRoot.childNodes[1].attrs.value,"saved-id")
assert.equal(translateText("Switch to light mode", {"{} to {}":"{}から{}へ"}), "Switch to light mode")

const hiddenText = text("Save")
const hiddenNative = new Element("select", {hidden:""}, [new Element("option", {value:"saved-id"}, [hiddenText])])
localizeDocument(hiddenNative, {language:"ja",messages:{Save:"保存"}})
assert.equal(hiddenText.nodeValue,"Save","GalaxySelect must retain canonical hidden option labels for sync()")
assert.equal(translateText('Reset Language to default', {Language:'Sprache','Reset {label} to default':'{label} zurücksetzen'}),'Sprache zurücksetzen')
