# 03 — Add the GitHub Actions cron workflow

Paste this into Antigravity as-is. Do this AFTER you've deployed to Vercel
and have a real live URL (step 02 must be done and deployed first).

---

Add a GitHub Actions workflow that calls the deployed `/api/agent/tick`
endpoint on a schedule, so publishing genuinely happens over time rather
than all at once.

## Create `.github/workflows/tick.yml`
```yaml
name: agent-tick
on:
  schedule:
    - cron: "0 */2 * * *"
  workflow_dispatch: {}

jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Call tick endpoint
        run: |
          curl -sf -X POST "${{ secrets.TICK_URL }}" \
            -H "x-tick-secret: ${{ secrets.TICK_SECRET }}" \
            || echo "Tick call failed, will retry next scheduled run"
```

Note: `-sf` makes curl fail silently on HTTP errors but the `|| echo` keeps
the Action from showing as a failed run for a transient issue — we don't
want a red X in Actions history every time a single tick has a hiccup.

## After creating this file, tell me exactly:
1. That I need to go to GitHub repo → Settings → Secrets and variables →
   Actions, and add two repository secrets:
   - `TICK_URL` = my live Vercel URL + `/api/agent/tick`
   - `TICK_SECRET` = the same value I set in Vercel's env vars
2. That I can manually trigger it once via the Actions tab
   (workflow_dispatch) to test it before waiting for the real schedule
3. Remind me to actually check the Actions tab after ~2 hours to confirm a
   real scheduled run fired successfully — GitHub Actions cron can be
   delayed by a few minutes but should not be silently broken

Don't attempt to add or trigger the secrets yourself — I'll do that in the
GitHub UI directly.
