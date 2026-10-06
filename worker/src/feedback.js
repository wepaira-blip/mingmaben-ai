const ALLOWED = new Set(['correct','partial','wrong']);

export function d1FeedbackStore(db){
  if(!db) throw Object.assign(new Error('D1 database is not configured.'),{status:503});
  return {
    async hasReading(frozenId){
      const row=await db.prepare('SELECT frozen_id FROM readings WHERE frozen_id = ? LIMIT 1').bind(frozenId).first();
      return Boolean(row);
    },
    async insertFeedback(row){
      await db.prepare('INSERT INTO feedback (frozen_id, rating, created_at) VALUES (?, ?, ?)')
        .bind(row.frozen_id,row.rating,row.created_at).run();
    }
  };
}

export async function saveFeedback(store, frozenId, rating, now=()=>new Date()){
  if(typeof frozenId!=='string' || !frozenId.trim()) throw Object.assign(new Error('Frozen ID is required.'),{status:400});
  if(!ALLOWED.has(rating)) throw Object.assign(new Error('Invalid feedback rating.'),{status:400});
  if(!await store.hasReading(frozenId)) throw Object.assign(new Error('Frozen reading not found.'),{status:404});
  const row={frozen_id:frozenId,rating,created_at:now().toISOString()};
  await store.insertFeedback(row);
  return row;
}
