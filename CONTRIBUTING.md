# Contributing to GlassWeb

GlassWeb should make the web understandable without pretending the browser can see more than it can. Contributions are welcome when they preserve that contract.

## Start locally

Use Node.js 22.13 or newer.

```bash
npm install
npm run demo
```

The viewer opens at `http://localhost:3000`. The default Orbit trace is deterministic, so most viewer work needs no external site or browser extension.

## Before opening a pull request

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run scan:secrets
npm run build
```

If you changed the recorder, also run `npm run package:recorder`. If you changed the canonical trace, run `npm run export:demo` and include the updated public trace.
If you changed the product positioning or social card, run `npm run generate:og` and include the updated PNG.

## Non-negotiable evidence rules

1. Every visible entity and connection references evidence.
2. Timing proximity is `correlated`, not `observed`.
3. Rules and models are `inferred` and name their source.
4. Missing browser visibility is `unknown`.
5. AI or heuristics may select recorded IDs; they may not introduce graph IDs.
6. Human labels never replace the raw technical identity.

## Capture safety rules

Default capture must never read or retain form values, cookie values, authorization headers, request/response bodies, or storage contents. Query values and fragments are removed before storage. Screenshot capture remains explicit and off by default.

Any proposal to widen capture requires:

- a concrete user benefit;
- an explicit opt-in boundary;
- storage and byte limits;
- tests proving redaction happens before persistence; and
- documentation in both the UI and `SECURITY.md`.

Do not add a credential, telemetry endpoint, or hosted model dependency to the default path.

## Good first contributions

- Map a known hostname to a clearer service label without making ownership claims.
- Add a deterministic query intent backed only by recorded IDs.
- Add a hostile-page or malformed-trace fixture.
- Improve keyboard or reduced-motion accessibility.
- Explain a technical identity in plain language while preserving the raw value below it.
- Add safe coverage for EventSource or WebSocket metadata.

## Pull request shape

Keep changes narrow. Include:

- the user-visible outcome;
- which certainty levels are involved;
- privacy impact;
- validation commands run; and
- a screenshot or short recording for meaningful visual work.

Large capture or schema changes should begin as an issue so the evidence and compatibility implications can be agreed first.

## Generated files

- The public Orbit before, broken, repaired, and check JSON files come from `npm run export:demo`.
- `public/glassweb-recorder.zip` comes from `npm run package:recorder`.
- `public/og.png` comes from `npm run generate:og`.
- Extension PNG icons are derived from `extension/icons/source.svg`.

Do not edit generated JSON or archives by hand.
