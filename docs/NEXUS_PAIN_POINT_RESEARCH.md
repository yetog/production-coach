# NEXUS Hackathon Pain Point Research

> Research compiled: 2026-07-15
> Purpose: Inform hackathon project selection for Audiotool NEXUS

---

## Executive Summary

Research across user forums, academic papers, and industry sources reveals **7 validated pain points** in AI music generation and DJ workflows. The strongest opportunities for a NEXUS hackathon project balance severity, feasibility, and platform fit.

**Top 3 Recommendations:**
1. **Session Memory** - Highest feasibility, clear demo, strong NEXUS fit
2. **DJ Coach** - Live demo potential, domain expertise advantage
3. **Cultural Composition Assistant** - Most differentiated, requires careful scoping

---

## Pain Point Analysis

### Pain Point 1: AI Music is "Generate or Start Over"
**Severity: 5/5 | Frequency: 5/5 | Audience: Large**

**Evidence:**
- "Most producers know the frustration: you've generated an incredible AI track, but you can't isolate that perfect bassline" ([Soundverse](https://www.soundverse.ai/blog/article/reverse-engineer-your-ai-generated-songs-into-fl-studio-cubase-and-more))
- "Audacity's manual explains that once you mix down, unmixing is basically impossible—like trying to remove banana from a banana milkshake" ([Mureka](https://www.mureka.ai/hub/aimusic/how-to-mix-ai-music/))
- "Generating audio isn't the finish line, it's the starting gun... generate, listen, reject, adjust, and generate again, over and over" ([Wardrome](https://wardrome.com/ai-music-is-no-work-then-you-mix-my-12-stems-at-3-a-m/))
- Suno Studio April 2026: "no longer generates individual tracks"—stem editing producers relied on had regressed ([Opus Blog](https://www.opus.pro/blog/ai-music-news-april-2026))

**Primary User:** Producers using AI to augment their workflow (not replace it)

**Current Workaround:** Generate 10-20 variations, use external stem separation tools, manually crossfade around problems, accept quality degradation

**Minimum Demo:**
- Import AI-generated track into Audiotool
- Use NEXUS tool to say "keep the bassline from version 2, drums from version 5"
- Show seamless merge without regenerating from scratch

---

### Pain Point 2: Creative Intent Lost Across Sessions
**Severity: 4/5 | Frequency: 4/5 | Audience: Medium-Large**

**Evidence:**
- "Creative Misalignment—the discrepancy between participants' creative visions and generated output. 'It didn't go well with my initial ideas as planned'" ([arXiv Study](https://arxiv.org/html/2509.23364v1))
- "Workflow problems often emerge when real life happens: returning a day later and forgetting what you were building, coming back five days later and re-learning your own process" ([Soundverse](https://www.soundverse.ai/blog/article/how-to-build-a-music-ai-workflow-for-creators-0051))
- "40 files you actually love while tweaking versions, saving edits, and exporting drafts"—version chaos ([Jack Righteous](https://jackrighteous.com/en-us/blogs/music-creation-process-guide/ai-music-workflow-explained))
- "Does AI empower artists by enhancing creative exploration, or does it constrain the process by steering creativity in unintended directions?" ([arXiv Study](https://arxiv.org/html/2509.23364v1))

**Primary User:** Bedroom producers working on projects over multiple days/sessions

**Current Workaround:** Manual notes, complex file naming conventions, re-listening to everything to remember what was good, starting over

**Minimum Demo:**
- Open Audiotool session from 3 days ago
- Ask NEXUS assistant "what was I working on?"
- Get context: "You wanted darker energy in the second drop. Version 3 had the bassline you liked. You rejected version 4 because the vocals were too processed."
- Continue creating without re-learning your own project

---

### Pain Point 3: Cultural Bias in AI Music Generation
**Severity: 5/5 | Frequency: 5/5 | Audience: Medium (but underserved)**

**Evidence:**
- "Music from Africa accounts for only 0.3%, the Middle East: 0.4%, and South Asia 0.9%—whereas Western genres make up 94%" ([arXiv](https://arxiv.org/pdf/2412.04100))
- "Models often default to Western tonal structures when generating non-Western music. A generated piece intended to mimic an Indian raga may sound like a Western pop melody played on a sitar" ([arXiv](https://arxiv.org/html/2502.07328v1))
- "SunoAI, when attempting to generate Maqamat music of the Middle East, may round off the microtones to the nearest Western equivalent" ([MBZUAI](https://mbzuai.ac.ae/news/identifying-bias-in-generative-music-models-a-new-study-presented-at-naacl/))
- "The infrastructure that enables AI systems—massive datasets, computational resources, research institutions—remains concentrated in Western tech corporations, replicating extractive logics of traditional colonialism in digital form" ([Billboard](https://www.billboard.com/pro/ai-scaling-music-industry-biases-guest-column/))

**Primary User:** Musicians from non-Western traditions, producers making world music, cultural preservationists

**Current Workaround:** Accept westernized outputs, manually correct tuning/rhythm, avoid AI tools entirely, use external reference tracks

**Minimum Demo:**
- User requests "Hindustani classical fusion"
- NEXUS assistant detects the genre and provides:
  - Correct taal (rhythmic cycle) options
  - Appropriate raga modes (not Western scales)
  - Warns if output collapses into "generic world music"
- Show before/after: generic sitar-over-EDM vs. culturally-informed output

---

### Pain Point 4: Beginner DJs Don't Know What to Do During Transitions
**Severity: 4/5 | Frequency: 5/5 | Audience: Large**

**Evidence:**
- "One of the worst and most noticeable mistakes made by amateur DJs is not properly beat matching their mixes. Beat matching is one of the key pillars of mixing" ([Club Ready DJ School](https://www.clubreadydjschool.com/tribe-talk/getting-started/5-mistakes-beginner-djs-make))
- "Once new DJs learn about key, they put way too much importance on it and often pick tracks that are harmonically compatible versus keeping the overall energy and set flow in mind" ([DJ.Studio](https://dj.studio/blog/bad-dj-mixing-mistakes))
- "Phrasing is another technique that sets professionals apart from beginners" ([DJ.Studio](https://dj.studio/blog/bad-dj-mixing-mistakes))

**Existing Solutions (Competition):**
- AI DJ Coach (Jenova.ai): "structured learning path... every step calibrated to your specific controller"
- PulseDJ: "AI co-pilot... real-time track recommendations"
- VirtualDJ: "ModernEQs... perfect transitions like never before"

**Primary User:** Bedroom DJs with < 2 years experience, hobbyists who gig occasionally

**Current Workaround:** Watch YouTube tutorials, trial and error, use sync button, avoid complex transitions

**Minimum Demo:**
- DJ playing in Audiotool
- NEXUS coach says: "Incoming track is 8 bars away. Try a filter sweep on the outgoing bass, then swap at the drop. Here's why: the incoming track has a strong kick that will clash if you blend too early."
- Show the explanation adapting to skill level

---

### Pain Point 5: Workflow Fragmentation Across Tools
**Severity: 3/5 | Frequency: 4/5 | Audience: Large**

**Evidence:**
- "If you want to generate a song, separate stems, swap the vocal, export to MIDI, and master the final mix—you're switching between 3 to 5 different apps. That's where the most time gets wasted" ([Toolworthy](https://www.toolworthy.ai/blog/suno-alternatives))
- "Almost every AI music tool gives you a finished audio file and nothing else. AIVA is the only major exception with real MIDI export" ([Toolworthy](https://www.toolworthy.ai/blog/suno-alternatives))
- Suno: "single-track exports lack stems entirely"
- Udio: "high-quality complete tracks but no native stem separation"

**Primary User:** Semi-pro producers who use AI as part of a larger workflow

**Current Workaround:** Context-switch constantly, use external stem separators, accept quality loss, keep multiple apps open

**Minimum Demo:**
- Generate in one tool, stems in another, editing in third—show the mess
- vs. NEXUS unified workflow: generate → separate → edit → export all in Audiotool

**Note:** This is more of a platform selling point than a hackathon project. NEXUS already addresses this by design.

---

### Pain Point 6: AI Outputs Sound Generic/Acceptable But Not Creative
**Severity: 3/5 | Frequency: 4/5 | Audience: Medium**

**Evidence:**
- "Some producers embrace AI tools as inspiration, adapting their creative process to incorporate the AI's output. However, others report having to modify—sometimes completely changing—their original idea" ([arXiv](https://arxiv.org/html/2509.23364v1))
- "Suno's CEO suggested most people don't enjoy making music—a comment that sparked widespread backlash" ([Vohnic Music](https://vohnicmusic.com/blog/suno-ai-music-generator-2026))
- The "60/30/5 rule" from music production: "60% of the work is ideation and direction, 30% is execution, 5% is polish—AI often inverts this" ([Forbes](https://www.forbes.com/councils/forbestechcouncil/2026/06/01/the-60305-rule-what-music-producers-can-teach-about-building-ai-products/))

**Primary User:** Artists who want AI to enhance (not replace) their creative voice

**Current Workaround:** Heavy post-processing, manual injection of "wrong" elements, use AI only for background/filler, avoid AI for signature sounds

**Minimum Demo:** Hard to demo—this is more of a creative philosophy than a specific feature

---

### Pain Point 7: Export/Licensing Restrictions on AI Platforms
**Severity: 4/5 | Frequency: 5/5 | Audience: Large**

**Evidence:**
- Udio: "song downloads were disabled platform-wide" after UMG settlement ([eesel AI](https://www.eesel.ai/blog/suno-review))
- Suno: Warner deal "removed free-tier downloads, paid downloads gained caps" ([Eesel AI](https://www.eesel.ai/blog/suno-review))
- "The licensing frameworks are complex, and the 'commercial use' rights granted to end users still carry some ambiguity" ([Skycrumbs](https://skycrumbs.com/blog/ai-music-generation-2026-suno-udio))

**Primary User:** Anyone who wants to actually use AI-generated music

**Current Workaround:** Pay for higher tiers, navigate complex ToS, avoid AI for commercial projects

**Minimum Demo:** N/A—this is a business/legal issue, not a hackathon project

---

## NEXUS Platform Advantages

The research confirms NEXUS is uniquely positioned:

- **AI-to-AI communication:** "AI components can communicate with one another directly within the DAW—an industry first" ([AccessNewswire](https://www.accessnewswire.com/newsroom/en/computers-technology-and-internet/audiotool-launches-multiplayer-cloud-daw-and-debuts-nexus-an-indu-1129612))
- **MCP + Context I/O:** "Connect a creator's preferred LLM to Audiotool" ([GearNews](https://www.gearnews.com/audiotool-studio-nexus-daw-tech/))
- **Full API access:** "Audio engine, routing, signal-processing, MIDI, automation control, plugin state management" ([Yahoo Finance](https://finance.yahoo.com/news/audiotool-launches-multiplayer-cloud-daw-170000346.html))
- **Zero licensing fees:** "Free to build and easy to distribute" ([CompanyGlance](https://companyglance.com/news/audiotool-launches-multiplayer-cloud-daw-and-nexus-developer-platform/))

---

## Scoring Matrix

| Criterion | Session Memory | DJ Coach | Cultural Assistant | Continuous Composition | Hybrid Detection |
|-----------|---------------|----------|-------------------|----------------------|------------------|
| Severity (how frustrating?) | 4 | 4 | 5 | 4 | 3 |
| Frequency (how often?) | 4 | 5 | 5 | 4 | 3 |
| Audience size | 4 | 4 | 3 | 3 | 3 |
| Differentiation | 4 | 3 | 5 | 4 | 4 |
| Team fit | 4 | 5 | 3 | 3 | 2 |
| Feasibility | 5 | 4 | 3 | 3 | 2 |
| Demo clarity | 5 | 5 | 4 | 3 | 3 |
| NEXUS fit | 5 | 4 | 4 | 4 | 2 |
| **TOTAL** | **35** | **34** | **32** | **28** | **22** |

---

## Recommended Path Forward

### Option A: Session Memory (Score: 35)
**Build:** A NEXUS extension that tracks creative decisions, preferences, and version history across sessions.

**Why it wins:**
- Clearest demo ("what was I working on?")
- Directly uses NEXUS MCP/Context I/O
- No dependency on external AI model capabilities
- Solves a universal producer problem

### Option B: DJ Coach (Score: 34)
**Build:** Real-time transition coaching within Audiotool DJ mode.

**Why it's strong:**
- Isayah's domain expertise = unfair advantage
- Live demo is compelling
- Existing solutions (PulseDJ, Jenova) validate the market
- Clear differentiation: integrated into DAW, not a separate app

### Option C: Hybrid—Session Brain with Cultural Context (Score: ~34)
**Build:** Session memory that understands musical intent across cultural traditions.

**Example prompt:**
> "Keep the rhythmic structure from version two, retain the tabla phrasing, do not convert it into a standard four-on-the-floor beat, and make the next version more intense."

**Why it's interesting:**
- Combines feasibility of Session Memory with differentiation of Cultural Assistant
- Addresses both pain points 2 and 3
- Avoids model training—works at the workflow/prompt layer
- Aryan's cultural music knowledge + Isayah's workflow expertise

---

## Sources

### AI Music Generation
- [ToolixLab - Suno AI Review 2026](https://toolixlab.com/blog/suno-ai-review)
- [Opus Blog - AI Music News April 2026](https://www.opus.pro/blog/ai-music-news-april-2026)
- [Toolworthy - Suno Alternatives](https://www.toolworthy.ai/blog/suno-alternatives)
- [Skycrumbs - AI Music Generation 2026](https://skycrumbs.com/blog/ai-music-generation-2026-suno-udio)
- [eesel AI - Suno Review](https://www.eesel.ai/blog/suno-review)

### Cultural Bias
- [arXiv - Missing Melodies: AI Music and the Global South](https://arxiv.org/pdf/2412.04100)
- [arXiv - Music for All: Representational Bias](https://arxiv.org/html/2502.07328v1)
- [MBZUAI - Identifying Bias in Generative Music Models](https://mbzuai.ac.ae/news/identifying-bias-in-generative-music-models-a-new-study-presented-at-naacl/)
- [Billboard - AI Scaling Music Industry Biases](https://www.billboard.com/pro/ai-scaling-music-industry-biases-guest-column/)

### Producer Workflow
- [arXiv - AI-Assisted Music Production User Study](https://arxiv.org/html/2509.23364v1)
- [Soundverse - AI Music Workflow](https://www.soundverse.ai/blog/article/how-to-build-a-music-ai-workflow-for-creators-0051)
- [Forbes - 60/30/5 Rule](https://www.forbes.com/councils/forbestechcouncil/2026/06/01/the-60305-rule-what-music-producers-can-teach-about-building-ai-products/)

### DJ Tools
- [Club Ready DJ School - 5 Beginner Mistakes](https://www.clubreadydjschool.com/tribe-talk/getting-started/5-mistakes-beginner-djs-make)
- [DJ.Studio - Bad Mixing Mistakes](https://dj.studio/blog/bad-dj-mixing-mistakes)
- [Jenova AI - DJ Coach](https://www.jenova.ai/en/resources/ai-dj-coach)
- [PulseDJ](https://blog.pulsedj.com/beginner-dj-software)

### Audiotool/NEXUS
- [GearNews - Audiotool Studio & NEXUS](https://www.gearnews.com/audiotool-studio-nexus-daw-tech/)
- [AccessNewswire - NEXUS Launch](https://www.accessnewswire.com/newsroom/en/computers-technology-and-internet/audiotool-launches-multiplayer-cloud-daw-and-debuts-nexus-an-indu-1129612)
- [Music Ally - Audiotool Open Beta](https://musically.com/2026/02/10/open-beta-launches-for-redesigned-audiotool-studio-daw/)
- [Mixdown - Audiotool 3.0](https://mixdownmag.com.au/news/audiotool-3-0-launches-with-multiplayer-daw-and-open-sdk/)
