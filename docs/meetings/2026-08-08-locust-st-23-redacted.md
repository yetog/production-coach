# Team call — Production Coach direction

**Date:** 2026-08-08 · **Duration:** 39 min · **Participants:** 4 (unattributed)

> **About this record.** Transcribed locally from an audio recording with `whisper.cpp`
> (`large-v3-turbo`); the audio was never uploaded to any service. This is a **redacted and
> lightly edited** version: punctuation and capitalisation added for readability, profanity
> softened, and roughly 14 minutes of unrelated social conversation and material about
> third parties removed. Removals are marked inline. Speakers are **not** labelled —
> the transcriber does not do diarisation and guessing would misattribute people.
>
> Substance of every project decision is preserved. The unredacted transcript is not in
> this repository and is not intended to be.

---

## Summary

**The decision:** we are not building an agent that produces music for you. It sits beside
you and gives advice. The user is the pilot; the agent presses buttons **on instruction**,
never on its own initiative.

**Ruled out:** "make me a reggae song" → finished track.
**Ruled in:** "add an 808 under the drop" → the agent does it, you directed it.

**Product shape:** two channels, one voice.
- **A — ambient.** A dot at the edge of the screen that lights up and speaks when something
  worth mentioning happens. Chattiness is user-adjustable. Not a second UI to babysit.
- **B — chat.** You ask a question about what you just placed; it answers in text.

**Target user:** beginners, deliberately chosen over intermediate users.

**Biggest open risk at the time of the call:** exactly what the SDK lets the agent touch,
and specifically whether it can place notes. *(Resolved since — see the end of this file.)*

---

## Transcript

**[00:00]** What we're trying to hit is: how do we make it easier for a new user to use a DAW,
while making them the pilot instead of the assistant? Here's the issue with generative AI and
music — the person who generates it doesn't have control over the output. What we want is to
make the beginner the pilot of the plane, and have a chatbot that acts like a producer friend,
not the person who produces for you. It gives power to the beginner without overwhelming them.

**[01:00]** So this is the DAW. We want a bot you can interact with in two different ways, and
it isn't a whole other UI you have to focus on — it sits at the side of your screen and lights
up whenever it talks. It's going to talk to you. We originally wanted to use ElevenLabs to give
it a voice.

**[01:20]** With the SDK we have the ability to get the agent to understand what's actually
happening in the DAW live, in real time. So if the tempo increases, it works out that the tempo
is increasing. It also knows where the kick is hitting in the bar — it knows where the notes are
placed.

> — Is it doing this through images of the screen, or Chrome DevTools Protocol?
>
> — No, this is inside. That's what's interesting about Audiotool: it has a pipeline where the
> agent can interact directly within the DAW.

**[02:00]** We want to get away from "prompt it and it makes music," because then you can just
use Suno, and there are plenty of those already. What we want is: you talk to it — "add an 808,
add this" — you're still driving, but you let it press the buttons.

**[02:15]** We don't know yet how far the SDK goes — whether it can actually place notes inside
the DAW. We have to test that. Write that down. **That's the gray area right now**: what can it
actually look at and do inside the DAW? That will determine a lot.

**[02:45]** *(Discussion of voice-first interaction — whether the agent needs to talk back at all,
or whether you just tell it to do something and it does it.)* The main thing is you want to tell
it to do something and then be done.

**[03:20]** Our goal was to create an A&R coach, or different coaches for different aspects —
giving direction. "Throw an 808 in there." To actually throw in an 808 you have to put it in the
right place, pick the right pitch, the key you're in. So the agent helps take the idea in your
head and put it on the sonic canvas.

**[03:45]** *(Aside on hands-free and wearable interfaces — removed, off-topic.)* The main goal is
the coaches, so the user experience is seamless.

**[04:40]** To piggyback on that: we're making a **production coach** — someone who helps you get
better at making music. Talking to it and making music that way is a really cool tool, but I
don't know if we can do that yet with the technology we have. We're on a deadline, so I don't
want to shoot for the stars if we can't reach them.

**[05:00]** Right now we focus on this MVP: the thing that talks and nudges you in the direction
of what you want to do. Literally a dot that lights up at the side of your screen when it speaks.
If you look through the files, there's a **chattiness setting** — do I really want it critiquing
my music while I'm making it right now? You can change the level.

**[05:30]** Simply: it talks back to you, gives advice, and sometimes tells you where to put things
on its own. The other part is its own chatbot, where you can ask things **in context of what you
actually placed in the DAW**. For example: "this chord here, I want it to sound a little better,
what do you suggest?" — and it gives you the musical answer.

**[06:00]** So to summarise: a production coach with two parts. **A** is where it talks to you and
helps you out vocally. **B** is where you can prompt it directly and it answers in text on what
you could do to make it more musical. That's the top-down. Obviously it's cool on paper — we have
to test what a user actually experiences.

