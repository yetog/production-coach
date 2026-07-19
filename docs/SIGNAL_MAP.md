# Signal Map: Pain Points → Gaps → Ideas

> Author: Aryan
> 5 pain points · 5 gaps in current tech · 14 project ideas · 38 days to build

---

## CH.01 The Understanding Gap

**Judges:** Hanna Lukashevich (Fraunhofer IDMT) · Rithik Kundu (NYU GenAudio) · Jonathan Wyner (Berklee)

**PAIN:** Lukashevich has built her career on semantic, interpretable music AI — models that explain genre, mood, and instrumentation rather than black-box outputs. This cluster of judges will read "prompt in, result out" as the opposite of the point.

**HOLE:** Stem separation, one-click mastering, style transfer — every mainstream AI plugin returns a result with zero exposed reasoning. There's no interpretable layer between "the AI did something" and the musical why.

| Idea | Description | Judge Payoff |
|------|-------------|--------------|
| **Theory Mentor** ⭐ | Agent watches the live session (chords, key, melody via NEXUS) and narrates in real time, by voice, what's harmonically happening as the producer plays. *Also hits CH.04* | Exposes reasoning live, not after the fact |
| Session Diff | Agent proposes an arrangement change and narrates the semantic features driving it — energy curve, spectral balance — like a reviewed pull request, for music | Makes the model's "diff" auditable, not magic |
| Reference Decoder | Drop in a reference track; agent verbally breaks down the specific semantic dimensions (mood, era, instrumentation, tempo) that define it, then compares to your session | Literally Lukashevich's own research framing, applied live |

---

## CH.02 The Provenance Gap

**Judges:** Manon Dave (BBC R&D) · Edward Fotheringham (BBC R&D)

**PAIN:** Both judges lead BBC R&D's PHARE initiative — built specifically to close the gap between a creative idea and its execution without losing track of rights, collaborators, and ownership.

**HOLE:** No AI-in-DAW tool surfaces provenance at the point of suggestion. Producers get samples, MIDI, style references with zero attribution or license clarity attached.

| Idea | Description | Judge Payoff |
|------|-------------|--------------|
| **Provenance Tags** | Every suggestion the agent makes carries a visible source + license tag, and the agent says it out loud, not just displays it | Rights-awareness built into the moment of creation, not bolted on after |
| Session Credit Log | A running, exportable record of every AI-assisted decision in the session — a rights-transparent history to hand to collaborators or a label | Directly demoable as a PHARE-style artifact |
| Collaborator Flag | Instead of faking a missing vocalist or santoor part, the agent flags: "this needs a real player" — pointing to a human, not a synthetic substitute | AI that protects musician livelihoods instead of replacing them |

---

## CH.03 The Representation Gap

**Judge:** Lidet Tilahun (Harvard, African Hiphop Research Project)

**PAIN:** Two decades directing research on music as cultural voice and identity. She is the judge most likely to immediately catch, and reward or punish, how a tool handles non-Western tradition.

**HOLE:** Mainstream models train overwhelmingly on Western data and compress everything else into generic "world music." No tool helps a producer engage one specific, named tradition respectfully.

| Idea | Description | Judge Payoff |
|------|-------------|--------------|
| Named-Tradition Mentor | Explains a technique with its specific lineage — "this is how a Hindustani raga voices tension here" — never a vague "add ethnic flavor" | Specificity is exactly what Tilahun's career argues for |
| Call & Response | Agent plays a phrase rooted in a named tradition and prompts a live response — modeled on oral-tradition teaching, not generation | Pedagogy through participation, not output |
| **Attribution Companion** | Whenever a suggestion draws on a tradition, the agent names it and its lineage aloud, every single time — credit is unavoidable, not optional | The simplest build here, and the hardest to argue with |

---

## CH.04 The Pedagogy Gap

**Judges:** Wyner (Berklee) · Hauke Egermann (Cologne) · Maurício Gargel (MTSU) · Martin Koszolko (Monash)

**PAIN:** Four separate judges are music educators or systematic musicologists. Their shared mandate: learning by doing.

**HOLE:** "Smart" plugins — auto-EQ, auto-mix, AI mastering — fix problems silently. The producer's ear never improves; the tool teaches nothing.

| Idea | Description | Judge Payoff |
|------|-------------|--------------|
| Mix Doctor Tutor | Explains frequency and dynamics problems in plain language, tied to what's audibly happening, live, instead of silently correcting it | Teaching moment where a black-box fix used to be |
| **Practice Mirror** ⭐ | Agent listens to a producer's by-ear improvisation and afterward names the scale, mode, or rhythm they were actually playing — turns their own instincts into a lesson. *Built for Aryan's own workflow* | The ear-first producer is the whole point, not an edge case |
| Theory Mentor | Same build as CH.01 — live harmonic narration doubles as a standing music-theory lesson for an ear-based producer | One build, two judge clusters satisfied at once |

---

## CH.05 The Durability Gap

**Judges:** Daniel Rowland (LANDR) · Khaled Said (MuseHub)

**PAIN:** A working producer and a platform lead. Their question isn't "is this clever" — it's "would you actually keep this open during a real session?"

**HOLE:** Most AI-in-DAW features are single-use novelties — one-click generate, done. Nothing is built for iterative, ongoing use inside a live workflow.

| Idea | Description | Judge Payoff |
|------|-------------|--------------|
| AI Bandmate | Persistent, responsive session collaborator that reacts to what you just played — reusable every session, not a one-shot generation | Highest ceiling, most native to Audiotool's multiplayer identity |
| Voice Macros | Producer defines reusable, voice-triggered actions — "double the drums, drop the low end" — for repeatable workflow speed, not a party trick | Reads as a tool a producer keeps using in week two, not day one |
| Second-Pass Agent | On-demand pass proposing arrangement variations already tuned to the project's existing style — an iteration tool, not a one-off demo trick | Fits into a real production cycle, not just a 3-minute demo |

---

## Reading the Map

Two ideas — **Theory Mentor** and **Practice Mirror** — are the only ones that land in two channels at once, cost the least Nolan time (read-only analysis, no complex write-back or DSP), and map directly onto Aryan's own by-ear workflow.

Everything in CH.02 and CH.03 is cheap to build and hard for a judge to dismiss, even as a secondary layer bolted onto whichever hero feature you pick.

CH.05's AI Bandmate is the highest-ceiling, highest-risk option on the board — real-time musical generation that stays synced and tasteful is the hardest engineering problem here, and the one most likely to break live in front of the exact judges you're trying to impress.

---

## Working Recommendation

Build **Theory Mentor** as the hero feature — it's the cheapest, safest build and it's the one where you're the built-in domain expert, Aryan.

Layer in one CH.02 or CH.03 idea (**Provenance Tags** or **Attribution Companion**) as a secondary feature, since both are near-zero extra engineering once the core agent loop exists.

That combination alone touches **four of five judge clusters** without ever attempting the riskiest build on this page.
