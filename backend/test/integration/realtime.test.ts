import { createServer } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { PassThrough } from "node:stream";
import request from "supertest";
import { io as connect } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { createLogger } from "../../src/observability/logger";
import { attachRealtime, MAX_SOCKETS_PER_IP } from "../../src/realtime/io";
import type { Realtime } from "../../src/realtime/io";
import type { ContractChangedEvent, JoinAck, ShareChangedEvent } from "../../src/shared/api-types";
import { ORIGIN, buildApp, sessionCookie } from "../helpers/app";
import { createPools, prepareDatabase, truncateAll } from "../helpers/db";
import type { Pools } from "../helpers/db";
import { testEnv } from "../helpers/env";

let pools: Pools;
let server: HttpServer;
let realtime: Realtime;
let url: string;
const clients: Socket[] = [];

beforeAll(async () => {
  pools = createPools();
  await prepareDatabase(pools.owner);
  const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
  const env = testEnv();
  server = createServer(buildApp(pools));
  realtime = attachRealtime(server, { env, pool: pools.app, logger });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  await truncateAll(pools.owner);
});

afterEach(() => {
  for (const c of clients.splice(0)) c.close();
});

afterAll(async () => {
  await realtime.io.close();
  await pools.app.end();
  await pools.owner.end();
});

interface Person {
  id: string;
  cookie: string;
  contractId: string;
  shareId: string;
}

async function newGuest(): Promise<Person> {
  const res = await request(server).post("/api/auth/guest").set("Origin", ORIGIN).send({});
  const cookie = sessionCookie(res);
  const id = (res.body as { user: { id: string } }).user.id;
  const row = await pools.owner.query<{ contract_id: string; id: string }>(
    "SELECT s.contract_id, s.id FROM shares s JOIN contracts c ON c.id = s.contract_id WHERE c.owner_id = $1 ORDER BY c.seed_key, s.position LIMIT 1",
    [id],
  );
  return { id, cookie, contractId: row.rows[0]?.contract_id ?? "", shareId: row.rows[0]?.id ?? "" };
}

function open(opts: { cookie?: string; origin?: string; headers?: Record<string, string> } = {}): Socket {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.cookie) headers["cookie"] = opts.cookie;
  headers["origin"] = opts.origin ?? ORIGIN;
  const socket = connect(url, {
    transports: ["websocket"],
    extraHeaders: headers,
    reconnection: false,
    forceNew: true,
  });
  clients.push(socket);
  return socket;
}

