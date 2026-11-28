// Heavy runs (render, snap, check/gate of several creatures) take one machine-wide turn: two of them at once on the
// 16 GB cloud machine were killed for memory [21.11, render + snap all with 4 jobs]. The second run waits instead.
// Child processes of a pool inherit WS_CHILD and do not lock again.
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join } from 'node:path';

const studioDir = join(import.meta.dirname, '..', '.studio');
const lockFile = join(studioDir, 'heavy.lock');

/** Parallel jobs a heavy run may use: one per core, but no more than one per 4.5 GB of memory. */
export function defaultJobs() {
  return Math.max(1, Math.min(cpus().length, Math.floor(totalmem() / (4.5 * 2 ** 30))));
}

function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Waits for the machine-wide heavy-run lock and returns its release. A lock of a dead process is taken over. */
export async function heavyLock(what: string): Promise<() => void> {
  if (process.env.WS_CHILD) return () => {};
  if (!existsSync(studioDir)) mkdirSync(studioDir, { recursive: true });
  let told = false;
  for (;;) {
    try {
      writeFileSync(lockFile, JSON.stringify({ pid: process.pid, what, at: new Date().toISOString().slice(0, 16) }), { flag: 'wx' });
      break;
    } catch {
      let holder: { pid: number; what: string } | null = null;
      try {
        holder = JSON.parse(readFileSync(lockFile, 'utf8'));
      } catch {
        holder = null;
      }
      if (!holder || !alive(holder.pid)) {
        try {
          unlinkSync(lockFile);
        } catch {
          /* another waiter took it first */
        }
        continue;
      }
      if (!told) {
        console.log(`… waiting for «${holder.what}» (pid ${holder.pid}): heavy runs go one at a time`);
        told = true;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const release = () => {
    try {
      if (JSON.parse(readFileSync(lockFile, 'utf8')).pid === process.pid) unlinkSync(lockFile);
    } catch {
      /* already gone */
    }
  };
  process.on('exit', release);
  for (const sig of ['SIGINT', 'SIGTERM'] as const)
    process.once(sig, () => {
      release();
      process.exit(130);
    });
  return release;
}
