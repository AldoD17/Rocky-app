"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthProvider";
import { fmt, fmtDelta, normalizeToMonthly, getMonthRange } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

function LineChart({ data, insufficientLabel }: { data: { day: number; value: number }[]; insufficientLabel: string }) {
  if (data.length < 2) {
    return (
      <div className="h-20 flex items-center justify-center">
        <span className="text-v-muted text-xs font-body">{insufficientLabel}</span>
      </div>
    );
  }

  const W = 320;
  const H = 80;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const maxDay = Math.max(...data.map((d) => d.day));

  const pts = data.map((d) => ({
    x: ((d.day - 1) / Math.max(maxDay - 1, 1)) * (W - 16) + 8,
    y: H - 8 - (d.value / maxV) * (H - 20),
  }));

  let pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const cpx = ((p.x + c.x) / 2).toFixed(1);
    pathD += ` C ${cpx} ${p.y.toFixed(1)} ${cpx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }

  const fillD =
    pathD +
    ` L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;

  const last = pts[pts.length - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a86a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#c9a86a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#dashFill)" />
      <path d={pathD} fill="none" stroke="#c9a86a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3.5" fill="#c9a86a" />
      <circle cx={last.x} cy={last.y} r="7" fill="none" stroke="#c9a86a" strokeWidth="1" strokeOpacity="0.35" />
    </svg>
  );
}

