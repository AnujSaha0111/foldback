import type { Server as HttpServer } from "node:http";
import type { Pool } from "pg";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { z } from "zod";
import type { Env } from "../config/env";
import { clientIp } from "../http/clientIp";
import { readCookie, SESSION_COOKIE } from "../http/cookies";
import type { Logger } from "../observability/logger";
import { ownsContract } from "../repositories/contracts.repo";
import { shareExists } from "../repositories/shares.repo";
import { userFromToken } from "../services/session";
import type { JoinAck } from "../shared/api-types";
import { createNotifier } from "./notify";
import type { Notifier } from "./notify";

export const MAX_SOCKETS_PER_IP = 10;

interface SocketData {
  /** The signed-in organizer, or null for an anonymous visitor (a friend on a pay link). */
  userId: string | null;
}

type NoEvents = Record<string, never>;
type AppServer = Server<NoEvents, NoEvents, NoEvents, SocketData>;
type AppSocket = Socket<NoEvents, NoEvents, NoEvents, SocketData>;

interface Deps {
  env: Env;
  pool: Pool;
  logger: Logger;
}

export interface Realtime {
  io: Server;
  notifier: Notifier;
}

const contractJoin = z.strictObject({ contractId: z.string().regex(/^con_[A-Za-z0-9_-]{22}$/) });
const shareJoin = z.strictObject({ shareId: z.string().regex(/^shr_[A-Za-z0-9_-]{22}$/) });

function reply(ack: unknown, result: JoinAck): void {
  if (typeof ack === "function") (ack as (r: JoinAck) => void)(result);
}

/** Who is connecting (optional, from the same cookie as REST), then the per-IP connection limit. */
function handshake({ env, pool, logger }: Deps): (socket: AppSocket, next: (err?: Error) => void) => void {
  const log = logger.child({ module: "realtime" });
  const perIp = new Map<string, number>();

  const admit = (socket: AppSocket): Error | null => {
    const ip = clientIp(
      socket.handshake.headers["x-forwarded-for"],
      socket.handshake.address,
      env.TRUST_PROXY,
    );
    const open = perIp.get(ip) ?? 0;
    if (open >= MAX_SOCKETS_PER_IP) return new Error("rate_limited");
    perIp.set(ip, open + 1);
    socket.on("disconnect", () => {
      const left = (perIp.get(ip) ?? 1) - 1;
      if (left <= 0) perIp.delete(ip);
      else perIp.set(ip, left);
    });
    return null;
  };

  return (socket, next) => {
    const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
    userFromToken(token, pool, env)
      .then((user) => {
        socket.data.userId = user?.id ?? null;
        next(admit(socket) ?? undefined);
      })
      .catch((err: unknown) => {
        log.error("handshake failed", { err });
        next(new Error("unavailable"));
      });
  };
}

async function joinContract(socket: AppSocket, payload: unknown, { pool }: Deps): Promise<JoinAck> {
  const parsed = contractJoin.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "bad_request" };
  const userId = socket.data.userId;
  if (userId === null) return { ok: false, error: "unauthenticated" };
  // Someone else's contract and a missing one answer the same way.
  if (!(await ownsContract(pool, userId, parsed.data.contractId))) return { ok: false, error: "not_found" };
  await socket.join(`contract:${parsed.data.contractId}`);
  return { ok: true };
}

async function joinShare(socket: AppSocket, payload: unknown, { pool }: Deps): Promise<JoinAck> {
  const parsed = shareJoin.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "bad_request" };
  // The share id is the capability, but only real shares get a room, so ids cannot be used to fill memory.
  if (!(await shareExists(pool, parsed.data.shareId))) return { ok: false, error: "not_found" };
  await socket.join(`share:${parsed.data.shareId}`);
  return { ok: true };
}

/** Runs a join and always answers the client, even when the database fails. */
function answer(ack: unknown, work: Promise<JoinAck>, log: Logger, what: string): void {
  work.then(
    (result) => reply(ack, result),
    (err: unknown) => {
      log.error(`${what} failed`, { err });
      reply(ack, { ok: false, error: "not_found" });
    },
  );
}

/**
 * Socket.IO on /socket.io. A client can join the room of a contract only if it owns it, and the room of a share by
 * holding the pay link. Rooms only ever receive ids (see notify.ts), so even a wrong join leaks nothing: the data
 * comes from REST, which checks ownership again.
 */
export function attachRealtime(httpServer: HttpServer, deps: Deps): Realtime {
  const { env } = deps;
  const log = deps.logger.child({ module: "realtime" });
  const allowedOrigins = new Set(env.CORS_ORIGINS);

  const io: AppServer = new Server(httpServer, {
    path: "/socket.io",
    serveClient: false,
    maxHttpBufferSize: 100_000,
    cors: { origin: env.CORS_ORIGINS, credentials: true },
    // Browsers always send Origin. A page on another site is refused, which also blocks cross-site socket hijacking.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, origin === undefined || allowedOrigins.has(origin));
    },
  });

  io.use(handshake(deps));
  io.on("connection", (socket) => {
    socket.on("contract:join", (payload: unknown, ack: unknown) => {
      answer(ack, joinContract(socket, payload, deps), log, "contract:join");
    });
    socket.on("share:join", (payload: unknown, ack: unknown) => {
      answer(ack, joinShare(socket, payload, deps), log, "share:join");
    });
  });

  return { io, notifier: createNotifier(io) };
}
