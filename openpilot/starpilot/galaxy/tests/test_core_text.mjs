import assert from "node:assert/strict"
import { drivingPage, drivingTitle, DRIVING_PAGES } from "../web/js/driving.js"
import { ModelsPage } from "../web/js/models.js"
import { Home } from "../web/js/home.js"

// Each driving sub-page has one whole English title, so each translates as a sentence.
for (const page of Object.keys(DRIVING_PAGES)) {
  assert.match(drivingTitle(page), /^Driving settings · [a-z ]+$/)
  assert.equal(drivingTitle(page), `Driving settings · ${page.replaceAll("_", " ")}`)
}
assert.equal(drivingPage("/driving/lane_change"), "lane_change")

// Fallback words that become part of a sentence stay in their own text nodes or a single {label} slot.
assert.match(ModelsPage.template, /controls steering · .* controls speed/)
assert.match(ModelsPage.template, /Running now: \{\{ runningModelLabel \}\}<template v-if="pendingNextStart"> · saved changes/)
assert.match(ModelsPage.template, /'Downloading model: ' \+ m\.label/)
assert.doesNotMatch(ModelsPage.template, /'Download ' \+ m\.label|'Downloading ' \+ m\.label/)
assert.match(Home.template, /<template v-if="summary\.system\.storageFree !== null"> · \{\{ summary\.system\.storageFree \}\} free<\/template>/)
console.log("core text ok")
