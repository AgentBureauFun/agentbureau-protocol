import { nextDelay } from './backoff.js';

// Self-scheduling poller. Pauses while the document is hidden and resumes with an immediate run.
export function createPoller({ task, base, max, onOk, onError, onPause, env }) {
  const e = env;
  let timer = null;
  let fails = 0;
  let running = false;
  let inFlight = false;

  const schedule = () => {
    if (!running || e.doc.hidden) return;
    timer = e.setTimeout(run, nextDelay(fails, { base, max, rng: e.rng }));
  };

  async function run() {
    timer = null;
    if (!running || e.doc.hidden || inFlight) return;
    inFlight = true;
    try {
      const data = await task();
      fails = 0;
      if (onOk) onOk(data);
    } catch (err) {
      fails += 1;
      if (onError) onError(err, fails);
    } finally {
      inFlight = false;
      schedule();
    }
  }

  const onVis = () => {
    if (!running) return;
    if (e.doc.hidden) {
      if (timer !== null) e.clearTimeout(timer);
      timer = null;
      if (onPause) onPause();
    } else if (timer === null && !inFlight) {
      run();
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      e.doc.addEventListener('visibilitychange', onVis);
      run();
    },
    stop() {
      running = false;
      if (timer !== null) e.clearTimeout(timer);
      timer = null;
      e.doc.removeEventListener('visibilitychange', onVis);
    },
    get fails() {
      return fails;
    }
  };
}
