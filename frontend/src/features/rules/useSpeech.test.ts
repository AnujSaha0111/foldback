import { act, renderHook } from "@testing-library/react";
import { useSpeech } from "./useSpeech";

/** A stand-in for the browser's recognizer, driven by the test. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = true;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = jest.fn();
  stop = jest.fn(() => this.onend?.());
  constructor() {
    FakeRecognition.last = this;
  }
  say(transcript: string, isFinal = true) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
  }
}

const speech = window as unknown as { webkitSpeechRecognition?: typeof FakeRecognition };

afterEach(() => {
  delete speech.webkitSpeechRecognition;
  FakeRecognition.last = null;
});

describe("useSpeech", () => {
  it("is unsupported where the browser has no recognizer", () => {
    const { result } = renderHook(() => useSpeech(jest.fn()));
    expect(result.current.supported).toBe(false);
  });

  it("listens, passes on each finished phrase, and stops on a second press", () => {
    speech.webkitSpeechRecognition = FakeRecognition;
    const onWords = jest.fn();
    const { result } = renderHook(() => useSpeech(onWords));
    expect(result.current.supported).toBe(true);

    act(() => result.current.toggle());
    const heard = FakeRecognition.last;
    expect(heard?.start).toHaveBeenCalled();
    expect(heard?.continuous).toBe(true);
    expect(result.current.listening).toBe(true);

    act(() => heard?.say("half a word", false));
    act(() => heard?.say(" cabin is $320 "));
    expect(onWords.mock.calls).toEqual([["cabin is $320"]]);

    act(() => result.current.toggle());
    expect(heard?.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });

  it("says why it stopped when the microphone is blocked", () => {
    speech.webkitSpeechRecognition = FakeRecognition;
    const { result } = renderHook(() => useSpeech(jest.fn()));
    act(() => result.current.toggle());
    act(() => FakeRecognition.last?.onerror?.({ error: "not-allowed" }));
    act(() => FakeRecognition.last?.onend?.());
    expect(result.current.problem).toBe("Allow the microphone to speak the plan.");
    expect(result.current.listening).toBe(false);
  });
});
