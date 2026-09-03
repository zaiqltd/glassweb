<p align="center">
  <img src="./public/og.png" alt="GlassWeb — See the system behind the screen" width="100%" />
</p>

<h1 align="center">GlassWeb</h1>

<p align="center"><strong>Click anything on a website. GlassWeb explains what happened behind the screen - in plain English.</strong></p>

<p align="center">
  <a href="https://github.com/zaiqltd/glassweb/actions/workflows/ci.yml"><img alt="Verify" src="https://github.com/zaiqltd/glassweb/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-63e7f4" />
  <img alt="Chrome MV3" src="https://img.shields.io/badge/recorder-Chrome%20MV3-63e7f4" />
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-63e7f4" />
</p>

GlassWeb watches one short browser session and turns it into a story a normal person can understand:

> **Why am I seeing R1,499?**<br>
> Orbit looked up the South African price and placed R1,499 in the Pro card after the page opened.

The default view gives you one answer, four simple steps, and why the result matters. No DevTools vocabulary is required. When you want the technical proof, GlassWeb can unfold the same answer into five aligned layers:

```text
Visible  →  Structure  →  Behaviour  →  Network  →  Service
```

The complexity is still there. It is simply earned through disclosure: **Answer → What happened → Why you care → How do you know? → Full X-ray.**

No city metaphor. No force-directed spaghetti. No AI filling gaps with fiction.

## See the magic trick

Requires Node.js 22.13 or newer.

```bash
npm install
npm run demo
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Pick one normal-person question, such as **Why am I seeing R1,499?**
2. Read the short answer and four-step story.
3. Choose **Watch it happen** to replay the browser session.
4. Choose **How do you know?** to inspect the proof.
5. Open **Full X-ray** only when you want every technical detail.

The bundled Orbit pricing session is deterministic and offline. It needs no account, API key, model provider, or captured browsing data.

## What is working today

| Surface              | What a normal person gets                                                     | Status                        |
| -------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| Simple answer        | One question, one clear answer, and why it matters                            | Default                       |
| Four-step story      | Turns the hidden browser journey into ordinary actions                        | Working                       |
| Replay               | Shows what happened in time without requiring log knowledge                   | Working                       |
| What AI sees         | Shows information an AI tool may miss                                         | Working in the canonical demo |
| How do you know?     | Explains what GlassWeb saw and where it is less certain                       | Working                       |
| Full X-ray           | Preserves the complete five-layer technical inspection                        | Optional                      |
| Portable recordings  | Opens, checks, replays, protects, and downloads `.glassweb.json` files         | Working                       |
| Chrome recorder      | Watches one active page with minimal permissions and safe defaults            | Alpha                         |

GlassWeb does not claim server-side causality it cannot see. In a normal capture, the recorder can prove that an interaction happened and that a request happened nearby. Without a reliable initiator stack, their edge is **correlated**, never silently promoted to **observed**.

## Check your own website

Build the downloadable recorder:

```bash
npm run package:recorder
```

For local development, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the repository’s `extension/` folder.

Then:

1. Open a normal HTTP or HTTPS page.
2. Open GlassWeb Recorder and choose **Start capture**.
3. Do the one thing you want explained.
4. Stop and save the recording.
5. Open that recording in GlassWeb to get the plain-English story.

The extension asks for `activeTab`, `scripting`, `storage`, and `downloads` only. There is no `<all_urls>` access and no debugger permission.

Screenshots are off by default because pixels can contain private information. If enabled, only the currently visible tab area is attached.

## When you open Full X-ray

### The five layers

| Layer         | Plain-language question                 | Typical evidence                                  |
| ------------- | --------------------------------------- | ------------------------------------------------- |
| **Visible**   | What did the person see or touch?       | Bounds, label, click target                       |
| **Structure** | What document node sits behind it?      | Tag, safe selector, DOM mutation                  |
| **Behaviour** | What browser-side action responded?     | Event type, instrumented handler boundary         |
| **Network**   | What left or returned to the browser?   | Method, redacted route, status, MIME type, timing |
| **Service**   | Which first or third party received it? | Request origin and same-origin classification     |

### Certainty is part of the interface

| State          | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| **Observed**   | Direct browser evidence supports this fact or connection                |
| **Correlated** | Multiple observations align in time, but exact causality is not exposed |
| **Inferred**   | A named rule or model produced the claim                                |
| **Unknown**    | The browser cannot see enough to make the connection honestly           |

Every entity and relation in a valid trace must reference an evidence record. The importer rejects dangling evidence and graph IDs that were never captured.

## Privacy model

GlassWeb records an allowlisted metadata envelope. The recorder does **not read**:

- form or input values;
- cookie values;
- authorization and arbitrary request/response headers (only the MIME content type may be retained);
- request or response bodies;
- storage contents; or
- URL query values and fragments.

Labels are length-bounded and scrubbed for common email, phone-like, and token-shaped strings before storage. Export shows the active redaction policy before download. Nothing is uploaded by this repository.

Captured metadata can still be sensitive. Review every trace before publishing it. See [SECURITY.md](./SECURITY.md) for the threat model.

## Architecture

```mermaid
flowchart LR
  Page[Active browser page] -->|clicks + DOM evidence| Content[Isolated recorder]
  Page -->|fetch/XHR metadata only| Probe[MAIN-world probe]
  Probe -->|origin + session checked messages| Content
  Content -->|bounded evidence graph| Trace[.glassweb.json]
  Trace --> Validator[Schema + reference validator]
  Validator --> Viewer[Exploded viewer]
  Viewer --> Xray[Five-layer X-ray]
  Viewer --> Runtime[Runtime weave]
  Viewer --> Ask[Deterministic question focus]
