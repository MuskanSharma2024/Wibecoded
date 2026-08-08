# 08 — Transparency dashboard

Paste this into Antigravity as-is.

---

"Transparency of publishing rationale" is a named judging criterion. Right
now rationale is per-post and hidden in a collapsible. Add a small
dashboard view that makes editorial rigor visible at a glance.

## Add a `/stats` route (or a section on the homepage, whichever is less work)
Show, computed live from Supabase:
- Total topics considered (published + rejected, all-time)
- Total published
- Total rejected
- Rejection rate as a percentage (e.g. "68% of discovered topics rejected")
- A short list of the 5 most recent rejections with their one-line reasons,
  shown openly (not collapsed) — this is the single most convincing proof
  of real editorial judgment a judge can see in 5 seconds

## Style
Same terminal aesthetic as the main feed. Simple, dense, no charts needed —
plain numbers and a list is more credible than decoration here.

## Link it
Add a small link/tab from the main feed page to this view ("editorial log"
or similar), so a judge doesn't need to know the URL exists.

## Why this matters for judging
A judge skimming quickly needs to see rigor without reading rationale text
on every single post. A rejection rate number + visible recent rejections
does that in one glance and directly targets the "quality of editorial
decision-making" and "transparency" criteria.

## Verification
- Confirm the numbers match reality (cross-check against Supabase table
  counts directly)
- Confirm it still renders sensibly with very little data (early on, before
  many ticks have run)
