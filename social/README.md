# QVAULT — Social Bot (X / Twitter)

Auto-posts content from a queue, one item per run, on a schedule. Free and
serverless via GitHub Actions.

## How it works
- `content/queue.json` — your posts. Each item is a single `text` **or** a
  `thread` (array of tweets). Optional `scheduledFor` (ISO date) holds an item
  until its time; items with no date go out in order.
- `src/post.ts` — picks the next due item, posts it, marks it `posted` and saves.
- `.github/workflows/social-bot.yml` — runs the bot daily (and on manual trigger),
  then commits the updated queue so it never double-posts.

## One-time setup
1. **Create an X developer app** at https://developer.x.com → a Project + App
   with **Read and Write** permissions. Generate OAuth 1.0a keys:
   API Key, API Secret, Access Token, Access Token Secret.
   > Note: X's API has tiers. The free tier is limited and write-oriented;
   > heavier automation may need a paid tier. Follow X's automation rules.
2. **Add them as repo Secrets** (Settings → Secrets and variables → Actions):
   `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`.
3. The workflow runs daily at 15:00 UTC. Trigger it manually anytime from the
   Actions tab (“Run workflow”).

## Local use
```bash
cd social
npm install
cp .env.example .env   # fill in your keys
npm run dry            # preview the next item without posting
npm run post           # actually post the next item
```

## Adding content
Append objects to `content/queue.json`:
```json
{ "id": "my-post", "text": "gm. ⬡ $QVLT", "posted": false }
```
or a thread:
```json
{ "id": "my-thread", "thread": ["first tweet 1/2", "second 2/2"], "posted": false }
```
Keep each tweet ≤ 280 characters.
