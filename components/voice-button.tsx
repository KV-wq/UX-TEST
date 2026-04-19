"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mic, MicOff } from "lucide-react";
import clsx from "clsx";

export type VoiceButtonHandle = {
  stop: () => void;
};

interface Props {
  onTranscript: (text: string) => void;
  onFinal?: (text: string) => void;
  disabled?: boolean;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const VoiceButton = forwardRef<VoiceButtonHandle, Props>(function VoiceButton(
  { onTranscript, onFinal, disabled },
  ref
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "ru-RU";
    rec.maxAlternatives = 1;

    rec.onresult = (e: unknown) => {
      const evt = e as {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      };
      let interim = "";
      let finalText = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const res = evt.results[i] as
          | (ArrayLike<{ transcript?: string }> & { isFinal?: boolean })
          | undefined;
        if (!res?.length) continue;
        const first = res[0];
        const text = first?.transcript ?? "";
        if (!text) continue;
        if (res.isFinal) finalText += text;
        else interim += text;
      }
      if (finalText) onFinalRef.current?.(finalText.trim());
      if (interim) onTranscriptRef.current(interim.trim());
    };

    rec.onerror = (e: unknown) => {
      const err = (e as { error?: string })?.error;
      if (
        err === "not-allowed" ||
        err === "service-not-allowed" ||
        err === "audio-capture"
      ) {
        wantListeningRef.current = false;
        setListening(false);
      }
    };

    rec.onend = () => {
      if (wantListeningRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            rec.start();
          } catch {
            /* already running */
          }
        }, 150);
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    return () => {
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        rec.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    wantListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      rec.stop();
    } catch {
      /* noop */
    }
    setListening(false);
    onTranscriptRef.current("");
  }, []);

  useImperativeHandle(ref, () => ({ stop: stopListening }), [stopListening]);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (wantListeningRef.current) {
      stopListening();
    } else {
      try {
        wantListeningRef.current = true;
        rec.start();
        setListening(true);
      } catch {
        wantListeningRef.current = false;
        setListening(false);
      }
    }
  }, [stopListening]);

  if (!supported) {
    return (
      <button
        type="button"
        className="w-11 h-11 shrink-0 rounded-full bg-white/5 border border-line text-ink-dim flex items-center justify-center opacity-50 cursor-not-allowed"
        title="Голосовой ввод не поддерживается в этом браузере"
        disabled
      >
        <MicOff size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Остановить запись" : "Говорить"}
      className={clsx(
        "w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors relative overflow-hidden active:scale-95",
        listening
          ? "bg-accent text-black shadow-glow"
          : "bg-white/5 text-ink hover:bg-white/10 border border-line"
      )}
    >
      {listening && (
        <>
          <span className="ping-inner absolute inset-0 rounded-full bg-black/25 pointer-events-none" />
          <span className="ping-inner-slow absolute inset-0 rounded-full bg-black/20 pointer-events-none" />
        </>
      )}
      <Mic size={16} className="relative z-10" />
    </button>
  );
});

export default VoiceButton;
