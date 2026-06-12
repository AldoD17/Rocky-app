"use client";
import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Bubble, Chip, TextInput, Pips, Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";
import { CCNL_MULTIPLIERS } from "@/lib/types";
import { FORMATS, CONTRACT_OPTIONS } from "@/lib/constants";

function parseFixedCostEntry(text: string): { amount: number; frequency: string } {
  const cleaned = text.replace(",", ".");
  const match = cleaned.match(/[\d.]+/);
  const amount = match ? parseFloat(match[0]) : 0;
  let frequency = "mensile";
  if (/bimestrale/i.test(text)) frequency = "bimestrale";
  else if (/trimestrale/i.test(text)) frequency = "trimestrale";
  else if (/semestrale/i.test(text)) frequency = "semestrale";
  else if (/annuale|anno/i.test(text)) frequency = "annuale";
  return { amount: isNaN(amount) ? 0 : amount, frequency };
}

interface EmployeeForm {
  name: string;
  role: string;
  contract_type: "full_time" | "part_time" | "apprendista" | "a_chiamata";
  hourly_rate_gross: string;
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { restaurant, refreshRestaurant } = useAuth();
  const t = useTranslations("Onboarding");
  const tC = useTranslations("Common");
  const tS = useTranslations("Settings");
  const CONTRACT_LABELS: Record<string, string> = {
    full_time:   tS("contractFullTime"),
    part_time:   tS("contractPartTime"),
    apprendista: tS("contractApprendista"),
    a_chiamata:  tS("contractAChiamata"),
  };

  const FIXED_COST_FIELDS = [
    { key: "affitto",                 label: t("fcAffitto")        },
    { key: "utenze",                  label: t("fcUtenze")         },
    { key: "assicurazioni_siae_tari", label: t("fcAssicurazioni")  },
    { key: "commercialista",          label: t("fcCommercialista") },
    { key: "leasing_finanziamenti",   label: t("fcLeasing")        },
    { key: "altro",                   label: t("fcAltro")          },
  ];

