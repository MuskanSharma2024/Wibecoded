# 11 — Upgrade PROMPTS.md structure

Paste this into Antigravity as-is. This is about the existing PROMPTS.md
file, not application code.

---

Restructure `PROMPTS.md` from a flat chronological log into a format that's
easier for both you and the judges to verify against the actual codebase —
this directly affects Stage 2 (Authenticity Review), where reviewers check
that prompt history corresponds to implemented features.

## New structure

```markdown
# PROMPTS.md

AI-assisted build log for [project name]. Organized by feature area so
prompts can be checked against the corresponding code/commits directly.

## Timeline
[commit or rough time range] — one line per major milestone, in order,
e.g.:
- Initial scaffold (Next.js, API route structure)
- Persona + prompt design (judgment + writing prompts)
- Discovery pipeline (HN + arXiv)
- Tick pipeline + dedup logic
- Feed UI (terminal aesthetic)
- Memory/continuity layer
- Transparency dashboard
- Deployment + cron setup
- Final QA pass

## Prompts by feature area

### Scaffolding & architecture
[real prompts used, in order]

### Persona & prompt design
[real prompts used]

### Discovery pipeline
[real prompts used]

### Tick pipeline & reliability
[real prompts used]

### Feed UI
[real prompts used]

### Memory & transparency features
[real prompts used]

### Deployment & infra
[real prompts used]

### Bug fixes / iteration
[real prompts used — don't hide these, iteration is normal and expected]
```

## Instructions
- Go back through the actual Antigravity conversation history for this
  project and pull the real prompts into the matching section above —
  don't paraphrase them, use the actual text
- It's fine and expected to have messy, iterative, or corrective prompts
  in here ("fix the build error from X") — that's what makes the log
  credible. A suspiciously clean log is itself a red flag in authenticity
  review.
- Keep timestamps or rough ordering where available so the timeline
  section can be cross-checked against git commit history

## Verification
- Read through PROMPTS.md once fully and confirm every major feature in
  the live app has at least one corresponding entry
- Confirm nothing in the app exists that ISN'T reflected somewhere in this
  file
