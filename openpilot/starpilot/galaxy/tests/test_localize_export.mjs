import assert from "node:assert/strict"
import fs from "node:fs"
import { localize, localizeDocument } from "../web/js/localization.js"
import { deleteRecords } from "../web/js/record-deletion.js"

const UNPAIR = "Unpair from Galaxy? Remote access will stop until you pair again."
const SENTRY = "Delete all Sentry events and their saved artifacts? This cannot be undone."
const CRASHES = "Delete all crash reports and their saved artifacts? This cannot be undone."
// localizeDocument needs only an element it may skip and a document to mark with the language.
const root = { nodeType: 1, matches: () => true, ownerDocument: { documentElement: {} } }

// Before the page has applied a catalog, text outside the DOM stays as written.
assert.equal(localize(UNPAIR), UNPAIR)
assert.equal(localize(undefined), undefined)

// After it has, window.confirm text uses the page's catalog and its matching rules, templates included.
localizeDocument(root, { language: "zh-CHS", messages: {
  [UNPAIR]: "取消与 Galaxy 的配对？取消后远程访问将停止，直到您重新配对。",
  "Use {} after the next device reboot? The current session stays unchanged.": "下次设备重启后使用 {}？当前会话保持不变。",
  [SENTRY]: "删除全部哨兵事件及其已保存的文件？此操作无法撤销。",
  [CRASHES]: "删除全部崩溃报告及其已保存的文件？此操作无法撤销。",
} })
assert.equal(localize(UNPAIR), "取消与 Galaxy 的配对？取消后远程访问将停止，直到您重新配对。")
assert.equal(localize("Use Konik after the next device reboot? The current session stays unchanged."), "下次设备重启后使用 Konik？当前会话保持不变。")
assert.equal(localize("  " + UNPAIR + "\n"), "  取消与 Galaxy 的配对？取消后远程访问将停止，直到您重新配对。\n", "surrounding whitespace is kept")
assert.equal(localize("Not in the catalog"), "Not in the catalog")
assert.equal(localize(42), 42, "only text is translated")

// Deleting every record asks one whole, translated question per record type.
for (const [subject, question] of [["Sentry events", "删除全部哨兵事件及其已保存的文件？此操作无法撤销。"], ["crash reports", "删除全部崩溃报告及其已保存的文件？此操作无法撤销。"]]) {
  let asked = null
  const feed = { active: true, deleting: false }
  assert.equal(await deleteRecords(feed, "/delete", { all: true, confirmed: true }, { subject, confirm: value => { asked = value; return false } }), false)
  assert.equal(asked, question)
}

// The latest catalog wins: switching back to English shows English again.
localizeDocument(root, { language: "en", messages: {} })
assert.equal(localize(UNPAIR), UNPAIR)

// Every window.confirm in Galaxy passes its whole question through localize().
const js = new URL("../web/js/", import.meta.url)
for (const file of fs.readdirSync(js).filter(name => name.endsWith(".js"))) {
  const source = fs.readFileSync(new URL(file, js), "utf8")
  for (const call of source.matchAll(/window\.confirm\(|globalThis\.confirm\(/g)) {
    assert.match(source.slice(call.index, call.index + 40), /confirm\((localize\(|message\))/, `${file} translates its confirm() question`)
  }
}
assert.match(fs.readFileSync(new URL("record-deletion.js", js), "utf8"), /confirm\(localize\(question\)\)/)
console.log("localize export: confirm text follows the applied catalog")
