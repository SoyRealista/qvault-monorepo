/**
 * QVAULT X/Twitter bot — posts the next due item from content/queue.json.
 *
 * Posts AT MOST ONE item per run (a single tweet or a thread). Marks it posted
 * and writes the queue back. Designed to be run on a schedule (GitHub Action).
 *
 * Env (set as GitHub Secrets in CI, or a local .env):
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *   DRY_RUN=1   → don't post, just print what would be posted
 */
import { TwitterApi } from "twitter-api-v2";
import * as fs from "fs";
import * as path from "path";

const QUEUE = path.join(__dirname, "..", "content", "queue.json");
const DRY = process.env.DRY_RUN === "1";

type Item = {
  id: string;
  text?: string;
  thread?: string[];
  scheduledFor?: string | null; // ISO date; null/absent = send asap
  posted?: boolean;
  postedAt?: string;
  tweetId?: string;
};

function loadQueue(): Item[] {
  return JSON.parse(fs.readFileSync(QUEUE, "utf8"));
}
function saveQueue(q: Item[]) {
  fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2) + "\n");
}

function pickNext(q: Item[]): Item | undefined {
  const now = Date.now();
  const due = q.filter(
    (i) => !i.posted && (!i.scheduledFor || Date.parse(i.scheduledFor) <= now)
  );
  // earliest scheduled first, then queue order
  due.sort((a, b) => {
    const sa = a.scheduledFor ? Date.parse(a.scheduledFor) : 0;
    const sb = b.scheduledFor ? Date.parse(b.scheduledFor) : 0;
    return sa - sb;
  });
  return due[0];
}

function preview(item: Item): string {
  return item.thread ? item.thread.map((t, i) => `  (${i + 1}) ${t}`).join("\n") : `  ${item.text}`;
}

async function main() {
  const q = loadQueue();
  const item = pickNext(q);
  if (!item) {
    console.log("Nothing due to post. ✅");
    return;
  }
  console.log(`Next item: ${item.id}`);
  console.log(preview(item));

  if (DRY) {
    console.log("\nDRY_RUN — not posting.");
    return;
  }

  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.error("❌ Missing X API credentials (X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET).");
    process.exit(1);
  }

  const rw = new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  }).readWrite;

  let firstId: string | undefined;
  if (item.thread && item.thread.length) {
    let replyTo: string | undefined;
    for (const text of item.thread) {
      const res = await rw.v2.tweet(
        replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text }
      );
      replyTo = res.data.id;
      if (!firstId) firstId = res.data.id;
    }
  } else if (item.text) {
    const res = await rw.v2.tweet(item.text);
    firstId = res.data.id;
  } else {
    console.error(`❌ Item ${item.id} has neither text nor thread.`);
    process.exit(1);
  }

  item.posted = true;
  item.postedAt = new Date().toISOString();
  item.tweetId = firstId;
  saveQueue(q);
  console.log(`✅ Posted ${item.id} → tweet ${firstId}`);
}

main().catch((e) => {
  console.error("❌", e?.data || e?.message || e);
  process.exit(1);
});
