import { useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";

/** The part of the browser's SpeechRecognition this uses. TypeScript's DOM types do not include it. */
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const speech = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

const PROBLEMS: Record<string, string> = {
  "not-allowed": "Allow the microphone to speak the plan.",
  "no-speech": "Nothing was heard. Try again, or type the plan.",
};

/**
 * Speech to text with the browser's own recognition, so the organizer can say the plan instead of pasting it. Each
 * finished phrase goes to `onWords`; nothing is sent to Foldback until they press Read the plan.
 */
export function useSpeech(onWords: (words: string) => void) {
  const supported = useClientValue(() => recognitionCtor() !== undefined, false);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const latest = useRef(onWords);

  useEffect(() => {
    latest.current = onWords;
  });
  useEffect(() => () => recognition.current?.stop(), []);

  const toggle = () => {
    const Ctor = recognitionCtor();
    if (recognition.current || !Ctor) {
      recognition.current?.stop();
      return;
    }
    const heard = new Ctor();
    heard.continuous = true;
    heard.interimResults = false;
    heard.lang = navigator.language || "en-US";
    heard.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) latest.current(result[0].transcript.trim());
      }
    };
    heard.onerror = (event) => {
      if (event.error !== "aborted")
        setProblem(PROBLEMS[event.error] ?? "Listening stopped. Try again, or type the plan.");
    };
    heard.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = heard;
    setProblem(null);
    setListening(true);
    heard.start();
  };

  return { supported, listening, problem, toggle };
}
