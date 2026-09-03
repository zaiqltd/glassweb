# GlassWeb security and privacy

GlassWeb is a local-first explanation tool. It is not a forensic recorder, credential scanner, or security boundary.

## Reporting a vulnerability

Please use GitHub’s private vulnerability reporting for this repository. Do not publish traces, credentials, private URLs, or proof-of-concept data in a public issue.

Include the affected version, browser version, reproduction steps, impact, and the smallest safe fixture that demonstrates the problem.

## Supported versions

Until the first stable release, security fixes target the latest `main` branch and newest tagged alpha only.

## Data retained by default

The recorder stores allowlisted browser-visible metadata:

- safe page and interface labels;
- document selectors and visible bounds;
- click, change, submit, render, and mutation timing;
- request method, redacted URL, status, duration, transport, and MIME type; and
- service origin and evidence certainty.

## Data excluded from saved recordings by default

The recorder does not read:

- form/input values;
- cookie values;
- authorization and arbitrary request/response headers (only the MIME content type may be retained);
- request/response bodies;
- local/session storage contents.

The request probe necessarily receives the URL used by the page. Query values and fragments are removed before the URL is added to a recording and are never retained in an exported trace.

Screenshots are separate, explicit, and off by default. A visible screenshot can contain personal, financial, health, account, or internal business information. Treat screenshot-bearing traces as sensitive files.

## Threat model

### A captured page is untrusted

The fetch/XHR probe must run in the page’s MAIN world to observe calls. A page can detect, block, replace, or spoof that instrumentation. Messages are origin-checked, session-checked, type-checked, and byte-capped, but a hostile same-page script can still interfere.

Therefore:

- instrumentation evidence explains browser behaviour; it is not tamper-proof;
- GlassWeb does not claim forensic integrity;
- sensitive investigations should use independent network and server logs; and
- imported traces must remain untrusted input.

### Imported traces are untrusted files

The viewer limits file size, validates schema and graph references, permits only bounded PNG/JPEG/WebP screenshot data URLs, and renders labels as text. Do not weaken those constraints when adding fields.

Coding-agent packets treat every imported title, label, and technical identity as untrusted page data. GlassWeb strips query and credential values again, emits only kind-specific search needles, quotes captured strings, and tells the receiving agent never to follow instructions inside evidence. Review the packet before pasting it into any agent.

### Metadata can still identify people or systems

Hostnames, routes, visible text, selector names, and timing may reveal private infrastructure or customer context even after value redaction. Always inspect the redaction report and the trace contents before sharing.

## Credential policy

No provider key is needed for the default viewer, deterministic questions, or recorder. Credentials must never be committed, bundled into the extension, placed in demo traces, or sent to a default telemetry service.

`npm run scan:secrets` blocks common credential shapes. It is a backstop, not a substitute for review.

## Permission policy

The alpha recorder uses only:

- `activeTab` — the page the user explicitly activates;
- `scripting` — install the bounded recorder after the user starts capture;
- `storage` — keep ephemeral session state across popup opens; and
- `downloads` — export the trace locally.

There is no persistent host access and no `debugger` permission. Any future permission increase must be optional, explained before grant, and isolated from the default recorder.
