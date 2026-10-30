import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { API_URL } from "@/lib/env";

let socket: Socket | null = null;

/** The one Socket.IO client. It connects when a screen asks (`socket.connect()`), never on import. */
export function getSocket(): Socket {
  socket ??= io(API_URL, { path: "/socket.io", withCredentials: true, autoConnect: false });
  return socket;
}
