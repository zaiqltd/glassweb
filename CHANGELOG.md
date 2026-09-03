# Changelog

All notable changes to GlassWeb are documented here. The project follows semantic versioning once the public API stabilizes.

## 0.5.0 — 2026-09-03

### Changed

- Replaced the technical-result landing screen with a click-it-yourself website example that explains GlassWeb by using it.
- Reduced the default experience to one familiar action, three plain steps, one answer, and one next action.
- Removed status codes, recording terminology, evidence labels, replay controls, X-ray language, and the paid roadmap from the default path.
- Rebuilt single-action results around one question, one answer, a compact visual path, and one coding-AI handoff.
- Rebuilt before/after results around two plainly labelled outcomes and moved exact browser details behind a second deliberate disclosure.
- Simplified the Chrome extension handoff and made its experimental desktop-only setup explicit.
- Added direct `?view=simple` and `?view=compare` routes for deterministic QA and advanced deep links.

### Fixed

- Stopped the broken checkout example from opening an unrelated pricing explanation.
- Kept every first screen within a 1280×720 desktop viewport and the interactive landing screen within a 390×844 mobile viewport.

## 0.4.0 — 2026-09-03

### Added

- Made before-versus-after checking the default product instead of a roadmap idea.
- Added deterministic action pairing that uses stable browser identities rather than regenerated recording IDs.
- Added aligned comparison states for matching, added, missing, changed, and uncertain checkpoints.
- Added a first-difference verdict for request status, missing paths, destination changes, and incomplete evidence.
- Added a portable `.glassweb-check.json` before-reference format with an explicit browser success checkpoint.
- Added a bounded before/after fix packet that strips URL query and credential values, quotes page data as untrusted, and states the causality boundary.
- Added a cinematic repaired-run demo that visibly returns to **Still matches**.
- Compared every recorded entity and connection in the selected five-layer path instead of trusting the first item in each layer.
- Added kind-specific request, service, and selector identities; explicit network-failure handling; safe incomplete-capture semantics; and hardened untrusted-data redaction in coding-agent packets.
- Rebuilt the social preview around the actual before/after product.
- Added a focused explanation replay, aligned technical proof, two-slot import flow, and mobile comparison stepper.
- Added trace completeness metadata so interrupted captures never masquerade as reliable missing steps.
- Added comparison coverage for `201 → 500`, observed network failures, regenerated IDs, multiple requests, missing connections, changed destinations, hostile packet data, repair verification, and saved checks.
- Added action-aware in-flight request settlement, explicit opaque-versus-failed transport outcomes, and safe compatibility with early status-0 traces.
- Added full-delta evaluation behind the five-step summary, case-sensitive request identities, endpoint-aware connection comparison, medium-match confirmation, and bounded technical output.
- Added runtime recorder probes, public artifact parity checks, and a 5,000-action comparison performance regression.

### Changed

- Repositioned GlassWeb as a local-first before/after debugger for website actions.
- Kept the single-recording explanation and five-layer X-ray as progressive disclosure.
- Made the open-source-versus-future-paid boundary explicit: local comparison works now; automated hosted checks remain a later layer.
- Limited fix instructions to proven breakages; neutral changes now ask for intent confirmation before any code edit.
- Capped and deduplicated single-recording evidence packets, with explicit omission counts and a no-code-change boundary.

## 0.3.0 — 2026-09-03

### Changed

- Rebuilt the front door around one normal-person promise: see exactly what happens after a click.
- Moved the active answer, interactive page, and four-step path into the first screen.
- Added a copy-ready evidence packet for coding agents.
- Replaced entity-only proof with a complete, plain-English answer path.
- Made Replay start immediately and turned the mobile replay into a vertical timeline.
- Made the mobile X-ray a readable active-path stepper with no sticky overlay.
- Corrected checkout and newsletter claims to match only what the recording proves.
- Hid the AI lens whenever a recording contains no real server/AI evidence.
- Added recoverable partial recordings when a watched page navigates.

### Fixed

- Restored the intended Geist typography and fixed the invisible overlay that blanked the example page.
- Stopped unsupported questions from silently returning an unrelated price answer.
- Stopped demo-specific Orbit stories from leaking into imported recordings.
- Kept screenshot hotspots aligned to the captured viewport.
- Removed the hidden file input from keyboard tab order and narrowed live announcements.

## 0.1.0 — 2026-09-03

### Added

- Five-layer exploded X-ray: Visible → Structure → Behaviour → Network → Service.
- Deterministic Orbit pricing demo with guided tour, runtime replay, AI visibility lens, and evidence-focused questions.
- Portable, versioned `.glassweb.json` trace model with bounded import validation.
- Minimal-permission Chrome MV3 recorder for clicks, changes, submits, DOM mutations, fetch, XHR, and resource timing.
- Explicit observed, correlated, inferred, and unknown certainty states.
- Redaction review and local trace export.
- Downloadable demo trace and recorder archive.
- Release tests for graph integrity, scale, permissions, privacy invariants, script syntax, and credential scanning.
- Apache-2.0 license, security policy, contribution guide, CI, and social launch artwork.
