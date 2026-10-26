# Validation — Discussion Atlas V4.0

Code syntax checks: JavaScript (`app.js`, `study.js`) and Python CSV converter passed.

Browser DOM and interaction tests used a Chromium renderer with the HTML/CSS/JavaScript injected in a local test page. Direct localhost/file navigation was blocked by the testing environment, so these are functional DOM tests, **not** independent tests of the deployed GitHub Pages website.

- All four discussions rendered in both modes: rice 135 comments, containers 225, python farming 249, practice 65.
- Structure-only rendered uniform comment circles; enhanced mode rendered four length bands and independent URL/quotation rings.
- Clicking comments did not change any circle coordinates in the radial tree.
- Clicking a comment displayed a readable ancestor chain and its descendants; hiding replies in the reading panel did not change the tree positions.
- Search still located matching original comments and dimmed nonmatches.
- Both conditions expose original comments and search; only enhanced mode adds length and cue emphasis.
- Simulated two-trial portal submission collected the new search-helpfulness question and exported V4.0 JSON. The mocked iframe produced an expected about:blank postMessage origin error during this test; the earlier production-style same-origin messaging code is unchanged.
- The CSV converter accepted a synthetic V4.0 JSON and generated two trial rows. This synthetic response is intentionally **not shipped** in the study package.

Study constraints: Run a fresh small pilot before enrolling the formal 12 participants; do not combine results from V3.x with V4.0 without accounting for the interface change. GitHub Pages still cannot collect responses centrally; participants must download and privately return their JSON. Larger Reddit threads may make full stable-layout rendering less responsive than the three selected cases.
