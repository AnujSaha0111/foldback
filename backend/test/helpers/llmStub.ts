import type { Extraction } from "../../src/domain/extraction";

/** One scripted answer of a fake language-model provider. */
export interface Step {
  status?: number;
  content?: string;
  finish?: string;
  fail?: "timeout" | "network";
}

export interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

const GOOD_CONTENT = '{"ok":true}';

function reply(step: Step): Response {
  if (step.status && step.status >= 400) {
    return new Response('{"error":"nope"}', {
      status: step.status,
      headers: { "x-ratelimit-remaining-requests": "7" },
    });
  }
  const body = {
    choices: [{ finish_reason: step.finish ?? "stop", message: { content: step.content ?? GOOD_CONTENT } }],
    usage: { prompt_tokens: 120, completion_tokens: 30 },
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

/** A fetch that returns the next scripted step each time it is called (a 500 once the script runs out), and records what it was sent. */
export function scripted(steps: Step[]): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...steps];
  const fake = ((url: string, init: RequestInit) => {
    calls.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as Record<string, unknown>,
    });
    const step = queue.shift() ?? { status: 500 };
    if (step.fail === "timeout") return Promise.reject(new DOMException("timed out", "TimeoutError"));
    if (step.fail === "network") return Promise.reject(new TypeError("fetch failed"));
    return Promise.resolve(reply(step));
  }) as unknown as typeof fetch;
  return { fetch: fake, calls };
}

/** A model that answers with this reading. */
export function says(reading: Extraction): Step {
  return { content: JSON.stringify(reading) };
}
