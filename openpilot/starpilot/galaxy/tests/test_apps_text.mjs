import assert from "node:assert/strict"
import { localizeDocument } from "../web/js/localization.js"
import { StarPortPage, connectionProgress, importProblem } from "../web/js/starport.js"
import { StarPortGuidedSetup, guidedState } from "../web/js/starport-guided.js"
import { SpotifyPage } from "../web/js/spotify.js"
import { SoftwarePage } from "../web/js/software-status.js"
import { RouteWorkspace } from "../web/js/route-workspace.js"
import { ReplayViewer } from "../web/js/replay.js"
import { LocalRecordingsPage } from "../web/js/record-history.js"

// Galaxy translates each DOM text node on its own: these pages keep every sentence whole in one node,
// and device names, app names and branch names in nodes of their own that are never translated.
const computed = (component, key, state) => component.computed[key].call(state)

// StarPort: "Connect to", "Connected to", "Ready for" are whole; the paired device's name follows as written.
assert.match(StarPortPage.template, /Connect to <span translate="no">\{\{ connectTarget \}\}<\/span>/)
assert.doesNotMatch(StarPortPage.template, /'Connect to ' \+/)
const named = { wired: false, app: "", wirelessHome: true, selected: { name: "Toyota Camry" } }
assert.equal(computed(StarPortPage, "homeTitle", { ...named, homeDevice: "Toyota Camry", projecting: true }), "Connected to")
assert.equal(computed(StarPortPage, "homeTitle", { ...named, homeDevice: "Toyota Camry", runtime: { running: true } }), "Connecting to")
assert.equal(computed(StarPortPage, "homeTitle", { ...named, homeDevice: "", projecting: true }), "Connected to car")
assert.equal(computed(StarPortPage, "homeDevice", named), "Toyota Camry")
assert.match(StarPortPage.template, /\{\{ homeTitle \}\}<template v-if="homeDevice"> <span translate="no">\{\{ homeDevice \}\}<\/span><\/template>/)
assert.deepEqual([connectionProgress(null, { selected: { name: "Toyota Camry" } })].map(({ title, name }) => [title, name]), [["Ready for", "Toyota Camry"]])
assert.deepEqual([connectionProgress(null, { app: "Open Headunit" })].map(({ title, name }) => [title, name]), [["Ready for", "Open Headunit"]])
assert.equal(connectionProgress(null).title, "Pair your device first")
assert.match(StarPortPage.template, /<span translate="no">\{\{ pairing\.receiver\.name \}\}<\/span> \{\{ pairing\.state === 'connected' \? 'connected\.' : 'paired\.' \}\}/)
assert.match(StarPortPage.template, /'Device connected\.' : 'Device paired\.'/)
// The certificate status and the reassurance are separate sentences; each download hint is one sentence.
assert.match(StarPortPage.template, /\{\{ expiry\.label \}\}<\/p>\s*<p v-if="setup\.identity\.installed" class="gx-note">Your paired car and settings stay as they are\.<\/p>/)
assert.match(StarPortPage.template, /'Saves the app to this phone' : 'Saves the app to this computer'/)
// Help lists keep each answer in one node: page labels are quoted instead of split by <strong>.
for (const sentence of ["and use “Download APK Bundle” there.", "make sure the app is Android Auto by Google LLC, and that the variant name ends in “‑release” (not beta or alpha).",
  "Scroll down to “Available downloads”. Under “Variant”, click the 17.x.xxxx‑release or 18.x.xxxx‑release entry.",
  "Click “Download APK Bundle” (or “Download APK”). You get an .apk, .xapk or .apkm file. Leave it zipped.",
  "join the comma’s TheGalaxy network after turning on its hotspot: <a", "From APKPure, a third-party mirror. Don’t unzip it. <a"]) assert(StarPortPage.template.includes(sentence), sentence)
assert.equal(importProblem({ state: "failed", code: "WRONG_APP" }, "maps.apk"), "Wrong app selected (maps.apk). Choose Android Auto by Google LLC.")
assert.equal(importProblem({ state: "failed", code: "EXPIRED" }), "This Android Auto version expired. Download a newer stable release.")