**[06:30]** *(On Audiotool plugins and distribution.)* We were on a call with Audiotool and they
said you can build applications on top of it. It shows up in a separate window, so it isn't
integrated into the Audiotool UI itself — it's always a separate window. They host it for you.
Audiotool is effectively the backend; you can build entire applications on top of it.

**[08:00]** *(≈3 minutes removed — commentary about third-party companies, funding, and copyright.
Nothing project-relevant.)*

**[11:00]** On voice providers: we might use an open-source model instead. We'd have to work out
where that model lives and how we host it. ElevenLabs credits are available to start with.
The important thing is to get something in there — **we can always swap it out later**.

**[11:40]** The agent can apparently do everything with the SDK, according to a first read. So why
don't we build out the initial scaffolding and get the MVP? **The biggest issue is that we have to
figure out exactly what the agent can interact with in the DAW.** Once we know those
specifications, we can move.

**[12:00]** That's the only gray area I think we actually have trouble with. What I'm afraid of is
that we overbuild this — over-commit to the brainstorming, then try to build it and realise we
don't have enough time. If we understand the capabilities of the SDK, we'll be able to build from
there and accumulate the snowball. We might be able to go for it, and cut scope if we have to.

**[12:40]** There's an order of what needs to be done. The best approach is to hit one or several
of the items, bug-test, and repeat. I was testing the first couple of things and they all check
out — the SDK can do what we wrote down for the first few. So we're in a good spot.

**[13:20]** *(≈4 minutes removed — dinner plans and conversation about people not on the team.)*

**[17:20]** It says the agent can be a full-on producer. Can we get the scaffolding and a beta
version done soon? We could maybe demo it next Friday.

**[17:45]** How do we divvy this up? *(Roles agreed — see table below.)*

**[18:20]** The stuff you're working on: push it to the repo when you're done, or add some kind of
`analysis.md`, because that'll put us in a good direction. And the meeting notes as well. What we
should aim for is a prototype we can interact with that has the SDK capabilities and actually
feels musical.

**[19:00]** The voice agent work connects to the rest, so let's work on it together. We can start
with whatever — ElevenLabs, Deepgram, whatever we want — the important thing is to get something
in there; we can swap it later. Let me do a quick write-up of exactly what the voice agent is
supposed to do, and the prompting side of it.

**[20:00]** Remember the entire idea of this project. Imagine you're in the studio for the first
time and I'm a professional producer. You want to make music but you don't know how. Do you want
me to take it over and do whatever I want, or do you want to do it yourself?

**[20:40]** The entire point is that as a producer I want to help you grow. I want to hold your
hand and let you do it. I don't want to take over.

> — You want to teach me how to fish.
>
> — Exactly.

**[21:00]** And here's why we picked this project: I did research on the people who judge our
projects, and worked out where the overlap between them is. The judges split into roughly five
different categories — licensing, AI music detection, and others. I worked out which project
covers the most of that overlap, and this is it.

**[22:40]** *(≈2 minutes removed — off-topic, plus discussion of a third party's confidential
business dealings.)*

**[24:30]** On the competitive landscape: BBC is working on licensing, so we're not in the same
category — we're not really competing with them. Most of the other entrants are music people.

**[26:20]** Conclusion: we're creating not something that produces for you, but a producer that
helps you. It's the "teach a man to fish" thing. You don't want to press a bunch of buttons —
it's why people use CLIs. It's a CLI for the DAW. Or just: "put an 808 on the drop."

**[26:50]** We're trying to step away from voice for now. Do we know it can do that? We can find
out — there's a UI, it has to make an API call. **The most important thing right now is the
workflow between speaking to it and it being able to act.** If we need to trim scope, voice
becomes an add-on later. Text first.

**[28:00]** Go to the project plan — the feature implementation list, features from the top down.
Go through it and check whether the SDK can do what we think it can. A first read said it could do
everything, but the question is whether we trust a read of the docs. **Can we run actual tests on
these features rather than just verifying against the documentation?** Then we can tick the boxes
properly.

**[29:20]** When I was tinkering with the first feature — detecting whether a chord was being
played — there's a nuance. **When you press a chord and release it, there's a bit of latency where
it doesn't register at the right time, and it combines with other chords.** You have to come back,
test it again, tell it what's happening, and then it's fixed. Things like that are what we're going
to hit. We need a proper workflow for when that happens.

