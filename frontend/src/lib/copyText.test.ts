import { copyText } from "./copyText";

const execCommand = jest.fn(() => true);

beforeEach(() => {
  execCommand.mockClear();
  Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
});

const clipboard = (writeText: (text: string) => Promise<void>) =>
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

describe("copyText", () => {
  it("uses the clipboard when the browser allows it", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    clipboard(writeText);
    expect(await copyText("https://app.example/pay/x")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://app.example/pay/x");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to the copy command when the clipboard refuses, and leaves nothing behind", async () => {
    clipboard(() => Promise.reject(new Error("Document is not focused.")));
    expect(await copyText("link")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("says so when nothing could copy", async () => {
    clipboard(() => Promise.reject(new Error("denied")));
    execCommand.mockReturnValueOnce(false);
    expect(await copyText("link")).toBe(false);
  });
});
