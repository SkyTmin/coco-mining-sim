// One worker of a parallel snap: loads the painting once, then hashes the frame ranges the parent sends.
// Message in: { id } once, then { anim, from, to } per chunk; message out: { hashes, rss } per chunk (the parent
// replaces a worker whose memory has grown past SNAP_WORKER_MB).
// Frames are independent (compose is a pure function of the time), so any split gives the same hashes.
import { hashRange, loadForHash } from './snap';

let painting: Awaited<ReturnType<typeof loadForHash>> | null = null;

process.on('message', async (msg: { id?: string; anim?: string; from?: number; to?: number }) => {
  try {
    if (msg.id) {
      painting = await loadForHash(msg.id);
      process.send!({ ready: true });
      return;
    }
    if (!painting) throw new Error('snap worker: painting not loaded');
    const hashes = hashRange(painting, msg.anim!, msg.from!, msg.to!);
    process.send!({ hashes, rss: process.memoryUsage().rss });
  } catch (e) {
    process.send!({ error: e instanceof Error ? e.stack ?? e.message : String(e) });
  }
});