**[30:40]** *(Comments about another employer's team removed.)* On process: we can use GitHub and
email or WhatsApp to keep each other updated — pull requests, separate branches, merge the branch
when we're ready.

**[32:00]** I'd say these are the two biggest takeaways. **Number one: we have to be clear about
what we're *not* making. We're not making something that produces for us.**

**[32:30]** On naming the agent: **"Dr. Zay."** *(Voice-cloning options discussed; Zay's own voice
is already cloned and he gave consent on the call to use his likeness.)* We could hook it up to a
lip-syncing model so its mouth moves when it talks.

**[34:20]** *(≈1 minute removed — jokes, off-topic.)*

**[34:50]** Biggest takeaway: **we're not making an agent that produces for you. It sits next to
you and gives you advice.** That is the key thing we want to hit.

> — What if it could do it though? If you tell it to do something?
>
> — Actually, you're right. Here's the thing: as a beginner you don't know what you actually
> want. The only way you find out is by doing it. When you create art, you don't know exactly how
> you want it to sound while you're making it — you learn that during the process.

**[35:20]** Having it control the UI for you, but you telling it what to do — **that would be
great.** What we should stay away from is "make me a reggae song" and it does it for you.

**[35:40]** *(Demo idea everyone liked: the coach getting firm and refusing to simply do it for
you — "do the work" — as a scripted beat in the demo.)*

**[36:00]** But with a beginner, they don't even know whether it should be there or not. That's
why I'm iffy — **that's a really good tool for intermediate artists, not beginners.**

> — Maybe there should be different modes. Are you a beginner?
>
> — Right now we should focus on the beginner. It should coach you: this is what music is about,
> this is the theory.

**[36:40]** If we focus on beginners it will resonate with people much more. Start with beginners;
if we nail that, maybe we add intermediate later. **That is our consumer.** Every feature we
bug-test, we have to remember the consumer is a beginner.

**[37:00]** If a beginner opens the DAW, do they know where the kick should go to make a hip-hop
rhythm? No. What helps them is putting something down and having the coach say: "if you're going
for this, maybe push it there — maybe the kick shouldn't be on the one."

**[37:20]** We should look into **BandLab**. People with very little production experience make
good songs on it, and it isn't like Suno. My read is that they aren't really producing — they're
taking free-for-profit beats and putting vocals on them. *(That's what I did when I started.)*
BandLab is also a competitor to Audiotool. Their strength is social presence and community; they
have a premium membership, whereas Audiotool is leaning on free plus community — users making
plugins that other users use.

**[38:00]** *(≈1 minute removed — speculation about Audiotool's business model.)*

**[39:00]** *(Recording ends.)*

---

## Decisions

1. **Not a generator.** The agent advises and executes on instruction; it never originates music
   unprompted. This was stated as the number-one takeaway twice.
2. **Two channels:** ambient (unprompted, voice, user-adjustable chattiness) and chat (prompted,
   text, grounded in what's on the timeline).
3. **Beginners are the target user**, chosen over intermediate. Modes for intermediate later.
4. **Voice is an add-on, not MVP.** Text first. Provider swappable — start with ElevenLabs,
   Deepgram or open-source later. First thing cut if scope tightens.
5. **Distribution:** an Audiotool app in its own window, routed into Audiotool, hosted by them.
6. **Process:** GitHub branches and PRs, merged when ready; chat for coordination. Analysis
   documents and meeting notes go in the repo.
7. **Persona:** "Dr. Zay," using Zay's own cloned voice with his consent. Possible lip-sync.
   Demo beat: the coach refusing to do the work for you.

## Roles

| Area | Owner |
|---|---|
| Front end / plugin MVP | volunteered on the call |
| SDK integration | Nolan |
| QA / bug testing | Aryan |
| Voice agent + prompting spec | shared |

## Action items

- [ ] Verify each feature in the project plan by **running tests**, not by reading documentation
- [ ] Write-up: what the voice agent and the prompting side should do
- [ ] Prototype that "actually feels musical" — possible demo target: next Friday
- [ ] Decide hosting if an open-source voice model is used
- [ ] Establish a bug-test workflow for latency-class issues like chord detection
- [ ] Review BandLab as the closest comparison
- [ ] Confirm available ElevenLabs credits

## Known bug raised on the call

**Chord press/release latency.** A released chord isn't registered at the right moment and gets
merged with neighbouring chords. Found while building the first feature. Needs a repeatable
bug-test loop rather than one-off fixes. Tracked against the event-pipeline work.

## Update since this call

The call's main open risk — what the agent can actually do in the DAW, and whether it can place
notes — has been answered by running it rather than reading docs:

- **Live write proven** against a real project: devices created, mixer master, channels and audio
  cables wired, read back intact, project deleted afterwards.
- **Note placement proven** offline against the SDK validator via
  `noteTrack` → `noteCollection` → `noteRegion` → `note`.

See `docs/NEXUS_CAPABILITIES_VERIFIED.md` for the verified API surface and the known footguns.
