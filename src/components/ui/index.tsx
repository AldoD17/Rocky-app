"use client";
import React from "react";

export { Mascot } from "./Mascot";

// ── Button ──
export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const base =
    "w-full rounded-xl min-h-[48px] px-5 font-body text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center";
  const variants = {
    primary: "bg-v-gold text-v-bg hover:bg-v-gold-hover",
    ghost:
      "bg-transparent border border-v-line text-v-muted hover:border-v-gold hover:text-v-gold",
    danger: "bg-v-red-dim border border-v-red text-v-red",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Semaforo badge ──
export function Semaforo({
  state,
  label,
}: {
  state: "green" | "yellow" | "red";
  label: string;
}) {
  const colors = {
    green: "bg-v-green-dim text-v-green",
    yellow: "bg-v-amber-dim text-v-amber",
    red: "bg-v-red-dim text-v-red",
  };
  const dotColors = {
    green: "bg-v-green shadow-[0_0_6px_#6abf7b]",
    yellow: "bg-v-amber shadow-[0_0_6px_#d4a24e]",
    red: "bg-v-red shadow-[0_0_6px_#cf6b5e]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold font-body ${colors[state]}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotColors[state]}`} />
      {label}
    </span>
  );
}

// ── Chat bubble ──
export function Bubble({
  from,
  children,
}: {
  from: "bot" | "user";
  children: React.ReactNode;
}) {
  const isBot = from === "bot";
  return (
    <div className={`flex mb-2 ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed font-body ${
          isBot
            ? "bg-v-panel2 text-v-cream rounded-[18px] rounded-bl-[4px]"
            : "bg-v-gold text-v-bg font-medium rounded-[18px] rounded-br-[4px]"
        }`}
        dangerouslySetInnerHTML={
          typeof children === "string" ? { __html: children } : undefined
        }
      >
        {typeof children !== "string" ? children : undefined}
      </div>
    </div>
  );
}

// ── KPI row ──
export function KpiRow({
  label,
  value,
  color = "text-v-cream",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-v-line last:border-0">
      <span className="text-[13px] font-body text-v-muted">{label}</span>
      <span className={`text-[13px] font-body font-medium ${color}`}>{value}</span>
    </div>
  );
}

// ── Card ──
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 ${className}`}
    >
      {children}
    </div>
  );
}

// ── Hero number ──
export function HeroNumber({
  value,
  color,
}: {
  value: string;
  color: string;
}) {
  return (
    <div
      className={`font-display text-[44px] leading-none tracking-[-0.5px] mt-1 ${color}`}
    >
      {value}
    </div>
  );
}

// ── Note/tip box ──
export function NoteBox({
  children,
  variant = "green",
}: {
  children: React.ReactNode;
  variant?: "green" | "amber" | "red" | "neutral";
}) {
  const colors = {
    green: "bg-v-green-dim text-[#cfe6cf]",
    amber: "bg-v-amber-dim text-[#e8d5a0]",
    red: "bg-v-red-dim text-[#f0c0b0]",
    neutral: "bg-v-panel2 text-v-cream",
  };
  return (
    <div
      className={`rounded-xl p-[14px_16px] text-[13px] leading-relaxed font-body mt-3 ${colors[variant]}`}
    >
      {children}
    </div>
  );
}

// ── Chip ──
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[12px] font-body border transition-colors duration-150 cursor-pointer ${
        active
          ? "bg-v-gold text-v-bg font-semibold border-v-gold"
          : "bg-transparent text-v-muted border-v-line hover:border-v-gold hover:text-v-gold"
      }`}
    >
      {label}
    </button>
  );
}

// ── Text input ──
export function TextInput({
  placeholder,
  value,
  onChange,
  onKeyDown,
  type = "text",
  id,
  autoFocus,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  type?: string;
  id?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      className="w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none transition-colors duration-150 mt-1.5"
    />
  );
}

// ── Suggest chip ──
export function SuggestChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-v-panel2 border border-v-line rounded-full px-3 py-1.5 text-xs text-v-muted font-body hover:border-v-gold hover:text-v-gold transition-colors duration-150 cursor-pointer"
    >
      {label}
    </button>
  );
}

// ── Progress pips ──
export function Pips({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex gap-1 mt-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-[3px] rounded-full transition-colors duration-150 ${
            i < active ? "bg-v-gold" : "bg-v-line"
          }`}
        />
      ))}
    </div>
  );
}
