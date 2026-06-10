/**
 * QVAULT X/Twitter engagement bot — searches conversations about quantum
 * computing + crypto and replies with genuinely educational content.
 *
 * Rules:
 *   - MAX 3 replies per run (conservative — avoids spam flags)
 *   - Never reply to the same tweet twice (replied.json tracks IDs)
 *   - Never reply to our own tweets (@TheQVault)
 *   - Only reply to original tweets (not replies), to avoid deep thread spam
 *   - Minimum engagement threshold: publicMetrics.like_count >= 2
 *   - DRY_RUN=1 → prints what would be posted without actually replying
 *
 * Env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 */
import { TwitterApi, TweetV2 } from "twitter-api-v2";
import * as fs from "fs";
import * as path from "path";

const REPLIED_FILE  = path.join(__dirname, "..", "content", "replied.json");
const TEMPLATES_FILE = path.join(__dirname, "..", "content", "reply-templates.json");

const DRY             = process.env.DRY_RUN === "1";
const MAX_PER_RUN     = 3;
const MIN_LIKES       = 2;
const OWN_HANDLE      = "TheQVault";

// Search queries — one per run, rotated by day-of-year so a daily schedule
// cycles through all of them. Two blocks: the quantum niche (core thesis,
// high relevance) and broader crypto conversations (high volume, visibility).
const QUERIES = [
  // ── Quantum niche (core thesis) ──
  '("quantum computer" OR "quantum computing") (bitcoin OR crypto OR blockchain) -is:retweet -is:reply lang:en',
  '("post-quantum" OR "post quantum") (crypto OR blockchain OR defi) -is:retweet -is:reply lang:en',
  '"quantum threat" (crypto OR bitcoin OR blockchain) -is:retweet -is:reply lang:en',
  '"CRYSTALS-Dilithium" OR "post-quantum cryptography" -is:retweet -is:reply lang:en',
  // ── Broader crypto (visibility) ──
  '(solana OR "$SOL") (staking OR defi OR ecosystem) -is:retweet -is:reply lang:en',
  '("token launch" OR launchpad OR "new project") solana -is:retweet -is:reply lang:en',
  '("crypto security" OR "wallet security" OR "protect your crypto") -is:retweet -is:reply lang:en',
  '(tokenomics OR "buyback and burn" OR "fee sharing") (crypto OR defi) -is:retweet -is:reply lang:en',
  '("dao governance" OR "on-chain governance") crypto -is:retweet -is:reply lang:en',
  '("future of crypto" OR "crypto in 2030" OR "next bull run") -is:retweet -is:reply lang:en',
];

type Template = { id: string; tags: string[]; text: string };
type Replied   = string[]; // array of tweet IDs

/* ─── helpers ─────────────────────────────────────────────────────── */

function loadReplied(): Replied {
  try { return JSON.parse(fs.readFileSync(REPLIED_FILE, "utf8")); }
  catch { return []; }
}

function saveReplied(ids: Replied) {
  // Keep only last 2000 IDs to avoid the file growing unbounded
  const trimmed = ids.slice(-2000);
  fs.writeFileSync(REPLIED_FILE, JSON.stringify(trimmed, null, 2) + "\n");
}

function loadTemplates(): Template[] {
  return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf8"));
}

function pickTemplate(tweetText: string, templates: Template[]): Template {
  const lower = tweetText.toLowerCase();
  // Score each template by how many of its tags appear in the tweet
  const scored = templates.map(t => ({
    t,
    score: t.tags.filter(tag => lower.includes(tag.toLowerCase())).length,
  }));
  // Sort by score desc, then shuffle equally-scored ones for variety
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return scored[0].t;
}

function pickQuery(): string {
  // Rotate by day-of-year so a daily schedule cycles through every query
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86400000);
  return QUERIES[dayOfYear % QUERIES.length];
}

/* ─── main ────────────────────────────────────────────────────────── */

async function main() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.log("⏭️  X API credentials not set — skipping engage run.");
    return;
  }

  const client = new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  }).readWrite;

  const replied   = loadReplied();
  const templates = loadTemplates();
  const query     = pickQuery();

  console.log(`🔍 Searching: ${query}`);

  // Search recent tweets (last 7 days)
  let results;
  try {
    results = await client.v2.search(query, {
      max_results: 20,
      "tweet.fields": ["public_metrics", "author_id", "conversation_id", "in_reply_to_user_id", "created_at"],
      "user.fields": ["username"],
      expansions: ["author_id"],
    });
  } catch (e: any) {
    console.error("❌ Search failed:", e?.data || e?.message || e);
    process.exit(1);
  }

  const tweets: TweetV2[] = results.data.data ?? [];
  const users = results.data.includes?.users ?? [];
  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.id] = u.username;

  if (!tweets.length) {
    console.log("No tweets found for this query. ✅");
    return;
  }

  // Filter candidates
  const candidates = tweets.filter(tw => {
    // Skip already replied
    if (replied.includes(tw.id)) return false;
    // Skip our own tweets
    if (userMap[tw.author_id ?? ""]?.toLowerCase() === OWN_HANDLE.toLowerCase()) return false;
    // Skip replies (we only want to reply to original tweets)
    if (tw.in_reply_to_user_id) return false;
    // Skip low-engagement
    const likes = tw.public_metrics?.like_count ?? 0;
    if (likes < MIN_LIKES) return false;
    return true;
  });

  // Sort by engagement (likes + retweets) descending
  candidates.sort((a, b) => {
    const scoreA = (a.public_metrics?.like_count ?? 0) + (a.public_metrics?.retweet_count ?? 0);
    const scoreB = (b.public_metrics?.like_count ?? 0) + (b.public_metrics?.retweet_count ?? 0);
    return scoreB - scoreA;
  });

  const targets = candidates.slice(0, MAX_PER_RUN);

  if (!targets.length) {
    console.log("No suitable candidates to reply to this run. ✅");
    return;
  }

  console.log(`📋 Found ${candidates.length} candidates — replying to ${targets.length}`);

  for (const tw of targets) {
    const handle   = userMap[tw.author_id ?? ""] ?? "unknown";
    const template = pickTemplate(tw.text, templates);
    const replyText = template.text;

    console.log(`\n➡️  @${handle}: "${tw.text.slice(0, 80)}…"`);
    console.log(`   Template: ${template.id}`);
    console.log(`   Reply: ${replyText}`);

    if (DRY) {
      console.log("   [DRY_RUN — not posted]");
      replied.push(tw.id); // mark as replied even in dry run to avoid infinite dry-run loops
    } else {
      try {
        const res = await client.v2.reply(replyText, tw.id);
        console.log(`   ✅ Replied → tweet ${res.data.id}`);
        replied.push(tw.id);
        // Small pause between replies to look more human
        await new Promise(r => setTimeout(r, 4000));
      } catch (e: any) {
        console.error(`   ❌ Reply failed:`, e?.data || e?.message || e);
        // Continue with next candidate even if this one fails
      }
    }
  }

  saveReplied(replied);
  console.log(`\n✅ Engage run complete. Total replied (all-time): ${replied.length}`);
}

main().catch(e => {
  console.error("❌ Engage bot crashed:", e?.data || e?.message || e);
  process.exit(1);
});
