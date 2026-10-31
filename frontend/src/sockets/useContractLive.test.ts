import { act, renderHook } from "@testing-library/react";
import { useContractLive } from "./useContractLive";
import { FALLBACK_POLL_MS } from "./useRoom";

const dispatch = jest.fn();
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => dispatch }));

type Handler = (...args: never[]) => void;
const handlers = new Map<string, Handler>();
const socket = {
  connected: false,
  on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
  off: jest.fn((event: string) => handlers.delete(event)),
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn<void, [string, object, (ack: { ok: boolean }) => void]>(),
};
jest.mock("./client", () => ({ getSocket: () => socket }));

const fire = (event: string, ...args: unknown[]) =>
  act(() => (handlers.get(event) as Handler)(...(args as never[])));

beforeEach(() => {
  jest.clearAllMocks();
  handlers.clear();
  socket.connected = false;
});

describe("useContractLive", () => {
  it("polls until the room is joined, then stops", () => {
    const { result } = renderHook(() => useContractLive("con_1"));
    expect(result.current).toBe(FALLBACK_POLL_MS);
    fire("connect");
    expect(socket.emit).toHaveBeenCalledWith("contract:join", { contractId: "con_1" }, expect.any(Function));
    act(() => socket.emit.mock.calls[0]?.[2]({ ok: true }));
    expect(result.current).toBe(0);
    fire("disconnect");
    expect(result.current).toBe(FALLBACK_POLL_MS);
  });

  it("refreshes the plan, its board and the list once per newer version, for its own plan only", () => {
    renderHook(() => useContractLive("con_1"));
    fire("contract:changed", { contractId: "con_other", version: 5 });
    fire("contract:changed", { contractId: "con_1", version: 2 });
    fire("contract:changed", { contractId: "con_1", version: 2 });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("leaves the room when the screen closes", () => {
    const { unmount } = renderHook(() => useContractLive("con_1"));
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(handlers.size).toBe(0);
  });
});
