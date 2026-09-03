# Changelog

All notable changes to GlassWeb are documented here. The project follows semantic versioning once the public API stabilizes.

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
