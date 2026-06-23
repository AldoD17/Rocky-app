"use client";
import React, { useState, useRef } from "react";
import { Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";

interface LandingPageProps {
  onStart: () => void;
}

function DecorativeBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      style={{ pointerEvents: "none" }}
    >
      <circle cx="370" cy="-40" r="230" stroke="#c9a86a" strokeWidth="1" opacity="0.10" />
      <circle cx="370" cy="-40" r="170" stroke="#c9a86a" strokeWidth="0.8" opacity="0.07" />
      <circle cx="370" cy="-40" r="110" stroke="#c9a86a" strokeWidth="0.6" opacity="0.05" />
      <circle cx="340" cy="80" r="200" fill="#c9a86a" opacity="0.025" />
      <circle cx="-30" cy="680" r="180" fill="#c9a86a" opacity="0.02" />
      <circle cx="-50" cy="750" r="210" stroke="#c9a86a" strokeWidth="1.2" opacity="0.09" />
      <circle cx="-50" cy="750" r="150" stroke="#c9a86a" strokeWidth="0.8" opacity="0.06" />
      <circle cx="70" cy="180" r="45" stroke="#c9a86a" strokeWidth="0.8" opacity="0.07" />
      <circle cx="330" cy="420" r="55" stroke="#c9a86a" strokeWidth="0.8" opacity="0.05" />
      <path d="M 390 260 A 130 130 0 0 0 270 180" stroke="#c9a86a" strokeWidth="1" opacity="0.10" />
      <path d="M 390 340 A 180 180 0 0 0 230 200" stroke="#c9a86a" strokeWidth="0.6" opacity="0.06" />
    </svg>
  );
}

function PanelHero({ onStart }: { onStart: () => void }) {
  const t = useTranslations("Landing");
  return (
    <div className="relative h-full flex flex-col items-center justify-center px-6 w-1/3 shrink-0">
      <DecorativeBackground />
      <div className="relative z-10 flex flex-col items-center text-center gap-6 w-full">
        <div className="flex flex-col items-center gap-3">
          <Mascot size={64} />
          <div className="font-display text-v-cream text-[38px] leading-none font-bold">Rocky</div>
          <div className="text-sm italic text-v-muted font-body">{t("tagline")}</div>
          <div className="text-v-muted text-sm font-body leading-[1.55] max-w-[260px]">
            {t("hero")}
          </div>
        </div>
        <div className="w-full">
          <button
            onClick={onStart}
            className="w-full min-h-[48px] bg-v-gold text-v-bg rounded-full font-body font-semibold text-[15px] cursor-pointer hover:bg-v-gold-hover transition-colors active:scale-[0.98]"
          >
            {t("cta")}
          </button>
          <p className="text-v-muted text-[12px] font-body mt-3">
            {t("trial")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PromiseBlock({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="w-11 h-11 rounded-full bg-v-panel2 border border-v-line flex items-center justify-center shrink-0">
        <i className={`ti ${icon} text-v-gold`} style={{ fontSize: 22 }} />
      </div>
      <div className="font-display text-v-cream text-base leading-snug">{title}</div>
      <div className="text-v-muted text-sm font-body leading-[1.55] max-w-[240px]">{desc}</div>
    </div>
  );
}

function PanelPromises() {
  const t = useTranslations("Landing");
  return (
    <div className="relative h-full flex flex-col items-center justify-center px-7 w-1/3 shrink-0 gap-7">
      <PromiseBlock
        icon="ti-hourglass"
        title={t("promise1Title")}
        desc={t("promise1Desc")}
      />
      <PromiseBlock
        icon="ti-brain"
        title={t("promise2Title")}
        desc={t("promise2Desc")}
      />
      <PromiseBlock
        icon="ti-sparkles"
        title={t("promise3Title")}
        desc={t("promise3Desc")}
      />
      <div className="w-full border-t border-v-line pt-4 text-center text-v-gold text-xs font-body leading-[1.5]">
        {t("promisesFooter")}
      </div>
    </div>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <span className="text-v-gold mt-0.5 shrink-0">
        <i className="ti ti-check" style={{ fontSize: 13 }} />
      </span>
      <span className="text-v-muted text-xs font-body leading-[1.5]">{text}</span>
    </div>
  );
}

function PanelPricing({ onStart }: { onStart: () => void }) {
  const t = useTranslations("Pricing");
  return (
    <div className="relative h-full flex flex-col items-center justify-center px-5 w-1/3 shrink-0">
      <div className="w-full max-w-sm">
        <h2 className="font-display text-v-cream text-2xl leading-tight text-center mb-5">
          {t("title")}
        </h2>

        <div className="flex gap-3 w-full">
          {/* Piano Base */}
          <div className="flex-1 bg-v-panel2 border border-v-line rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <div className="font-display text-v-cream text-base">{t("baseName")}</div>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="font-display text-v-cream text-[24px] leading-none">{t("basePrice")}</span>
                <span className="text-v-muted text-xs font-body">{t("perMonth")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <PlanFeature text={t("feature1Base")} />
              <PlanFeature text={t("feature2Base")} />
              <PlanFeature text={t("featureAll")} />
            </div>
            <button
              onClick={onStart}
              className="w-full min-h-[40px] bg-transparent border border-v-line text-v-cream rounded-full font-body font-semibold text-sm cursor-pointer hover:border-v-gold hover:text-v-gold transition-colors"
            >
              {t("cta")}
            </button>
          </div>

          {/* Piano Pro */}
          <div className="flex-1 bg-v-panel2 border-2 border-v-gold rounded-2xl p-4 flex flex-col gap-3 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-v-gold text-v-bg text-xs font-body font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
              {t("recommended")}
            </span>
            <div>
              <div className="font-display text-v-gold text-base">{t("proName")}</div>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="font-display text-v-cream text-[24px] leading-none">{t("proPrice")}</span>
                <span className="text-v-muted text-xs font-body">{t("perMonth")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <PlanFeature text={t("feature1Pro")} />
              <PlanFeature text={t("featureAll")} />
              <PlanFeature text={t("feature2Pro")} />
            </div>
            <button
              onClick={onStart}
              className="w-full min-h-[40px] bg-v-gold text-v-bg rounded-full font-body font-semibold text-sm cursor-pointer hover:bg-v-gold-hover transition-colors active:scale-[0.98]"
            >
              {t("cta")}
            </button>
          </div>
        </div>

        <p className="text-center text-v-muted text-xs font-body mt-4 leading-[1.5]">
          {t("trialNote")}
        </p>
      </div>
    </div>
  );
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dy > Math.abs(dx) * 1.2) return;
    if (dx < -50 && current < 2) setCurrent((c) => c + 1);
    else if (dx > 50 && current > 0) setCurrent((c) => c - 1);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-v-bg">
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ width: "300%", transform: `translateX(calc(-${current} * 33.333%))` }}
        >
          <PanelHero onStart={onStart} />
          <PanelPromises />
          <PanelPricing onStart={onStart} />
        </div>
      </div>

      {/* Pagination dots — 3 panels */}
      <div className="flex justify-center items-center gap-2 pb-10 pt-4 shrink-0">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300 cursor-pointer"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              backgroundColor: i === current ? "#c9a86a" : "#2e2820",
            }}
          />
        ))}
      </div>
    </div>
  );
}
