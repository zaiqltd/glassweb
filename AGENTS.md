# GlassWeb working rules

GlassWeb makes browser-visible systems understandable through an honest evidence graph.

## Commands

- `npm run demo` — retained local viewer
- `npm run typecheck && npm run lint && npm test` — core verification
- `npm run export:demo` — regenerate the portable canonical trace
- `npm run package:recorder` — regenerate the Chrome recorder archive
- `npm run scan:secrets` — release credential check
- `npm run build` — production build

## Product invariants

- Visual order is fixed: Visible → Structure → Behaviour → Network → Service.
- Human label first, raw technical identity second.
- Never present timing correlation as observed causality.
- Every entity and relation references evidence; unknowns stay visible.
- Queries select recorded graph IDs and never invent them.
- No city/building/pipeline metaphors or force-directed layout.

## Privacy invariants

The default recorder never reads form values, cookie values, headers, bodies, or storage contents. Strip query values and fragments before persistence. Screenshot capture stays explicit and off by default. Never add a bundled credential or default telemetry destination.

Generated public artifacts come from their scripts and are not hand-edited.