```

The recorder and viewer share a versioned graph vocabulary, but the exported trace is just portable JSON. The page is never contacted during replay.

## Repository map

```text
app/                         Vinext application entry and global visual system
components/glassweb/         X-ray, page surface, runtime, dialogs, workbench
lib/glassweb/                Versioned types, validator, queries, canonical trace
extension/                   Minimal-permission Chrome MV3 recorder
public/                      Social card, recorder archive, portable demo trace
scripts/                     Packaging, demo export, and credential scan
tests/                       Schema, evidence, permissions, and privacy invariants
docs/TRACE-FORMAT.md         GlassWeb trace v1 reference
```

## Honest limitations

- Capture currently covers one page until navigation; a navigation ends the active session.
- `fetch`, XHR, resource timing, clicks, submits, changes, and DOM mutations are covered. WebSocket, EventSource, service-worker, and CDP initiators are not yet captured.
- Cross-origin iframes and closed shadow roots remain opaque.
- A hostile page can interfere with MAIN-world instrumentation. GlassWeb traces are explanation artifacts, not forensic security logs.
- Generic captures identify browser-visible interaction boundaries, not framework-perfect React/Vue component names.
- Timing correlation cannot prove which application function caused a request.

These gaps appear as **correlated** or **unknown** evidence. They are not hidden behind confident prose.

## Roadmap

- **Compare mode** — put two traces side by side and isolate what changed.
- **Source-map bridge** — connect browser behaviour to named source functions when maps exist.
- **AI Search lens** — compare raw server HTML with the rendered interface.
- **Optional CDP adapter** — add initiator stacks and frame identity behind explicit permission.
- **Framework and service recognizers** — translate more raw identities into useful human labels.
- **GhostRun** — replay a journey against a changed build and surface broken causal paths.

## Contributing

The best first contributions make one confusing browser fact understandable without weakening the evidence model. Service recognizers, safe framework labels, query intents, hostile-page fixtures, and trace examples are especially welcome.

Read [CONTRIBUTING.md](./CONTRIBUTING.md), the [trace format](./docs/TRACE-FORMAT.md), and [SECURITY.md](./SECURITY.md) before changing capture behaviour.

The visual contract lives in [docs/DESIGN-PRINCIPLES.md](./docs/DESIGN-PRINCIPLES.md).

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run scan:secrets
npm run build
```

The release suite validates the canonical graph, rejects unsafe imports, checks Chrome permissions, tests privacy invariants, parses every extension script, and scans credential-shaped values.

## License

Apache-2.0. See [LICENSE](./LICENSE).
