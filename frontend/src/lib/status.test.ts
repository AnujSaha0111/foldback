import { CONTRACT_STATUSES, SHARE_STATUSES } from "@/types/generated/statuses";
import { CONTRACT_STATUS_VIEW, SHARE_STATUS_VIEW } from "./status";

describe("status views", () => {
  it("covers every share status the backend knows", () => {
    expect(Object.keys(SHARE_STATUS_VIEW).sort()).toEqual([...SHARE_STATUSES].sort());
  });

  it("covers every contract status the backend knows", () => {
    expect(Object.keys(CONTRACT_STATUS_VIEW).sort()).toEqual([...CONTRACT_STATUSES].sort());
  });

  it("gives every status a non-empty word", () => {
    for (const view of [...Object.values(SHARE_STATUS_VIEW), ...Object.values(CONTRACT_STATUS_VIEW)]) {
      expect(view.label.trim()).not.toBe("");
    }
  });

  it("shows unknown money outcomes as failures, never as success", () => {
    for (const status of [
      "authorize_unknown",
      "capture_unknown",
      "void_unknown",
      "capture_failed",
    ] as const) {
      expect(SHARE_STATUS_VIEW[status].tone).toBe("failed");
    }
  });
});
