# 02 — Prep for Vercel deployment

Paste this into Antigravity as-is.

---

Prepare this Next.js project for a clean Vercel deployment.

## 1. Confirm environment variable usage
Check every file under `lib/` and `pages/api/` (or `app/api/`) that reads
`process.env.*`. Confirm these four are the only ones required:
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
GROQ_API_KEY
TICK_SECRET
```
If any are missing from `.env.example`, add them there (with placeholder
values, never real keys).

## 2. Add a `.gitignore` if one doesn't already exist
Must include at minimum:
```
node_modules
.next
.env
.env.local
```
Confirm `.env` or `.env.local` (whichever holds real keys locally) is NOT
tracked by git — run a check and warn me if it's already been committed.

## 3. Build check
Run `npm run build` locally and fix any build errors (missing imports, type
issues, etc.) — Vercel will fail the deploy on the same errors.

## 4. Confirm no server-only code runs in a client component
Anything using `lib/supabase.js` (which uses the service-role key) must only
run in Server Components or API routes — never in a `"use client"` file.
Double check the feed page for this.

## Output for me
After this is done, tell me explicitly:
1. Confirmation the build passes locally
2. Confirmation `.env*` is gitignored
3. The exact list of env vars I need to paste into Vercel's dashboard

I will then push to GitHub and connect the repo in Vercel myself — you don't
need to do the actual deployment, just get the repo ready for it.
