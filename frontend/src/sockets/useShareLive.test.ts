import { renderHook } from "@testing-library/react";
import { useShareLive } from "./useShareLive";

const dispatch = jest.fn();
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => dispatch }));

type Handler = (event: object) => void;
const handlers = new Map<string, Handler>();
const socket = {
  connected: true,
  on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
};
jest.mock("./client", () => ({ getSocket: () => socket }));

describe("useShareLive", () => {
  it("joins the share's room and refreshes only for its own share", () => {
    renderHook(() => useShareLive("shr_1"));
    expect(socket.emit).toHaveBeenCalledWith("share:join", { shareId: "shr_1" }, expect.any(Function));
    handlers.get("share:changed")?.({ shareId: "shr_other", contractId: "con_1" });
    expect(dispatch).not.toHaveBeenCalled();
    handlers.get("share:changed")?.({ shareId: "shr_1", contractId: "con_1" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
