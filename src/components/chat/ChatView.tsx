"use client";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Bubble } from "@/components/ui";
import { RockyCard } from "@/components/app/RockyCard";

interface Message {
  role: "bot" | "user";
  content: string;
  structured?: Record<string, unknown> | null;
}

export interface QuickButton {
  label: string;
  prefix: string;
  onClick?: () => void; // se presente sovrascrive il comportamento default
}

export interface ChatViewHandle {
  appendText: (text: string) => void;
}

interface ChatViewProps {
  messages: Message[];
  onSend: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
  headerSlot?: React.ReactNode;
  quickButtons?: QuickButton[];
}

const MAX_TEXTAREA_H = 144;

export const ChatView = forwardRef<ChatViewHandle, ChatViewProps>(function ChatView(
  { messages, onSend, loading, placeholder, headerSlot, quickButtons },
  ref
) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Espone appendText al parent tramite ref
  useImperativeHandle(ref, () => ({
    appendText: (text: string) => {
      setInput((prev) => (prev.trim() === "" ? text : prev + "\n" + text));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_H) + "px";
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      });
    },
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_H);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_H ? "auto" : "hidden";
  }, [input]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onSend(text);
  };

  const handleQuickButton = (prefix: string) => {
    setInput((prev) => (prev.trim() === "" ? prefix : prev.endsWith("\n") ? prev + prefix : prev + "\n" + prefix));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {headerSlot}
        {messages.map((m, i) =>
          m.role === "bot" && m.structured ? (
            <div key={i} className="mb-2">
              <RockyCard data={m.structured as unknown as Parameters<typeof RockyCard>[0]["data"]} />
            </div>
          ) : (
            <Bubble key={i} from={m.role === "bot" ? "bot" : "user"}>
              {m.content}
            </Bubble>
          )
        )}
        {loading && (
          <div className="flex justify-start mb-2">
            <div className="bg-v-panel2 px-4 py-3 rounded-[18px] rounded-bl-[4px] flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-[6px] h-[6px] rounded-full bg-v-muted animate-typing"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 pt-2 pb-3 border-t border-v-line bg-v-panel shrink-0">
        {/* Bottoni rapidi */}
        {quickButtons && quickButtons.length > 0 && (
          <div className="flex gap-1.5 pb-2 flex-nowrap" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
            {quickButtons.map((btn) => {
              const used = input.includes(btn.prefix);
              return (
                <button
                  key={btn.prefix}
                  onClick={() => btn.onClick ? btn.onClick() : handleQuickButton(btn.prefix)}
                  className={`flex-none px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border transition-colors duration-150 cursor-pointer ${
                    used
                      ? "border-v-gold text-v-gold"
                      : "bg-v-panel2 border-v-line text-v-muted hover:border-v-gold hover:text-v-gold"
                  }`}
                  style={used ? { opacity: 0.45 } : undefined}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Textarea + invia */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder || "Scrivi a Rocky..."}
            disabled={loading}
            className="flex-1 bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none transition-colors duration-150 disabled:opacity-50 resize-none leading-relaxed"
            style={{ minHeight: 48, height: 48, overflowY: "hidden" }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-v-gold rounded-xl flex items-center justify-center text-v-bg shrink-0 cursor-pointer disabled:opacity-40 hover:bg-v-gold-hover transition-colors duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