  const TOUR_TABS = [
    { icon: "ti-calendar-event",   name: t("tourTabDayName"),   desc: t("tourTabTodayDesc") },
    { icon: "ti-chart-bar",        name: t("tourTabWeekName"),  desc: t("tourTabWeekDesc")  },
    { icon: "ti-report-analytics", name: t("tourTabMonthName"), desc: t("tourTabMonthDesc") },
    { icon: "ti-trending-up",      name: t("tourTabYearName"),  desc: t("tourTabYearDesc")  },
    { icon: "ti-school",           name: t("tourTabLearnName"), desc: t("tourTabLearnDesc") },
  ];

  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState("");
  const [localeName, setLocaleName] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null);

  const [fixedInputs, setFixedInputs] = useState<Record<string, string>>({});

  const [employees, setEmployees] = useState<EmployeeForm[]>([]);
  const [newEmployee, setNewEmployee] = useState<EmployeeForm>({
    name: "", role: "", contract_type: "full_time", hourly_rate_gross: "",
  });
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const firstName = userName.split(" ")[0];

  const saveAndNext = async (nextStep: number) => {
    if (!restaurant) { setStep(nextStep); return; }
    try {
      const body: Record<string, string | number> = {
        id: restaurant.id,
        onboarding_step: nextStep,
      };
      if (userName) body.full_name = userName;
      if (localeName) body.name = localeName;
      const formatValue = selectedFormat !== null ? FORMATS[selectedFormat].value : null;
      if (formatValue) body.type = formatValue;
      await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await refreshRestaurant();
    } catch (e) { console.error("Errore onboarding:", e); }
    setStep(nextStep);
  };

  const saveFixedCosts = async () => {
    if (!restaurant) return;
    const entries = Object.entries(fixedInputs).filter(([, v]) => v.trim());
    for (const [category, text] of entries) {
      const { amount, frequency } = parseFixedCostEntry(text);
      await fetch("/api/fixed-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          category,
          label: text.trim(),
          amount,
          frequency,
        }),
      });
    }
  };

  const saveEmployees = async () => {
    if (!restaurant) return;
    for (const emp of employees) {
      if (!emp.name.trim()) continue;
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          name: emp.name.trim(),
          role: emp.role || null,
          contract_type: emp.contract_type,
          hourly_rate_gross: emp.hourly_rate_gross || null,
        }),
      });
    }
  };

  const addEmployee = () => {
    if (!newEmployee.name.trim()) return;
    setEmployees((prev) => [...prev, { ...newEmployee }]);
    setNewEmployee({ name: "", role: "", contract_type: "full_time", hourly_rate_gross: "" });
    setShowAddEmployee(false);
  };

  const filledCount = Object.values(fixedInputs).filter((v) => v.trim()).length;

  const header = (label: string, stepNum: number, total = 4, showSkip?: () => void) => (
    <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-body font-medium tracking-[0.3px] uppercase text-v-gold">
          {label}
        </span>
        {showSkip && (
          <button onClick={showSkip} className="text-[11px] font-body text-v-muted underline cursor-pointer">
            {t("skipBtn")}
          </button>
        )}
      </div>
      <Pips total={total} active={stepNum} />
    </div>
  );

  // ── Step 0: Welcome ──────────────────────────────────────
  if (step === 0) return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex items-center gap-2.5">
          <Mascot size={28} />
          <div>
            <div className="font-display text-v-cream text-[16px]">{t("welcomeTitle")}</div>
            <div className="text-v-muted text-[11px] font-body mt-0.5">{t("welcomeSubtitle")}</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">
          {t.rich("welcomeBot1", { strong: (chunks) => <strong>{chunks}</strong> })}
        </Bubble>
        <Bubble from="bot">
          {t.rich("welcomeBot2", { strong: (chunks) => <strong>{chunks}</strong> })}
        </Bubble>
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 text-center mt-2 animate-rise">
          <div className="flex justify-center mb-3"><Mascot size={64} /></div>
          <div className="font-display text-v-cream text-xl leading-tight">{t("welcomeSlogan")}</div>
          <div className="text-v-muted text-[12px] font-body mt-2 leading-relaxed">{t("welcomeDesc")}</div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0 flex flex-col gap-2">
        <Button onClick={() => setStep(1)}>{t("startSetup")}</Button>
        <Button variant="ghost" onClick={onComplete}>{t("goToApp")}</Button>
      </div>
    </div>
  );

  // ── Step 1: Chi sei ──────────────────────────────────────
  if (step === 1) return (
    <div className="flex flex-col h-full">
      {header(t("step1Header"), 1)}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">{t("step1AskName")}</Bubble>
        <TextInput placeholder={t("step1NamePlaceholder")} value={userName} onChange={setUserName} autoFocus />
        <div className="mt-4"><Bubble from="bot">{t("step1AskRestaurant")}</Bubble></div>
        <TextInput placeholder={t("step1RestaurantPlaceholder")} value={localeName} onChange={setLocaleName}
          onKeyDown={(e) => e.key === "Enter" && saveAndNext(2)} />
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0">
        <Button onClick={() => saveAndNext(2)}>{tC("continue")}</Button>
      </div>
    </div>
  );

  // ── Step 2: Format ───────────────────────────────────────
  if (step === 2) return (
    <div className="flex flex-col h-full">
      {header(t("step2Header"), 2, 4, () => setStep(3))}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">
          {localeName
            ? t("step2AskFormatWith", { name: localeName })
            : t("step2AskFormatWithout")}
        </Bubble>
        <div className="flex gap-2 flex-wrap mt-3 max-h-48 overflow-y-auto pr-1">
          {FORMATS.map((f, i) => (
            <Chip key={f.value} label={f.label} active={selectedFormat === i}
              onClick={() => setSelectedFormat(i)} />
          ))}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0 flex flex-col gap-2">
        <Button onClick={() => saveAndNext(3)}>{tC("continue")}</Button>
        <Button variant="ghost" onClick={() => setStep(1)}>{tC("back")}</Button>
      </div>
    </div>
  );

  // ── Step 3: Tour ─────────────────────────────────────────
  if (step === 3) return (
    <div className="flex flex-col h-full">
      {header(t("step3Header"), 3)}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">{t("step3Bot")}</Bubble>
        <div className="mt-2 flex flex-col gap-2">
          {TOUR_TABS.map((tab) => (
            <div key={tab.name} className="flex items-center gap-3 bg-v-panel2 border border-v-line rounded-xl p-4">
              <div className="w-9 h-9 rounded-xl bg-v-panel flex items-center justify-center shrink-0">
                <i className={`ti ${tab.icon}`} style={{ fontSize: 18, color: "#c9a86a" }} />
              </div>
              <div>
                <div className="text-sm font-semibold font-body text-v-cream">{tab.name}</div>
                <div className="text-[12px] font-body text-v-muted mt-0.5">{tab.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0">
        <Button onClick={() => saveAndNext(4)}>{t("step3Cta")}</Button>
      </div>
    </div>
  );

  // ── Step 4: Pronti ───────────────────────────────────────
  if (step === 4) return (
    <div className="flex flex-col h-full">
      {header(t("step4Header"), 4)}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">
          {firstName && localeName
            ? t("step4BotWithNameAndVenue", { name: firstName, venue: localeName })
            : firstName
              ? t("step4BotWithName", { name: firstName })
              : localeName
                ? t("step4BotWithVenue", { venue: localeName })
                : t("step4BotBase")}
        </Bubble>
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mt-2 animate-rise flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-v-green-dim flex items-center justify-center">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="#6abf7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-body font-semibold text-v-cream">{t("step4SetupDone")}</span>
          </div>
          <Button onClick={async () => { await saveAndNext(5); setStep(5); }}>
            {t("step4AddCosts")}
          </Button>
          <Button variant="ghost" onClick={async () => { await saveAndNext(5); onComplete(); }}>
            {t("step4GoApp")}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Step 5: Costi fissi ──────────────────────────────────
  if (step === 5) return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-body font-medium tracking-[0.3px] uppercase text-v-gold">{t("step5Header")}</span>
          <button onClick={() => setStep(6)} className="text-[11px] font-body text-v-muted underline cursor-pointer">
            {tC("skipAll")}
          </button>
        </div>
        <div className="mt-2 h-[3px] bg-v-line rounded-full overflow-hidden">
          <div
            className="h-full bg-v-gold rounded-full transition-all duration-300"
            style={{ width: `${(filledCount / FIXED_COST_FIELDS.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">{t("step5Bot")}</Bubble>
        <div className="mt-3 flex flex-col gap-3">
          {FIXED_COST_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[11px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block mb-1">
                {f.label}
              </label>
              <input
                type="text"
                placeholder={t("step5Placeholder")}
                value={fixedInputs[f.key] || ""}
                onChange={(e) => setFixedInputs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none transition-colors duration-150"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0">
        <Button onClick={async () => { await saveFixedCosts(); setStep(6); }}>{tC("continue")}</Button>
      </div>
    </div>
  );

  // ── Step 6: Personale ────────────────────────────────────
  if (step === 6) return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-body font-medium tracking-[0.3px] uppercase text-v-gold">{t("step6Header")}</span>
          <button onClick={() => setStep(7)} className="text-[11px] font-body text-v-muted underline cursor-pointer">
            {tC("skip")}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">{t("step6Bot")}</Bubble>

        {employees.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {employees.map((emp, i) => {
              const mult = CCNL_MULTIPLIERS[emp.contract_type] || 1.55;
              const rate = parseFloat(emp.hourly_rate_gross);
              const realCost = !isNaN(rate) && rate > 0 ? (rate * mult).toFixed(2) : null;
              return (
                <div key={i} className="bg-v-panel2 border border-v-line rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-body font-semibold text-v-cream truncate">{emp.name}</div>
                    <div className="text-[11px] font-body text-v-muted">
                      {emp.role || "—"} · {CONTRACT_LABELS[emp.contract_type] ?? emp.contract_type}
                      {realCost
                        ? ` · ${t("step6HourlyReal", { cost: realCost })}`
                        : ` · ${t("step6HourlyEstimate")}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setEmployees((prev) => prev.filter((_, j) => j !== i))}
                    className="text-v-muted hover:text-v-red transition-colors cursor-pointer text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {employees.some((e) => e.hourly_rate_gross) && (
              <div className="bg-v-panel2 border border-v-line rounded-xl p-3">
                <div className="text-[11px] font-body text-v-muted uppercase tracking-[0.3px] mb-1">{t("step6TeamHourlyCost")}</div>
                <div className="text-v-gold font-display text-[18px]">
                  €{employees.reduce((sum, emp) => {
                    const mult = CCNL_MULTIPLIERS[emp.contract_type] || 1.55;
                    const rate = parseFloat(emp.hourly_rate_gross);
                    return sum + (!isNaN(rate) && rate > 0 ? rate * mult : 0);
                  }, 0).toFixed(2)}/h
                </div>
              </div>
            )}
          </div>
        )}

        {showAddEmployee ? (
          <div className="mt-3 bg-v-panel2 border border-v-line rounded-xl p-4 flex flex-col gap-3">
            <input
              autoFocus
              placeholder={t("step6NamePlaceholder")}
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((p) => ({ ...p, name: e.target.value }))}
              className="w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none"
            />
            <input
              placeholder={t("step6RolePlaceholder")}
              value={newEmployee.role}
              onChange={(e) => setNewEmployee((p) => ({ ...p, role: e.target.value }))}
              className="w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none"
            />
            <div className="flex gap-2 flex-wrap">
              {CONTRACT_OPTIONS.map((c) => (
                <Chip key={c.value} label={CONTRACT_LABELS[c.value] ?? c.label}
                  active={newEmployee.contract_type === c.value}
                  onClick={() => setNewEmployee((p) => ({ ...p, contract_type: c.value as EmployeeForm["contract_type"] }))}
                />
              ))}
            </div>
            <div>
              <input
                type="number"
                placeholder={t("step6HourlyRatePlaceholder")}
                value={newEmployee.hourly_rate_gross}
                onChange={(e) => setNewEmployee((p) => ({ ...p, hourly_rate_gross: e.target.value }))}
                className="w-full min-h-[48px] bg-v-bg border border-v-line rounded-xl px-4 py-3 text-v-cream text-sm font-body placeholder:text-v-muted focus:border-v-gold focus:outline-none"
              />
              {newEmployee.hourly_rate_gross && parseFloat(newEmployee.hourly_rate_gross) > 0 ? (
                <div className="text-[11px] font-body text-v-gold mt-1">
                  {t("step6RealCostLabel", { cost: (parseFloat(newEmployee.hourly_rate_gross) * (CCNL_MULTIPLIERS[newEmployee.contract_type] || 1.55)).toFixed(2) })}
                </div>
              ) : (
                <div className="text-[11px] font-body text-v-muted mt-1">
                  {t("step6IndustryAvg")}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={addEmployee}>{tC("add")}</Button>
              <Button variant="ghost" onClick={() => setShowAddEmployee(false)}>{tC("cancel")}</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddEmployee(true)}
            className="mt-3 w-full min-h-[48px] border border-dashed border-v-line rounded-xl text-v-muted text-sm font-body hover:border-v-gold hover:text-v-gold transition-colors cursor-pointer"
          >
            {t("step6AddEmployee")}
          </button>
        )}
      </div>
      <div className="px-4 py-3 border-t border-v-line bg-v-panel shrink-0">
        <Button onClick={async () => { await saveEmployees(); setStep(7); }}>{tC("continue")}</Button>
      </div>
    </div>
  );

  // ── Step 7: Riepilogo finale ─────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex items-center gap-2.5">
          <Mascot size={28} />
          <div className="font-display text-v-cream text-[16px]">{t("step7Title")}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Bubble from="bot">
          {firstName
            ? t("step7BotWith", { name: firstName })
            : t("step7BotWithout")}
        </Bubble>
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mt-2 animate-rise">
          <div className="flex flex-col gap-2 mb-4">
            {[
              { ok: true, label: t("step7VenueOk") },
              { ok: Object.values(fixedInputs).some((v) => v.trim()), label: t("step7FixedCosts", { count: Object.values(fixedInputs).filter((v) => v.trim()).length }) },
              { ok: employees.length > 0, label: t("step7Staff", { count: employees.length }) },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.ok ? "bg-v-green-dim" : "bg-v-line"}`}>
                  {item.ok ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#6abf7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="text-v-muted text-[10px]">–</span>
                  )}
                </div>
                <span className={`text-sm font-body ${item.ok ? "text-v-cream" : "text-v-muted"}`}>{item.label}</span>
              </div>
            ))}
          </div>
          <Button onClick={onComplete}>{t("step4GoApp")}</Button>
        </div>
      </div>
    </div>
  );
}
