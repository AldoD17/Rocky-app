"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthProvider";
import { Semaforo, KpiRow, Mascot } from "@/components/ui";
import { fmt, normalizeToMonthly } from "@/lib/utils";
import { useTranslations } from "next-intl";

// MONTHS is now locale-aware, defined inside the component

function barColor(rev: number, cogs: number, laborEst: number): string {
  if (!rev) return "#2e2820";
  const primeCost = ((cogs + laborEst) / rev) * 100;
  if (primeCost < 60) return "#6abf7b";
  if (primeCost <= 70) return "#d4a24e";
  return "#cf6b5e";
}

export function YearSummary() {
  const { restaurant } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Year");
  const MONTHS = t("months").split(",");
  const year = new Date().getFullYear();

  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>(Array(12).fill(0));
  const [monthlyCogs, setMonthlyCogs] = useState<number[]>(Array(12).fill(0));
  const [monthlyLabor, setMonthlyLabor] = useState<number[]>(Array(12).fill(0));
  const [fixedCostsMonthly, setFixedCostsMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant?.id) return;

    (async () => {
      setLoading(true);

      const { data: shifts } = await supabase
        .from("shifts")
        .select("shift_date, revenue, supplier_spend, workers_count, service_hours")
        .eq("restaurant_id", restaurant.id)
        .gte("shift_date", `${year}-01-01`)
        .lte("shift_date", `${year}-12-31`);

      const rev = Array(12).fill(0);
      const cogs = Array(12).fill(0);
      const labor = Array(12).fill(0);

      if (shifts) {
        for (const s of shifts) {
          const m = new Date(s.shift_date).getMonth();
          rev[m] += s.revenue ?? 0;
          cogs[m] += s.supplier_spend ?? 0;
          labor[m] += (s.workers_count ?? 0) * (s.service_hours ?? 0) * 20 * 1.55;
        }
      }

      setMonthlyRevenue(rev);
      setMonthlyCogs(cogs);
      setMonthlyLabor(labor);

      const { data: fc } = await supabase
        .from("fixed_costs")
        .select("amount, frequency")
        .eq("restaurant_id", restaurant.id)
        .eq("active", true);

      if (fc) {
        const total = fc.reduce((s, r) => s + normalizeToMonthly(r.amount ?? 0, r.frequency), 0);
        setFixedCostsMonthly(total);
      }

      setLoading(false);
    })();
  }, [restaurant?.id, year, supabase]);

  if (loading) return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 flex items-center justify-center gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-v-gold border-t-transparent animate-spin" />
      <span className="text-v-muted text-xs font-body">{t("loading")}</span>
    </div>
  );

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);

  if (totalRevenue === 0) return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 flex flex-col items-center gap-2 text-center">
      <Mascot size={48} />
      <div className="font-display text-v-cream text-[18px]">{t("noData", { year })}</div>
      <div className="text-v-muted text-[13px] font-body max-w-[260px]">{t("noDataDesc")}</div>
    </div>
  );

  const totalCogs = monthlyCogs.reduce((a, b) => a + b, 0);
  const totalLabor = monthlyLabor.reduce((a, b) => a + b, 0);
  const totalFixedYear = fixedCostsMonthly * 12;
  const netMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs - totalLabor - totalFixedYear) / totalRevenue) * 100 : 0;

  let semaforoState: "green" | "yellow" | "red" = "red";
  if (netMargin > 10) semaforoState = "green";
  else if (netMargin >= 5) semaforoState = "yellow";

  const maxRev = Math.max(...monthlyRevenue, 1);
  const BAR_H = 48;

  return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-3 animate-rise">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-body font-medium text-v-muted uppercase tracking-[0.3px]">{year}</span>
        <Semaforo state={semaforoState} label={`Margine ${netMargin >= 0 ? "+" : ""}${netMargin.toFixed(1)}%`} />
      </div>

      <div className="flex justify-between items-end gap-0.5 mt-3 mb-1" style={{ height: BAR_H + 16 }}>
        {MONTHS.map((label, i) => {
          const h = monthlyRevenue[i] > 0 ? Math.max(4, Math.round((monthlyRevenue[i] / maxRev) * BAR_H)) : 3;
          const color = barColor(monthlyRevenue[i], monthlyCogs[i], monthlyLabor[i]);
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 justify-end">
              <div className="w-full rounded-sm" style={{ height: h, backgroundColor: color }} />
              <span className="text-[8px] font-body text-v-muted">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <KpiRow label={t("annualRevenue")} value={fmt(totalRevenue)} />
        <KpiRow label={t("totalFoodCost")} value={fmt(totalCogs)} />
        <KpiRow label={t("laborEstimate")} value={fmt(totalLabor)} />
        {totalFixedYear > 0 && <KpiRow label={t("annualFixed")} value={fmt(totalFixedYear)} />}
        <KpiRow
          label={t("netMargin")}
          value={`${netMargin >= 0 ? "+" : ""}${netMargin.toFixed(1)}%`}
          color={netMargin > 10 ? "text-v-green" : netMargin >= 5 ? "text-v-amber" : "text-v-red"}
        />
      </div>
    </div>
  );
}
