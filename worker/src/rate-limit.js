import { DAILY_ANALYSIS_LIMIT } from './config.js';

export async function anonymousDailyKey(request, day) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = request.headers.get('cf-connecting-ip') || forwarded.split(',')[0].trim() || 'unknown';
  const raw = `${ip}|${day}`;
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function d1UsageStore(db) {
  return {
    async getUsage(key, day) {
      if (!db) return 0;
      const row = await db.prepare('SELECT count FROM usage WHERE anonymous_daily_key = ? AND day = ?')
        .bind(key, day).first();
      return Number(row?.count || 0);
    },
    async setUsage(key, day, count) {
      if (!db) return;
      await db.prepare(`INSERT INTO usage (anonymous_daily_key, day, count)
        VALUES (?, ?, ?)
        ON CONFLICT(anonymous_daily_key, day) DO UPDATE SET count = excluded.count`)
        .bind(key, day, count).run();
    }
  };
}

export async function consumeDailyQuota(store, key, day, limit=DAILY_ANALYSIS_LIMIT) {
  const current = await store.getUsage(key, day);
  if (current >= limit) return { allowed:false, count:current, limit };
  const next = current + 1;
  await store.setUsage(key, day, next);
  return { allowed:true, count:next, limit };
}
