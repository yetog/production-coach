# ADR-061: Dr. Zay agent harness and Audiotool topology

Status: Proposed
Date: 2026-08-22
Parent: #61

## Decision summary

Adopt a provider-neutral, TypeScript tool-loop layer for Dr. Zay, with Vercel AI
SDK as the preferred implementation candidate. Keep the Audiotool-specific
planner, approval policy, Nexus executor, verification, and undo in the
existing `bot/src/agent/service.ts` boundary. Do not give the model raw Nexus
objects or Audiotool credentials.

The web app and Chrome extension are clients of one agent protocol. The chat
provider and the loopback Audiotool bridge remain separate processes for the
first slice. The browser does not mediate model-to-bridge credentials or
reimplement producer logic. A container deployment must preserve this
boundary with authenticated server-to-server routing; binding the PAT-bearing
bridge to `0.0.0.0` or proxying it directly to an unauthenticated browser is
not an approved topology.

## Context

The current path is split:

```text
chat → Express :3021 → one model response → prose regex parser
command center → bridge :3022 → deterministic planner → Nexus SDK
```

PR #56 already routes coach suggestions through the plan/apply safety envelope,
but the boundary is fragile: Dr. Zay prose is parsed into a command string and
then parsed again by the producer planner. Chat and the bridge do not share
plans, tool results, transcript events, or action state.

The branch proposal `proposal/unified-ai-backend` recommends ElevenLabs
Conversational AI as a single voice/chat backend. Main now supports OpenAI and
IONOS, and the Chrome extension adds another client surface. This ADR updates
that proposal rather than adopting an ElevenLabs-only topology.

## Agent model

The model gets typed tools, not SDK access:

```text
user message
  → model/tool loop
  → typed tool request
  → policy + argument validation
  → AgentService
  → analyzer/planner/approval/executor/verification
  → tool result
  → model's next turn or final answer
```

Initial tools:

- `analyze_session`
- `plan_change`
- `apply_plan`
- `undo_last_change`
- `get_action` (only if needed for hydration/history)

The LLM may choose tools and sequence read-only operations. It may not bypass
the plan ID, confirmation, current-state revalidation, verification, or action
log enforced by `AgentService`.

## Why a known tool-loop library

The generic concerns—provider requests, tool schemas, streaming, tool-result
messages, multi-step turns, and stopping—are not Audiotool-specific. A known
TypeScript agent library should own those concerns where it supports the
configured providers. Vercel AI SDK is the preferred candidate because it is
an embeddable application library and supports provider adapters, streaming,
typed tools, and multi-step execution.

OpenCode is not selected as the embedded runtime: it is a complete coding-agent
application whose core assumptions are shell/filesystem tools and its own
permission/runtime model. Claude Agent SDK is not selected as the default
because it couples the loop to Anthropic/Claude semantics, while this product
currently supports OpenAI and IONOS. Either remains a future option if the
provider or product scope changes.

The final package choice must be validated against IONOS's OpenAI-shaped API.
If an adapter cannot support IONOS reliably, the fallback is a small internal
provider adapter behind the same tool protocol—not a second producer executor.

## Process topology

First slice:

```text
Web app ─────────┐
Chrome extension ├─→ Dr. Zay agent API / tool loop (:3021)
                 │              │
                 │              └─→ loopback Agent Bridge (:3022)
                 │                        │
                 └────────────────────────┴→ AgentService → Nexus SDK
```

The bridge remains loopback-only and holds `AUDIOTOOL_PAT`. The chat server
does not receive the PAT. The extension and browser receive structured plans,
tool results, and status events only.

The first implementation uses server-to-server calls from the chat service to
the loopback bridge. If a deployment target cannot safely make that call, the
agent deployment is not ready to ship; the browser must not be given a direct
unauthenticated route to the PAT-bearing service. The topology choice must be
recorded before production deployment.

## Safety and state

`AgentService` remains the sole mutation authority. Every write follows:

```text
analyze → plan → show preview → user confirmation → apply(planId)
  → current-state re-plan → execute → verify → record → announce
```

Chat and extension clients use the same event model:

- request
- plan
- clarification
- confirmation
- apply started
- apply outcome
- verification
- undo
- failure

An action is not marked applied until the bridge returns a successful verified
outcome. Pending plans are hydrated from the authoritative agent state after a
client reconnect. Undo ownership remains with the action log; #60 may replace
the single-last-action behavior with a stack later without changing the tool
protocol.

## Security requirements

- Provider keys remain server-side unless a separately approved BYOK design is
  implemented; the old RFC's localStorage key proposal is not adopted here.
- `AUDIOTOOL_PAT` remains bridge-only.
- Tool arguments are schema-validated and bounded before dispatch.
- `apply_plan` requires an explicit current plan ID and confirmation token/state.
- No free-form model text, regex match, or client flag can mutate a project.
- Tool calls and approvals are auditable without logging secrets.
- Extension sessions are bound to the authenticated user and active project.

## Alternatives rejected

### ElevenLabs Conversational AI as the sole backend

Useful for voice latency and a unified audio experience, but it would make the
current OpenAI/IONOS provider path and Audiotool approval protocol dependent on
an external conversation runtime before the producer tool contract is stable.
Voice can be integrated later through the same event/tool protocol.

### LLM directly calling Nexus

Rejected because generated SDK operations are nondeterministic, hard to
validate, difficult to replay/undo, and would expose a privileged mutation
surface.

### Browser as the source of truth

Rejected because chat, extension, and Command Center would diverge again and
the browser cannot safely own the PAT or action log.

## Consequences

Positive:

- Dr. Zay can understand conversational producer requests.
- Web and extension clients share one contract and safety envelope.
- Exact musical mutations remain deterministic and testable.
- Provider and voice choices can evolve without changing Nexus execution.

Costs:

- A tool-result protocol and pending-event persistence are required.
- There remain two local services in the first slice.
- IONOS tool-call compatibility needs live/provider verification.
- The Command Center must be migrated or retained as a temporary fallback.

## Follow-up implementation order

1. Define shared tool/event contracts and provider adapter.
2. Implement model tool loop and AgentService dispatch.
3. Move chat actions to plan/confirm/apply/verify/undo cards.
4. Add extension side-panel/client parity over the same protocol.
5. Run security review, live Audiotool QA, deployment checks, and docs update.