function connected(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function nextEvent<T>(socket: Socket, name: string, ms = 600): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(name, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function join(socket: Socket, event: string, payload: unknown): Promise<JoinAck> {
  return (await socket.emitWithAck(event, payload)) as JoinAck;
}

describe("contract rooms (test 26)", () => {
  it("lets the owner join and receive contract:changed", async () => {
    const owner = await newGuest();
    const socket = open({ cookie: owner.cookie });
    await connected(socket);
    expect(await join(socket, "contract:join", { contractId: owner.contractId })).toEqual({ ok: true });
    const received = nextEvent<ContractChangedEvent>(socket, "contract:changed");
    realtime.notifier.contractChanged(owner.contractId, 7);
    expect(await received).toEqual({ contractId: owner.contractId, version: 7 });
  });

  it("refuses another user's contract with an error ack, and sends them nothing", async () => {
    const a = await newGuest();
    const b = await newGuest();
    const socket = open({ cookie: b.cookie });
    await connected(socket);
    expect(await join(socket, "contract:join", { contractId: a.contractId })).toEqual({
      ok: false,
      error: "not_found",
    });
    const received = nextEvent<ContractChangedEvent>(socket, "contract:changed");
    realtime.notifier.contractChanged(a.contractId, 1);
    expect(await received).toBeNull();
  });

  it("answers an unknown contract the same as someone else's", async () => {
    const b = await newGuest();
    const socket = open({ cookie: b.cookie });
    await connected(socket);
    expect(await join(socket, "contract:join", { contractId: "con_AAAAAAAAAAAAAAAAAAAAAA" })).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("refuses an anonymous visitor and a malformed request", async () => {
    const a = await newGuest();
    const anon = open();
    await connected(anon);
    expect(await join(anon, "contract:join", { contractId: a.contractId })).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    const user = open({ cookie: a.cookie });
    await connected(user);
    expect(await join(user, "contract:join", { contractId: "nope" })).toEqual({
      ok: false,
      error: "bad_request",
    });
    expect(await join(user, "contract:join", { contractId: a.contractId, extra: 1 })).toEqual({
      ok: false,
      error: "bad_request",
    });
  });

  it("treats a forged or tampered cookie as anonymous", async () => {
    const a = await newGuest();
    const socket = open({ cookie: `${a.cookie}x` });
    await connected(socket);
    expect(await join(socket, "contract:join", { contractId: a.contractId })).toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });
});

describe("share rooms", () => {
  it("lets anyone holding a real share id join and receive share:changed", async () => {
    const owner = await newGuest();
    const friend = open();
    await connected(friend);
    expect(await join(friend, "share:join", { shareId: owner.shareId })).toEqual({ ok: true });
    const received = nextEvent<ShareChangedEvent>(friend, "share:changed");
    realtime.notifier.shareChanged(owner.shareId, owner.contractId);
    expect(await received).toEqual({ shareId: owner.shareId, contractId: owner.contractId });
  });

  it("refuses an unknown share id, so ids cannot create rooms", async () => {
    const friend = open();
    await connected(friend);
    expect(await join(friend, "share:join", { shareId: "shr_AAAAAAAAAAAAAAAAAAAAAA" })).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("does not deliver a share event to someone who did not join", async () => {
    const owner = await newGuest();
    const bystander = open();
    await connected(bystander);
    const received = nextEvent<ShareChangedEvent>(bystander, "share:changed");
    realtime.notifier.shareChanged(owner.shareId, owner.contractId);
    expect(await received).toBeNull();
  });
});

describe("connection rules", () => {
  it("refuses a page from another origin", async () => {
    const socket = open({ origin: "https://evil.example" });
    await expect(connected(socket)).rejects.toBeDefined();
  });

  it("allows only 10 connections per IP and frees a slot on disconnect", async () => {
    const sockets = Array.from({ length: MAX_SOCKETS_PER_IP }, () => open());
    await Promise.all(sockets.map(connected));
    const eleventh = open();
    await expect(connected(eleventh)).rejects.toMatchObject({ message: "rate_limited" });
    sockets[0]?.close();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const again = open();
    await expect(connected(again)).resolves.toBeUndefined();
  });

  it("counts different clients behind a proxy separately (trust proxy)", async () => {
    const logger = createLogger({ level: "error", json: true, stream: new PassThrough() });
    const env = testEnv({ TRUST_PROXY: "1" });
    const proxied = createServer(buildApp(pools, { env: { TRUST_PROXY: "1" } }));
    const rt = attachRealtime(proxied, { env, pool: pools.app, logger });
    await new Promise<void>((resolve) => proxied.listen(0, "127.0.0.1", resolve));
    const proxiedUrl = `http://127.0.0.1:${(proxied.address() as AddressInfo).port}`;
    const connectAs = (ip: string): Socket => {
      const s = connect(proxiedUrl, {
        transports: ["websocket"],
        extraHeaders: { origin: ORIGIN, "x-forwarded-for": ip },
        reconnection: false,
        forceNew: true,
      });
      clients.push(s);
      return s;
    };
    const crowd = Array.from({ length: MAX_SOCKETS_PER_IP }, () => connectAs("203.0.113.1"));
    await Promise.all(crowd.map(connected));
    await expect(connected(connectAs("203.0.113.1"))).rejects.toMatchObject({ message: "rate_limited" });
    await expect(connected(connectAs("203.0.113.2"))).resolves.toBeUndefined();
    for (const c of clients.splice(0)) c.close();
    await rt.io.close();
  });
});
