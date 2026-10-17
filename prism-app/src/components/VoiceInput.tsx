"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Talk instead of type. Every phone keyboard already has a dictation mic, but
 * people don't think to use it in a chat box — so this puts a mic right beside
 * Send. Where the browser can transcribe (Chrome, Edge, Safari), pressing it
 * dictates straight into the box. Where it can't (Firefox), it points at the
 * keyboard's own mic instead. Nothing is sent until the person presses Send,
 * so they can read and fix what was heard first.
 *
 * The browser does the transcription (in Chrome that means Google's speech
 * service); no audio reaches our servers.
 */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  // What was in the box when listening began, so dictation appends to it.
  const base = useRef("");

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => rec.current?.stop();
  }, []);

  useEffect(() => {
    if (disabled && listening) rec.current?.stop();
  }, [disabled, listening]);

  function start() {
    const Ctor = getRecognition();
    if (!Ctor) {
      setHint("Tap the mic on your keyboard to talk — your phone will type it for you.");
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    base.current = value ? value.replace(/\s*$/, " ") : "";
    r.onresult = (e) => {
      let heard = "";
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      onChange(base.current + heard.trimStart());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setHint("Your browser blocked the microphone. Allow it in the address bar, or use the mic on your keyboard.");
      }
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setHint(null);
    r.start();
    setListening(true);
  }

  function stop() {
    rec.current?.stop();
    setListening(false);
  }

  if (supported === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Talk instead of typing"}
        title={listening ? "Stop listening" : "Talk instead of typing"}
        className={`self-end rounded-xl px-4 py-3 border transition-all disabled:opacity-40 ${
          listening
            ? "border-accent bg-accent text-background animate-pulse"
            : "border-borderline text-muted hover:border-accent hover:text-accent"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
          <line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      </button>
      {(listening || hint) && (
        <p className="w-full text-xs text-center text-muted -mb-1" aria-live="polite">
          {listening ? "Listening — speak freely, then press the mic again and Send." : hint}
        </p>
      )}
    </>
  );
}
