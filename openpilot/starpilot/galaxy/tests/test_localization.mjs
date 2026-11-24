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

// Lower-case text (C4 lower-cases labels before translating) falls back to the catalog without case.
const caseMessages = { "Always On Lateral": "全时横向控制", "Reset {label} to default": "将 {label} 重置为默认", On: "开",
  "Keep steering active": "保持转向", Active: "当前", active: "活动", "Set {label} to {value}?": "将“{label}”设为 {value}？" }
assert.equal(translateText("always on lateral", caseMessages), "全时横向控制")
assert.equal(translateText(" always on lateral ", caseMessages), " 全时横向控制 ")
assert.equal(translateText("reset always on lateral to default", caseMessages), "将 全时横向控制 重置为默认")
assert.equal(translateText("set always on lateral to 2.5 s?", caseMessages), "将“全时横向控制”设为 2.5 s？")
assert.equal(translateText("on · keep steering active", caseMessages), "开 · 保持转向")
assert.equal(translateText("active", caseMessages), "活动", "an exact lower-case msgid still wins")
assert.equal(translateText("Always on lateral", caseMessages), "Always on lateral", "only text without capitals falls back")
assert.equal(translateText("always on lateral", {}), "always on lateral")
const ambiguousMessages = { "Drive Above": "请提高车速", "Drive above": "车速需高于", OFF: "关闭", Off: "关闭",
  "Recent {} Drives": "最近 {} 次行程", "Recent {} drives": "近期 {} 次行程" }
assert.equal(translateText("drive above", ambiguousMessages), "drive above", "variants that translate differently are skipped")
assert.equal(translateText("Drive Above", ambiguousMessages), "请提高车速")
assert.equal(translateText("off", ambiguousMessages), "关闭", "variants that agree are not ambiguous")
assert.equal(translateText("recent 3 drives", ambiguousMessages), "recent 3 drives")
const loweredMessages = { "{} minute Left": "剩余 {} 分钟", "Delete {} from Favorites?": "从收藏中删除 {}？", "Lane Changes": "变道" }
assert.equal(translateText("3 minute left", loweredMessages), "剩余 3 分钟")
assert.equal(translateText("less than a minute left", loweredMessages), "less than a minute left")
assert.equal(translateText("delete cheddar from favorites?", loweredMessages), "从收藏中删除 cheddar？")
assert.equal(translateText("delete lane changes from favorites?", loweredMessages), "从收藏中删除 lane changes？")
assert.equal(translateText("delete my old model from favorites?", loweredMessages), "delete my old model from favorites?")

// Connective-only templates capture numbers or short tokens, not sentences around "to".
const connectiveMessages = { "{} to {}": "{} 至 {}", "{} to {} {}": "{} 至 {} {}", "In {}": "{} 后" }
assert.equal(translateText("0 to 100 %", connectiveMessages), "0 至 100 %")
assert.equal(translateText("5 to 10", connectiveMessages), "5 至 10")
assert.equal(translateText("In 3 km", connectiveMessages), "3 km 后")
for (const sentence of ["3. You must be ready to take over at any time.", "Joining pauses the Galaxy hotspot for up to 30 seconds.",
  "Connect to Pixel 8", "Receive alerts to steer back into the lane within 2 seconds"]) {
  assert.equal(translateText(sentence, connectiveMessages), sentence)
}

// A template with a single content word must not swallow a sentence that starts or ends with that word.
const shortMessages = { "Set {}": "设置 {}", "{} drive": "{} 次行程", "{} models": "{} 车型", active: "活动", "Open {}": "打开 {}",
  "Saved {}": "已保存 {}", "{} seconds": "{} 秒", "{} {} and above": "{} {} 及以上", mph: "mph", "Checked {label}": "已检查 {label}",
  Today: "今天", "Default: {label}": "默认：{label}", Home: "主页", "Saved for {name}": "已为 {name} 保存" }
for (const sentence of ["Set speed is a maximum, not a target.", "Model selected for the next drive", "active models",
  "Open the StarPilot app and connect to your comma.", "Saved for this browser.", "For prompts, + accepts and − declines within 30 seconds",
  "Default: daily at local midnight. Uses the timezone."]) {
  assert.equal(translateText(sentence, shortMessages), sentence)
}
assert.equal(translateText("Set 25 mph", shortMessages), "设置 25 mph")
assert.equal(translateText("1 drive", shortMessages), "1 次行程")
assert.equal(translateText("5 models", shortMessages), "5 车型")
assert.equal(translateText("Open Networks", shortMessages), "打开 Networks", "a single word is a name")
assert.equal(translateText("Saved 3 items", shortMessages), "已保存 3 items")
assert.equal(translateText("99 mph and above", shortMessages), "99 mph 及以上", "mph translates to itself")
assert.equal(translateText("Checked Today", shortMessages), "已检查 今天", "a {label} translates its catalog phrase")
assert.equal(translateText("Saved for Home", shortMessages), "已为 Home 保存", "a named field keeps a catalog word as a name")
assert.equal(translateText("Default: 5", shortMessages), "默认：5")

// A fragment that carries its neighbour's " · " is translated without it, and the separator is put back.
const edgeMessages = { "Date unavailable": "日期不可用", "Waiting for data": "等待数据", "· Downloaded {label}": "· 已下载 {label}",
  Today: "今天", Cancel: "取消" }
assert.equal(translateText("Date unavailable ·", edgeMessages), "日期不可用 ·")
assert.equal(translateText(" · Waiting for data", edgeMessages), " · 等待数据")
assert.equal(translateText("· Cancel ·", edgeMessages), "· 取消 ·")
assert.equal(translateText("· Downloaded Today", edgeMessages), "· 已下载 今天", "a template with its own · comes first")
assert.equal(translateText("Unknown ·", edgeMessages), "Unknown ·")
assert.equal(translateText("A·B", edgeMessages), "A·B")
