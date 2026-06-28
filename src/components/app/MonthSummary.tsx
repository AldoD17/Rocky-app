"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthProvider";
import { Semaforo, HeroNumber, KpiRow, Mascot } from "@/components/ui";
import { fmt, normalizeToMonthly, getMonthRange } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

export function MonthSummary() {
  const { restaurant } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Month");
  const locale = useLocale();

  const [revenue, setRevenue] = useState(0);
  const [cogsAlim, setCogsAlim] = useState(0);
  const [cogsBev, setCogsBev] = useState(0);
  const [cogsCons, setCogsCons] = useState(0);
  const [cogsAltro, setCogsAltro] = useState(0);
  const [cogsFromShifts, setCogsFromShifts] = useState(0);
  const [fixedTotal, setFixedTotal] = useState(0);
  const [laborEstimate, setLaborEstimate] = useState(0);
  const [hasPurchases, setHasPurchases] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant?.id) return;
    const { start, end } = getMonthRange();

    (async () => {
      setLoading(true);

      const [shiftsRes, purchasesRes, fcRes] = await Promise.all([
        supabase.from("shifts")
          .select("revenue, supplier_spend, workers_count, service_hours")
          .eq("restaurant_id", restaurant.id)
          .gte("shift_date", start).lte("shift_date", end),
        supabase.from("purchases")
          .select("amount, category")
          .eq("restaurant_id", restaurant.id)
          .is("shift_id", null)
          .gte("purchase_date", start).lte("purchase_date", end),
        supabase.from("fixed_costs")
          .select("amount, frequency")
          .eq("restaurant_id", restaurant.id).eq("active", true),
      ]);

      if (shiftsRes.data) {
        const rev = shiftsRes.data.reduce((s, r) => s + (r.revenue ?? 0), 0);
        const mh = shiftsRes.data.reduce((s, r) => s + (r.workers_count ?? 0) * (r.service_hours ?? 0), 0);
        const shiftsCogs = shiftsRes.data.reduce((s, r) => s + (r.supplier_spend ?? 0), 0);
        setRevenue(rev);
        setLaborEstimate(mh * 20 * 1.55);
        setCogsFromShifts(shiftsCogs);
      }

      if (purchasesRes.data && purchasesRes.data.length > 0) {
        setHasPurchases(true);
        const bycat = purchasesRes.data.reduce((acc, p) => {
          acc[p.category] = (acc[p.category] ?? 0) + (p.amount ?? 0);
          return acc;
        }, {} as Record<string, number>);
        setCogsAlim(bycat.alimenti ?? 0);
        setCogsBev(bycat.bevande ?? 0);
        setCogsCons(bycat.consumabili ?? 0);
        setCogsAltro(bycat.altro ?? 0);
      } else {
        setHasPurchases(false);
      }

      if (fcRes.data) {
        const total = fcRes.data.reduce((s, r) => s + normalizeToMonthly(r.amount ?? 0, r.frequency), 0);
        setFixedTotal(total);
      }

      setLoading(false);
    })();
  }, [restaurant?.id, supabase]);

  if (loading) return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 flex items-center justify-center gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-v-gold border-t-transparent animate-spin" />
      <span className="text-v-muted text-xs font-body">{t("loading")}</span>
    </div>
  );

  if (revenue === 0) return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 flex flex-col items-center gap-2 text-center">
      <Mascot size={48} />
      <div className="font-display text-v-cream text-[18px]">{t("noShifts")}</div>
      <div className="text-v-muted text-[13px] font-body max-w-[260px]">{t("noShiftsDesc")}</div>
    </div>
  );

  const manualCogs = cogsAlim + cogsBev + cogsCons + cogsAltro;
  const totalCogs = cogsFromShifts + (hasPurchases ? manualCogs : 0);
  const ebitda = revenue - totalCogs - laborEstimate - fixedTotal;
  const ebitdaPct = revenue > 0 ? (ebitda / revenue) * 100 : 0;

  let semaforoState: "green" | "yellow" | "red" = "red";
  if (ebitda > 0) semaforoState = "green";
  else if (ebitdaPct >= -5) semaforoState = "yellow";

  const workingDays = (restaurant?.open_days_per_week ?? 6) * 4.33;
  const dailyFixed = (fixedTotal + laborEstimate) / workingDays;
  const breakEvenDaily = totalCogs > 0 && revenue > 0
    ? dailyFixed / (1 - totalCogs / revenue)
    : null;

  return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 animate-rise">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-body font-medium text-v-muted uppercase tracking-[0.3px]">
          {new Date().toLocaleString(locale, { month: "long", year: "numeric" })}
        </span>
        <Semaforo state={semaforoState} label={`EBITDA ${ebitdaPct >= 0 ? "+" : ""}${ebitdaPct.toFixed(1)}%`} />
      </div>

      <HeroNumber value={fmt(revenue)} color="text-v-cream" />

      <div className="mt-4">
        {hasPurchases ? (
          <>
            {cogsAlim > 0 && <KpiRow label={t("foodCost")} value={fmt(cogsAlim)}
              color={revenue > 0 && cogsAlim / revenue > 0.35 ? "text-v-red" : "text-v-green"} />}
            {cogsBev > 0 && <KpiRow label={t("drinks")} value={fmt(cogsBev)} />}
            {cogsCons > 0 && <KpiRow label={t("consumables")} value={fmt(cogsCons)} />}
            {cogsAltro > 0 && <KpiRow label={t("otherPurchases")} value={fmt(cogsAltro)} />}
          </>
        ) : (
          <KpiRow label={t("cogsFromShifts")} value={fmt(totalCogs)}
            color={revenue > 0 && totalCogs / revenue > 0.4 ? "text-v-red" : "text-v-cream"} />
        )}
        <KpiRow label={t("laborEstimate")} value={fmt(laborEstimate)} />
        {fixedTotal > 0 && <KpiRow label={t("fixedCosts")} value={fmt(fixedTotal)} />}
        <KpiRow
          label={t("ebitda")}
          value={`${ebitda >= 0 ? "+" : ""}${fmt(ebitda)}`}
          color={ebitda > 0 ? "text-v-green" : ebitdaPct >= -5 ? "text-v-amber" : "text-v-red"}
        />
        {breakEvenDaily !== null && (
          <KpiRow label={t("breakEven")} value={fmt(breakEvenDaily)} color="text-v-gold" />
        )}
      </div>

      {(!hasPurchases || fixedTotal === 0) && (
        <div className="mt-3 text-[11px] font-body text-v-muted bg-v-panel rounded-lg p-2">
          {!hasPurchases && t("hintPurchases")}
          {fixedTotal === 0 && t("hintFixedCosts")}
        </div>
      )}
    </div>
  );
}