export function Dashboard() {
  const { restaurant, user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);

  const [currRevenue, setCurrRevenue] = useState(0);
  const [prevRevenue, setPrevRevenue] = useState(0);
  const [currExpenses, setCurrExpenses] = useState(0);
  const [prevExpenses, setPrevExpenses] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: number; value: number }[]>([]);
  const [scontrinoMedio, setScontrinoMedio] = useState(0);
  const [foodCostPct, setFoodCostPct] = useState(0);
  const [manHoursProd, setManHoursProd] = useState(0);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "chef";

  const monthName = new Date().toLocaleString(locale, { month: "long" });

  useEffect(() => {
    if (!restaurant?.id) return;
    const curr = getMonthRange(0);
    const prev = getMonthRange(-1);

    (async () => {
      setLoading(true);

      const [currShiftsRes, prevShiftsRes, currPurchasesRes, prevPurchasesRes, fcRes] =
        await Promise.all([
          supabase.from("shifts")
            .select("shift_date, revenue, workers_count, service_hours, receipts, supplier_spend")
            .eq("restaurant_id", restaurant.id)
            .gte("shift_date", curr.start).lte("shift_date", curr.end),
          supabase.from("shifts")
            .select("revenue, workers_count, service_hours, supplier_spend")
            .eq("restaurant_id", restaurant.id)
            .gte("shift_date", prev.start).lte("shift_date", prev.end),
          supabase.from("purchases")
            .select("amount")
            .eq("restaurant_id", restaurant.id)
            .gte("purchase_date", curr.start).lte("purchase_date", curr.end)
            .is("shift_id", null),
          supabase.from("purchases")
            .select("amount")
            .eq("restaurant_id", restaurant.id)
            .gte("purchase_date", prev.start).lte("purchase_date", prev.end)
            .is("shift_id", null),
          supabase.from("fixed_costs")
            .select("amount, frequency")
            .eq("restaurant_id", restaurant.id).eq("active", true),
        ]);

      const cShifts = currShiftsRes.data || [];
      const cRev = cShifts.reduce((s, r) => s + (r.revenue ?? 0), 0);
      const cMh = cShifts.reduce((s, r) => s + (r.workers_count ?? 0) * (r.service_hours ?? 0), 0);
      const cCogs = cShifts.reduce((s, r) => s + (r.supplier_spend ?? 0), 0);
      const cReceipts = cShifts.reduce((s, r) => s + (r.receipts ?? 0), 0);
      setCurrRevenue(cRev);

      const byDay: Record<number, number> = {};
      for (const r of cShifts) {
        if (!r.revenue) continue;
        const day = parseInt(r.shift_date.split("-")[2]);
        byDay[day] = (byDay[day] ?? 0) + r.revenue;
      }
      setDailyData(
        Object.entries(byDay)
          .map(([d, v]) => ({ day: parseInt(d), value: v }))
          .sort((a, b) => a.day - b.day)
      );

      const pShifts = prevShiftsRes.data || [];
      const pRev = pShifts.reduce((s, r) => s + (r.revenue ?? 0), 0);
      const pMh = pShifts.reduce((s, r) => s + (r.workers_count ?? 0) * (r.service_hours ?? 0), 0);
      const pCogs = pShifts.reduce((s, r) => s + (r.supplier_spend ?? 0), 0);
      setPrevRevenue(pRev);

      const fixedMonthly = (fcRes.data || []).reduce(
        (s, r) => s + normalizeToMonthly(r.amount ?? 0, r.frequency),
        0
      );

      const cPurchases = (currPurchasesRes.data || []).reduce((s, r) => s + (r.amount ?? 0), 0);
      setCurrExpenses(cCogs + cPurchases + cMh * 20 * 1.55 + fixedMonthly);

      const pPurchases = (prevPurchasesRes.data || []).reduce((s, r) => s + (r.amount ?? 0), 0);
      setPrevExpenses(pCogs + pPurchases + pMh * 20 * 1.55 + fixedMonthly);

      setScontrinoMedio(cReceipts > 0 ? cRev / cReceipts : 0);
      setFoodCostPct(cRev > 0 ? ((cCogs + cPurchases) / cRev) * 100 : 0);
      setManHoursProd(cMh > 0 ? cRev / cMh : 0);

      setLoading(false);
    })();
  }, [restaurant?.id, supabase]);

  const revDelta = currRevenue - prevRevenue;
  const expDelta = currExpenses - prevExpenses;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-v-gold border-t-transparent animate-spin" />
          <span className="text-v-muted text-xs font-body">{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 animate-rise">
      {/* Greeting */}
      <div className="mb-5">
        <h2 className="font-display text-v-cream text-[18px]">
          {t("greeting", { name: firstName })}
        </h2>
        <p className="text-v-muted text-[12px] font-body mt-0.5">
          {t("monthSummary", { month: monthName })}
        </p>
      </div>

      {/* Hero number + delta */}
      <div className="flex items-end gap-3 mb-1">
        <div className="font-display text-v-cream text-[32px] leading-none tracking-tight">
          {fmt(currRevenue)}
        </div>
        {prevRevenue > 0 && (
          <div className={`text-[13px] font-body font-semibold mb-0.5 ${revDelta >= 0 ? "text-v-green" : "text-v-red"}`}>
            {fmtDelta(revDelta)}
          </div>
        )}
      </div>
      <div className="text-v-muted text-[11px] font-body mb-4 uppercase tracking-[0.4px]">
        {t("revenueLabel", { month: monthName })}
      </div>

      {/* Line chart */}
      <div className="bg-v-panel2 border border-v-line rounded-2xl px-4 pt-3 pb-4 mb-4">
        <div className="text-[11px] font-body text-v-muted uppercase tracking-[0.3px] mb-3">
          {t("dailyTrend")}
        </div>
        <LineChart data={dailyData} insufficientLabel={t("insufficientData")} />
      </div>

      {/* Cards ENTRATE / USCITE */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-body text-v-muted uppercase tracking-[0.4px]">{t("income")}</span>
            {prevRevenue > 0 && (
              <span className={`text-[13px] ${revDelta >= 0 ? "text-v-green" : "text-v-red"}`}>
                {revDelta >= 0 ? "↑" : "↓"}
              </span>
            )}
          </div>
          <div className="font-display text-v-cream text-[18px] leading-none mb-1">{fmt(currRevenue)}</div>
          {prevRevenue > 0 && (
            <div className="text-[11px] font-body text-v-muted mt-2">vs {fmt(prevRevenue)}</div>
          )}
        </div>

        <div className="bg-v-panel2 border border-v-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-body text-v-muted uppercase tracking-[0.4px]">{t("expenses")}</span>
            {prevExpenses > 0 && (
              <span className={`text-[13px] ${expDelta <= 0 ? "text-v-green" : "text-v-red"}`}>
                {expDelta > 0 ? "↑" : "↓"}
              </span>
            )}
          </div>
          <div className="font-display text-v-cream text-[18px] leading-none mb-1">{fmt(currExpenses)}</div>
          {prevExpenses > 0 && (
            <div className="text-[11px] font-body text-v-muted mt-2">vs {fmt(prevExpenses)}</div>
          )}
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-3">
          <div className="text-[10px] font-body text-v-muted uppercase tracking-[0.4px] mb-2">Scontrino medio</div>
          <div className="font-display text-v-cream text-[14px] leading-none">{fmt(scontrinoMedio)}</div>
        </div>
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-3">
          <div className="text-[10px] font-body text-v-muted uppercase tracking-[0.4px] mb-2">Food cost %</div>
          <div className={`font-display text-[14px] leading-none ${foodCostPct < 35 ? "text-v-green" : foodCostPct > 40 ? "text-v-red" : "text-v-amber"}`}>
            {foodCostPct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-v-panel2 border border-v-line rounded-2xl p-3">
          <div className="text-[10px] font-body text-v-muted uppercase tracking-[0.4px] mb-2">Produttività</div>
          <div className="font-display text-v-cream text-[14px] leading-none">{fmt(manHoursProd)}/h</div>
        </div>
      </div>

      {currRevenue === 0 && (
        <div className="mt-6 text-center text-v-muted text-[13px] font-body leading-relaxed">
          {t("noShifts")}{" "}
          <span className="text-v-gold">{t("noShiftsCta")}</span>
        </div>
      )}
    </div>
  );
}