// Guided setup: one sentence per count.
assert.match(StarPortGuidedSetup.template, /hangups === 1">It hung up once before sending anything/)
assert.match(StarPortGuidedSetup.template, /"1 try" : step\.tries \+ " tries"/)
const hangups = carType => guidedState({ setup: { identity: { installed: true } }, carType, runtime: { running: true, state: "connecting_bluetooth", hangups: 7 } }).notice
assert.equal(hangups("adapter"), "The adapter has hung up 7 times before answering. If this keeps happening, unplug the adapter for 10 seconds.")
assert.equal(hangups("builtin"), "The car has hung up 7 times before answering. If this keeps happening, turn the car off and on again.")
assert.match(StarPortPage.template, /\{\{ adapterSetup \? '2\. Adapter paired' : '2\. Car paired' \}\}/)

// Spotify: the release label and the reassurance are separate; help answers are one sentence each.
assert.doesNotMatch(SpotifyPage.template, /release\.label \+ '\./)
assert.match(SpotifyPage.template, /<p v-if="setup\.release\.installed" class="gx-note">Your settings and Spotify sign-in stay as they are\.<\/p>/)
for (const sentence of ["or tap “Pair phone” on the Bluetooth page. Then choose it below", "Yes. Under “Send audio to”, choose “Car speakers via StarPort (Android Auto)”, and music",
  "this step shows “Update”; download again the same way.", "on the Bluetooth page, or use StarPort. <a", "on the Bluetooth page first. <a"]) assert(SpotifyPage.template.includes(sentence), sentence)

// Software: whole sentences per count and per dialog; dates and branch names.
const labels = SoftwarePage.methods
assert.deepEqual([1, 3, 24].map(labels.collapsedLabel), ["Load 1 collapsed version", "Load 3 collapsed versions", "Load 10 of 24 collapsed versions"])
assert.deepEqual([1, 4, 30].map(labels.olderLabel), ["Load 1 more older version", "Load 4 more older versions", "Load 10 more older versions"])
assert.doesNotMatch(SoftwarePage.template, /collapsed \{\{|more older \{\{|'Switch to ' \+/)
assert.deepEqual(["stable", "testing", "StarPilot", "Dom", "release-chestnut"].map(labels.switchLabel), ["Switch to Stable", "Switch to Testing",
  "Switch to Stable — StarPilot (legacy name)", "Switch to Testing — Dom (legacy name)", "Switch to release-chestnut"])
const asked = { canInstallSelection: true, selectedVersion: { hash: "a".repeat(40), subject: "Fix maps" }, listedPreviousVersion: null, downloadedCommit: null,
  draftBranch: "stable", data: { installed: { commit: "b".repeat(40) } }, selectedVersionAction: "Download and install selected version", shortCommit: labels.shortCommit }
labels.askSelectedVersion.call(asked)
assert.equal(asked.dialog.message, "Download and install Fix maps (aaaaaaaa) and restart the device?")
assert.match(SoftwarePage.template, /<span translate="no">\{\{ data\.installed\.branch \}\}<\/span><\/a>/)
const root = { nodeType: 1, matches: () => true, ownerDocument: { documentElement: {} } }
localizeDocument(root, { language: "zh-CHS", messages: {} })
assert.equal(labels.reported("2026-11-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z").toLocaleString("zh-Hans"), "dates follow the StarPilot language")
localizeDocument(root, { language: "en", messages: {} })

// Routes and replay: camera names, progress and export outcomes are whole; the gap list ends its own paragraph.
assert.deepEqual(["fcamera", "dcamera", "ecamera", "qcamera"].map(RouteWorkspace.methods.footageFormat),
  ["Road camera · MP4", "Driver camera · MP4", "Wide camera · MP4", "Quick camera · MP4"])
assert.match(RouteWorkspace.template, /'Rendering route' : 'Rendering segment ' \+ job\.segment/)
assert.match(RouteWorkspace.template, /'Replay export failed\.' : 'Replay export cancelled\.'/)
assert.match(RouteWorkspace.template, /'1 saved segment' : route\.segments\.length \+ ' saved segments'/)
assert.match(RouteWorkspace.template, /<span>\{\{ route\.reason \|\| 'Some route files could not be inspected\.' \}\}<\/span> Route downloads require a complete inventory\./)
assert.doesNotMatch(RouteWorkspace.template, /Replay export \{\{|' camera · MP4'/)
assert.match(LocalRecordingsPage.template, /'Replay export failed' : 'Replay export cancelled'/)
assert.match(ReplayViewer.template, /<\/span><\/p><p class="gx-note">Seeks move to the nearest recorded position\.<\/p>/)
console.log("apps text: StarPort, Spotify, software and route sentences stay whole")
