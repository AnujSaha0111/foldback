import winston from "winston";
import { getContext } from "./requestContext";

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "access_token",
  "client_secret",
  "x-api-key",
]);
const REDACTED = "[REDACTED]";
const MAX_DEPTH = 8;

/** Returns a copy with every sensitive key replaced, at any depth. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH || seen.has(value)) return "[Truncated]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(inner, depth + 1, seen);
  }
  return out;
}

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === "level" || key === "message") continue;
    info[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(info[key]);
  }
  return info;
});

const contextFormat = winston.format((info) => {
  const context = getContext();
  if (context) {
    info["requestId"] = context.requestId;
    if (context.userId) info["userId"] = context.userId;
  }
  return info;
});

export interface LoggerOptions {
  level: string;
  /** JSON lines in production, readable lines in development. */
  json: boolean;
  /** Tests pass a stream to read what was logged. */
  stream?: NodeJS.WritableStream;
}

export function createLogger({ level, json, stream }: LoggerOptions): winston.Logger {
  const shared = [contextFormat(), redactFormat()];
  const format = json
    ? winston.format.combine(...shared, winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        ...shared,
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.colorize(),
        winston.format.simple(),
      );
  return winston.createLogger({
    level,
    format,
    transports: [stream ? new winston.transports.Stream({ stream }) : new winston.transports.Console()],
  });
}

export type Logger = winston.Logger;
