"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, TextInput } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";
import { CCNL_MULTIPLIERS } from "@/lib/types";
import type { FixedCost, Employee } from "@/lib/types";
import { FORMATS, FIXED_COST_CATEGORIES, FREQUENCY_OPTIONS } from "@/lib/constants";

type View = "main" | "plan";
type DeleteState = "idle" | "confirming" | "requested";

// ── Shared select style ──────────────────────────────────
const SELECT =
  "w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 pr-10 text-v-cream text-sm font-body focus:border-v-gold focus:outline-none transition-colors duration-150 mt-1.5 appearance-none";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-body font-medium text-v-muted uppercase tracking-[0.3px] mb-1">
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        {children}
      </select>
      <i
        className="ti ti-chevron-down text-v-muted pointer-events-none absolute right-4 top-1/2"
        style={{ fontSize: 14, transform: "translateY(-30%)" }}
      />
    </div>
  );
}

function Subsection({ title }: { title: string }) {
  return (
    <div className="border-t border-v-line pt-4">
      <div className="text-[11px] font-body font-semibold text-v-muted uppercase tracking-[0.3px] mb-3">
        {title}
      </div>
    </div>
  );
}

function AccordionSection({
  title, isOpen, onToggle, children,
}: {
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-v-line rounded-2xl overflow-hidden mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-[15px] bg-v-panel2 cursor-pointer"
      >
        <span className="text-[14px] font-body font-semibold text-v-cream">{title}</span>
        <i
          className="ti ti-chevron-down text-v-muted"
          style={{
            fontSize: 16,
            transition: "transform 0.22s ease-in-out",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div style={{ maxHeight: isOpen ? "1400px" : "0", overflow: "hidden", transition: "max-height 0.25s ease-in-out" }}>
        <div className="px-4 pt-3 pb-5 bg-v-panel2 border-t border-v-line flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Feature list item ────────────────────────────────────
function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-7" stroke="#c9a86a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-[13px] font-body text-v-muted leading-snug">{text}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user, restaurant, userPlan, stripeCustomerId, refreshRestaurant, refreshUserPlan, signOut } = useAuth();
  const t = useTranslations("Settings");
  const tOnb = useTranslations("Onboarding");
  const tP = useTranslations("Pricing");
  const tApp = useTranslations("App");
  const tC = useTranslations("Common");
  const currentLocale = useLocale();

  const [view, setView] = useState<View>("main");
  const [open, setOpen] = useState<string>("plan");
  const toggle = (id: string) => setOpen((p) => (p === id ? "" : id));

  // Profile
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Venue
  const [localeName, setLocaleName] = useState(restaurant?.name || "");
  const [selectedFormat, setSelectedFormat] = useState<string>(restaurant?.type || "");
  const [savingVenue, setSavingVenue] = useState(false);
  const [venueSaved, setVenueSaved] = useState(false);

  // Fixed costs
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [showAddFC, setShowAddFC] = useState(false);
  const [newFC, setNewFC] = useState({ category: "affitto", amount: "", frequency: "mensile", customLabel: "" });

  // Staff
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "", contract_type: "full_time", hourly_rate_gross: "" });

  // Plan view — Stripe
  const [checkoutLoading, setCheckoutLoading] = useState<"base" | "pro" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const startCheckout = async (plan: "base" | "pro") => {
    setCheckoutLoading(plan);
    setStripeError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setStripeError(json.error ?? tC("error"));
        setCheckoutLoading(null);
      }
    } catch {
      setStripeError(tC("connectionError"));
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setStripeError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setStripeError(json.error ?? tC("error"));
        setPortalLoading(false);
      }
    } catch {
      setStripeError(tC("connectionError"));
      setPortalLoading(false);
    }
  };

  // Delete account
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");

  const restaurantId = restaurant?.id;

  const fetchFixedCosts = useCallback(async () => {
    if (!restaurantId) return;
    const res = await fetch(`/api/fixed-costs?restaurant_id=${restaurantId}`);
    const json = await res.json();
    if (json.data) setFixedCosts(json.data);
  }, [restaurantId]);

  const fetchEmployees = useCallback(async () => {
    if (!restaurantId) return;
    const res = await fetch(`/api/employees?restaurant_id=${restaurantId}`);
    const json = await res.json();
    if (json.data) setEmployees(json.data);
  }, [restaurantId]);

  useEffect(() => {
    fetchFixedCosts();
    fetchEmployees();
  }, [fetchFixedCosts, fetchEmployees]);

  // ── Translation lookup maps ──────────────────────────
  const FREQ_LABELS: Record<string, string> = {
    mensile: t("freqMensile"), bimestrale: t("freqBimestrale"),
    trimestrale: t("freqTrimestrale"), semestrale: t("freqSemestrale"), annuale: t("freqAnnuale"),
  };
  const CAT_LABELS: Record<string, string> = {
    affitto: tOnb("fcAffitto"), utenze: tOnb("fcUtenze"),
    assicurazioni_siae_tari: tOnb("fcAssicurazioni"), commercialista: tOnb("fcCommercialista"),
    leasing_finanziamenti: tOnb("fcLeasing"), altro: tOnb("fcAltro"),
  };
  const CONTRACT_LABELS: Record<string, string> = {
    full_time: t("contractFullTime"), part_time: t("contractPartTime"),
    apprendista: t("contractApprendista"), a_chiamata: t("contractAChiamata"),
  };
  const LOCALES_UI = [
    { value: "it", label: "Italiano" }, { value: "en", label: "English" },
    { value: "es", label: "Español" }, { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" }, { value: "nl", label: "Nederlands" },
    { value: "pt", label: "Português" },
  ];
  const USAGE_TABS = [
    { label: tApp("tabDay"), limit: 5, used: 0 }, { label: tApp("tabWeek"), limit: 5, used: 0 },
    { label: tApp("tabMonth"), limit: 5, used: 0 }, { label: tApp("tabLearn"), limit: 5, used: 0 },
    { label: tApp("tabYear"), limit: 3, used: 0 },
  ];

  // ── Save handlers ────────────────────────────────────
  const saveProfile = async () => {
    if (!restaurantId) return;
    setSavingProfile(true);
    await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurantId, full_name: fullName }),
    });
    await refreshRestaurant();
    if (selectedLocale !== currentLocale) {
      document.cookie = `NEXT_LOCALE=${selectedLocale};path=/;max-age=31536000`;
      window.location.reload();
      return;
    }
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveVenue = async () => {
    if (!restaurantId) return;
    setSavingVenue(true);
    await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurantId, name: localeName, type: selectedFormat || null }),
    });
    await refreshRestaurant();
    setSavingVenue(false);
    setVenueSaved(true);
    setTimeout(() => setVenueSaved(false), 2000);
  };

  const deleteFixedCost = async (id: string) => {
    if (!restaurantId) return;
    await fetch(`/api/fixed-costs?id=${id}&restaurant_id=${restaurantId}`, { method: "DELETE" });
    setFixedCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const addFixedCost = async () => {
    if (!restaurantId || !newFC.amount) return;
    const res = await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        category: newFC.category,
        label: newFC.category === "altro" ? (newFC.customLabel.trim() || null) : null,
        amount: parseFloat(newFC.amount) || 0,
        frequency: newFC.frequency,
      }),
    });
    const json = await res.json();
    if (json.data) setFixedCosts((prev) => [...prev, json.data]);
    setNewFC({ category: "affitto", amount: "", frequency: "mensile", customLabel: "" });
    setShowAddFC(false);
  };

  const deleteEmployee = async (id: string) => {
    if (!restaurantId) return;
    await fetch(`/api/employees?id=${id}&restaurant_id=${restaurantId}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const addEmployee = async () => {
    if (!restaurantId || !newEmp.name.trim()) return;
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        name: newEmp.name.trim(),
        role: newEmp.role || null,
        contract_type: newEmp.contract_type,
        hourly_rate_gross: parseFloat(newEmp.hourly_rate_gross) || null,
      }),
    });
    const json = await res.json();
    if (json.data) setEmployees((prev) => [...prev, json.data]);
    setNewEmp({ name: "", role: "", contract_type: "full_time", hourly_rate_gross: "" });
    setShowAddEmp(false);
  };

  // ── Plan view ────────────────────────────────────────
  if (view === "plan") {
    const isBase = userPlan === "base";
    const isPro = userPlan === "pro";

    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("main"); setStripeError(null); refreshUserPlan(); }}
              className="text-v-muted cursor-pointer hover:text-v-gold transition-colors"
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 20 }} />
            </button>
            <div className="font-display text-v-cream text-[16px]">{tP("title")}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
          {stripeError && (
            <div className="bg-v-red-dim border border-v-red/40 rounded-xl px-4 py-3">
              <span className="text-[13px] font-body text-v-red">{stripeError}</span>
            </div>
          )}

          {/* Trial note */}
          <p className="text-[12px] font-body text-v-muted text-center">{tP("trialNote")}</p>

          {/* Base plan */}
          <div className={`bg-v-panel2 border rounded-2xl p-5 flex flex-col gap-4 ${isBase ? "border-v-gold/40" : "border-v-line"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-v-cream text-[20px]">{tP("baseName")}</div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="font-display text-v-gold text-[26px]">{tP("basePrice")}</span>
                  <span className="text-v-muted text-sm font-body">{tP("perMonth")}</span>
                </div>
              </div>
              {isBase && (
                <span className="bg-v-gold/20 text-v-gold text-[11px] font-body font-semibold px-2.5 py-1 rounded-full">
                  {tP("currentPlanBtn")}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Feature text={tP("feature1Base")} />
              <Feature text={tP("feature2Base")} />
              <Feature text={tP("featureAll")} />
            </div>
            {isBase ? (
              <button
                disabled
                className="w-full min-h-[44px] rounded-xl bg-v-gold/20 text-v-gold text-sm font-body font-semibold opacity-60 cursor-not-allowed"
              >
                {tP("currentPlanBtn")}
              </button>
            ) : (
              <button
                onClick={() => startCheckout("base")}
                disabled={checkoutLoading !== null || portalLoading}
                className="w-full min-h-[44px] rounded-xl bg-v-gold text-v-bg text-sm font-body font-semibold cursor-pointer hover:bg-v-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === "base" ? tC("loading") : tP("chooseBase")}
              </button>
            )}
          </div>

          {/* Pro plan */}
          <div className={`bg-v-panel2 border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ${isPro ? "border-v-gold/40" : "border-v-line"}`}>
            {!isPro && (
              <div className="absolute top-3.5 right-3.5">
                <span className="bg-v-gold text-v-bg text-[10px] font-body font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {tP("recommended")}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-v-cream text-[20px]">{tP("proName")}</div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="font-display text-v-gold text-[26px]">{tP("proPrice")}</span>
                  <span className="text-v-muted text-sm font-body">{tP("perMonth")}</span>
                </div>
              </div>
              {isPro && (
                <span className="bg-v-gold/20 text-v-gold text-[11px] font-body font-semibold px-2.5 py-1 rounded-full">
                  {tP("currentPlanBtn")}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Feature text={tP("feature1Pro")} />
              <Feature text={tP("feature2Pro")} />
              <Feature text={tP("featureAll")} />
            </div>
            {isPro ? (
              <button
                disabled
                className="w-full min-h-[44px] rounded-xl bg-v-gold/20 text-v-gold text-sm font-body font-semibold opacity-60 cursor-not-allowed"
              >
                {tP("currentPlanBtn")}
              </button>
            ) : (
              <button
                onClick={() => startCheckout("pro")}
                disabled={checkoutLoading !== null || portalLoading}
                className="w-full min-h-[44px] rounded-xl bg-v-gold text-v-bg text-sm font-body font-semibold cursor-pointer hover:bg-v-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === "pro" ? tC("loading") : tP("upgradeToPro")}
              </button>
            )}
          </div>

          {/* Billing portal */}
          {stripeCustomerId && (
            <button
              onClick={openPortal}
              disabled={portalLoading || checkoutLoading !== null}
              className="w-full text-center text-[13px] font-body text-v-muted underline decoration-v-line cursor-pointer hover:text-v-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {portalLoading ? tC("loading") : tP("manageSub")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main settings view ───────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-v-muted cursor-pointer hover:text-v-gold transition-colors">
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} />
          </button>
          <div className="font-display text-v-cream text-[16px]">{t("title")}</div>
          <div className="w-7" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Plan ── */}
        <AccordionSection title={t("sectionPlan")} isOpen={open === "plan"} onToggle={() => toggle("plan")}>
          <div className="flex items-start justify-between gap-3 bg-v-bg border border-v-gold/30 rounded-xl p-4">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-body font-semibold text-v-gold">
                {userPlan === "pro" ? t("planPro") : userPlan === "base" ? t("planBase") : t("planFree")}
              </div>
              <div className="text-[12px] font-body text-v-muted mt-0.5">
                {userPlan === "pro" ? t("planProDesc") : userPlan === "base" ? t("planBaseDesc") : t("planFreeDesc")}
              </div>
            </div>
            <button
              onClick={() => setView("plan")}
              className="text-v-gold text-[12px] font-body font-semibold shrink-0 cursor-pointer hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              {t("planChangeCta")}
            </button>
          </div>
          {stripeCustomerId && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-[12px] font-body text-v-muted underline decoration-v-line cursor-pointer hover:text-v-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {portalLoading ? tC("loading") : t("manageSubCta")}
            </button>
          )}

          <div className="flex flex-col gap-3">
            {USAGE_TABS.map((tab) => (
              <div key={tab.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[12px] font-body text-v-muted">{tab.label}</span>
                  <span className="text-[11px] font-body text-v-muted tabular-nums">{tab.used}/{tab.limit}</span>
                </div>
                <div className="h-[3px] bg-v-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-v-gold rounded-full transition-all duration-300"
                    style={{ width: `${tab.limit > 0 ? (tab.used / tab.limit) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* ── Profile ── */}
        <AccordionSection title={t("sectionProfile")} isOpen={open === "profile"} onToggle={() => toggle("profile")}>
          <div>
            <Label>{t("nameLabel")}</Label>
            <TextInput placeholder={t("namePlaceholder")} value={fullName} onChange={setFullName} />
          </div>
          <div>
            <Label>{t("emailLabel")}</Label>
            <div className="min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-muted text-sm font-body flex items-center mt-1.5">
              {user?.email}
            </div>
          </div>
          <div>
            <Label>{t("langLabel")}</Label>
            <Select value={selectedLocale} onChange={setSelectedLocale}>
              {LOCALES_UI.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? tC("saving") : profileSaved ? tC("saved") : tC("saveChanges")}
          </Button>
        </AccordionSection>

        {/* ── Venue ── */}
        <AccordionSection title={t("sectionVenue")} isOpen={open === "venue"} onToggle={() => toggle("venue")}>
          <div>
            <Label>{t("venueName")}</Label>
            <TextInput placeholder={t("venuePlaceholder")} value={localeName} onChange={setLocaleName} />
          </div>
          <div>
            <Label>{t("formatLabel")}</Label>
            <Select value={selectedFormat} onChange={setSelectedFormat}>
              <option value="">{t("formatPlaceholder")}</option>
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
          <Button onClick={saveVenue} disabled={savingVenue}>
            {savingVenue ? tC("saving") : venueSaved ? tC("saved") : tC("save")}
          </Button>

          {/* Fixed costs */}
          <Subsection title={t("sectionFixedCosts")} />
          {fixedCosts.length === 0 ? (
            <p className="text-[13px] font-body text-v-muted -mt-2">{t("noFixedCostsCta")}</p>
          ) : (
            <div className="-mt-2">
              {fixedCosts.map((fc) => (
                <div key={fc.id} className="flex items-center gap-3 py-2.5 border-b border-v-line last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-body text-v-cream">
                      {CAT_LABELS[fc.category] ?? fc.category}
                      {fc.category === "altro" && fc.label ? ` — ${fc.label}` : ""}
                    </span>
                    <span className="text-[12px] font-body text-v-muted ml-2">
                      €{fc.amount} · {FREQ_LABELS[fc.frequency] ?? fc.frequency}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteFixedCost(fc.id)}
                    className="text-v-muted hover:text-v-red transition-colors cursor-pointer text-[18px] leading-none shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddFC ? (
            <div className="p-3 bg-v-bg rounded-xl border border-v-line flex flex-col gap-3 -mt-1">
              <div>
                <Label>{t("categoryLabel")}</Label>
                <Select
                  value={newFC.category}
                  onChange={(v) => setNewFC((p) => ({ ...p, category: v, customLabel: "" }))}
                >
                  {FIXED_COST_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{CAT_LABELS[c.value] ?? c.value}</option>
                  ))}
                </Select>
              </div>
              {newFC.category === "altro" && (
                <div>
                  <Label>{t("fcOtherDescLabel")}</Label>
                  <TextInput
                    placeholder={t("fcOtherDescPlaceholder")}
                    value={newFC.customLabel}
                    onChange={(v) => setNewFC((p) => ({ ...p, customLabel: v }))}
                    autoFocus
                  />
                </div>
              )}
              <div>
                <Label>{t("amountLabel")}</Label>
                <TextInput
                  type="number"
                  placeholder="€"
                  value={newFC.amount}
                  onChange={(v) => setNewFC((p) => ({ ...p, amount: v }))}
                />
              </div>
              <div>
                <Label>{t("frequencyLabel")}</Label>
                <Select value={newFC.frequency} onChange={(v) => setNewFC((p) => ({ ...p, frequency: v }))}>
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <option key={freq} value={freq}>{FREQ_LABELS[freq] ?? freq}</option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={addFixedCost}>{tC("add")}</Button>
                <Button variant="ghost" onClick={() => setShowAddFC(false)}>{tC("cancel")}</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFC(true)}
              className="w-full min-h-[44px] border border-dashed border-v-line rounded-xl text-v-muted text-sm font-body hover:border-v-gold hover:text-v-gold transition-colors cursor-pointer -mt-1"
            >
              {t("addFixedCost")}
            </button>
          )}

          {/* Staff */}
          <Subsection title={t("sectionStaff")} />
          {employees.length === 0 ? (
            <p className="text-[13px] font-body text-v-muted -mt-2">{t("noStaffCta")}</p>
          ) : (
            <div className="-mt-2">
              {employees.map((emp) => {
                const mult = CCNL_MULTIPLIERS[emp.contract_type ?? "part_time"] ?? 1.55;
                const realCost = emp.hourly_rate_gross ? (emp.hourly_rate_gross * mult).toFixed(2) : null;
                return (
                  <div key={emp.id} className="flex items-start gap-3 py-2.5 border-b border-v-line last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-body font-semibold text-v-cream">{emp.name}</div>
                      <div className="text-[11px] font-body text-v-muted mt-0.5">
                        {emp.role ?? "—"} · {CONTRACT_LABELS[emp.contract_type ?? ""] ?? emp.contract_type}
                        {realCost ? ` · €${realCost}/h` : ` · ${t("industryEstimate")}`}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      className="text-v-muted hover:text-v-red transition-colors cursor-pointer text-[18px] leading-none shrink-0 mt-0.5"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {showAddEmp ? (
            <div className="p-3 bg-v-bg rounded-xl border border-v-line flex flex-col gap-3 -mt-1">
              <TextInput autoFocus placeholder={t("fullNamePlaceholder")} value={newEmp.name}
                onChange={(v) => setNewEmp((p) => ({ ...p, name: v }))} />
              <TextInput placeholder={t("rolePlaceholder")} value={newEmp.role}
                onChange={(v) => setNewEmp((p) => ({ ...p, role: v }))} />
              <div>
                <Label>{t("contractLabel")}</Label>
                <Select value={newEmp.contract_type} onChange={(v) => setNewEmp((p) => ({ ...p, contract_type: v }))}>
                  <option value="full_time">{t("contractFullTime")}</option>
                  <option value="part_time">{t("contractPartTime")}</option>
                  <option value="apprendista">{t("contractApprendista")}</option>
                  <option value="a_chiamata">{t("contractAChiamata")}</option>
                </Select>
              </div>
              <TextInput type="number" placeholder={t("hourlyRatePlaceholder")} value={newEmp.hourly_rate_gross}
                onChange={(v) => setNewEmp((p) => ({ ...p, hourly_rate_gross: v }))} />
              <div className="flex gap-2">
                <Button onClick={addEmployee}>{tC("add")}</Button>
                <Button variant="ghost" onClick={() => setShowAddEmp(false)}>{tC("cancel")}</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddEmp(true)}
              className="w-full min-h-[44px] border border-dashed border-v-line rounded-xl text-v-muted text-sm font-body hover:border-v-gold hover:text-v-gold transition-colors cursor-pointer -mt-1"
            >
              {t("addEmployee")}
            </button>
          )}
        </AccordionSection>

        {/* ── Account ── */}
        <AccordionSection title={t("sectionAccount")} isOpen={open === "account"} onToggle={() => toggle("account")}>
          <Button variant="ghost" onClick={signOut}>{t("logout")}</Button>

          {deleteState === "idle" && (
            <div className="text-center">
              <button
                onClick={() => setDeleteState("confirming")}
                className="text-[12px] font-body text-v-muted underline decoration-v-line cursor-pointer hover:text-v-red transition-colors duration-150"
              >
                {t("deleteAccount")}
              </button>
            </div>
          )}

          {deleteState === "confirming" && (
            <div className="bg-v-bg border border-v-red/40 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-[13px] font-body font-semibold text-v-cream">{t("deleteAccount")}</div>
              <p className="text-[12px] font-body text-v-muted leading-relaxed">{t("deleteConfirmText")}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteState("idle")}
                  className="flex-1 min-h-[40px] border border-v-line rounded-xl text-v-muted text-sm font-body cursor-pointer hover:border-v-gold hover:text-v-gold transition-colors"
                >
                  {tC("cancel")}
                </button>
                <button
                  onClick={() => setDeleteState("requested")}
                  className="flex-1 min-h-[40px] bg-v-red-dim border border-v-red rounded-xl text-v-red text-sm font-body font-semibold cursor-pointer"
                >
                  {t("deleteAccount")}
                </button>
              </div>
            </div>
          )}

          {deleteState === "requested" && (
            <div className="bg-v-panel2 border border-v-line rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <i className="ti ti-mail text-v-gold shrink-0 mt-0.5" style={{ fontSize: 16 }} />
                <p className="text-[12px] font-body text-v-muted leading-relaxed">{t("deleteSupportNotice")}</p>
              </div>
              <button
                onClick={() => setDeleteState("idle")}
                className="text-[11px] font-body text-v-muted underline cursor-pointer text-left"
              >
                {tC("cancel")}
              </button>
            </div>
          )}
        </AccordionSection>

        <div className="h-4" />
      </div>
    </div>
  );
}
