"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthProvider";
import { fmt } from "@/lib/utils";
import { useTranslations } from "next-intl";

// DAY_LABELS is now locale-aware, defined inside the component

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Without € prefix — used for the compact bar label above each column
function fmtBar(r: number): string {
  if (r >= 1000) return (r / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(r));
}

interface ShiftDay {
  revenue: number;
  supplier_spend: number | null;
  workers_count: number;
  service_hours: number;
}

interface PurchaseSummary {
  alimenti: number;
  bevande: number;
  consumabili: number;
  altro: number;
  total: number;
}

function barColor(shift: ShiftDay): string {
  if (!shift.revenue) return "#2e2820";
  const foodPct = shift.supplier_spend && shift.revenue > 0
    ? (shift.supplier_spend / shift.revenue) * 100 : null;
  const laborPct = shift.workers_count && shift.service_hours && shift.revenue > 0
    ? (shift.workers_count * shift.service_hours * 20 / shift.revenue) * 100 : 30;
  const prime = (foodPct ?? 30) + laborPct;
  if (prime < 60) return "#6abf7b";
  if (prime <= 70) return "#d4a24e";
  return "#cf6b5e";
}

function KpiLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-v-line last:border-0">
      <span className="text-[11px] font-body text-v-muted">{label}</span>
      <span className={`text-[11px] font-body font-medium ${color ?? "text-v-cream"}`}>{value}</span>
    </div>
  );
}

export function WeekCalendar() {
  const { restaurant } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Week");
  const DAY_LABELS = t("dayLabels").split(",");
  const days = useMemo(getWeekDays, []);
  const todayIso = useMemo(() => localIso(new Date()), []);
  const [shiftsByDay, setShiftsByDay] = useState<Record<string, ShiftDay>>({});
  const [purchases, setPurchases] = useState<PurchaseSummary>({ alimenti: 0, bevande: 0, consumabili: 0, altro: 0, total: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalMh, setTotalMh] = useState(0);

  useEffect(() => {
    if (!restaurant?.id) return;
    const monday = localIso(days[0]);
    const sunday = localIso(days[6]);

    (async () => {
      const { data } = await supabase
        .from("shifts")
        .select("shift_date, revenue, supplier_spend, workers_count, service_hours")
        .eq("restaurant_id", restaurant.id)
        .gte("shift_date", monday)
        .lte("shift_date", sunday);

      if (data) {
        const agg: Record<string, ShiftDay> = {};
        let rev = 0, mh = 0;
        for (const row of data) {
          if (!row.revenue) continue;
          rev += row.revenue;
          mh += (row.workers_count ?? 0) * (row.service_hours ?? 0);
          const prev = agg[row.shift_date];
          agg[row.shift_date] = {
            revenue: (prev?.revenue ?? 0) + row.revenue,
            supplier_spend: (prev?.supplier_spend ?? 0) + (row.supplier_spend ?? 0),
            workers_count: Math.max(prev?.workers_count ?? 0, row.workers_count ?? 0),
            service_hours: Math.max(prev?.service_hours ?? 0, row.service_hours ?? 0),
          };
        }
        setShiftsByDay(agg);
        setTotalRevenue(rev);
        setTotalMh(mh);
      }

      const { data: pData } = await supabase
        .from("purchases")
        .select("amount, category")
        .eq("restaurant_id", restaurant.id)
        .gte("purchase_date", monday)
        .lte("purchase_date", sunday);

      if (pData) {
        const ps: PurchaseSummary = { alimenti: 0, bevande: 0, consumabili: 0, altro: 0, total: 0 };
        for (const p of pData) {
          const cat = p.category as keyof PurchaseSummary;
          if (cat in ps) ps[cat] += p.amount ?? 0;
          ps.total += p.amount ?? 0;
        }
        setPurchases(ps);
      }
    })();
  }, [restaurant?.id, days, supabase]);

  const maxRevenue = Math.max(...Object.values(shiftsByDay).map((s) => s.revenue), 1);
  const BAR_MAX_H = 56;
  const hasData = totalRevenue > 0;
  const estLabor = totalMh * 20 * 1.55;
  const primeCost = totalRevenue > 0
    ? ((purchases.total + estLabor) / totalRevenue * 100)
    : null;

  return (
    <div className="bg-v-panel2 border border-v-line rounded-2xl px-4 py-3 mb-3 animate-rise">
      {/* Barre */}
      <div className="flex justify-between items-end gap-1 mb-2">
        {days.map((day, i) => {
          const iso = localIso(day);
          const shift = shiftsByDay[iso];
          const isToday = iso === todayIso;
          const color = shift ? barColor(shift) : "#2e2820";
          const heightPx = shift ? Math.max(8, Math.round((shift.revenue / maxRevenue) * BAR_MAX_H)) : 8;
          return (
            <div key={iso} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] font-body font-semibold leading-none"
                style={{ color: shift ? color : "transparent", minHeight: 12 }}>
                {shift ? fmtBar(shift.revenue) : ""}
              </div>
              <div className="w-full rounded-sm" style={{
                height: heightPx, backgroundColor: color, minHeight: 8,
                outline: isToday ? "2px solid #c9a86a" : "none", outlineOffset: "1px",
              }} />
              <span className={`text-[10px] font-body leading-none mt-0.5 ${isToday ? "text-v-gold" : "text-v-muted"}`}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* KPI settimana */}
      {hasData && (
        <div className="border-t border-v-line pt-2 mt-1">
          <KpiLine label={t("weeklyRevenue")} value={fmt(totalRevenue)} color="text-v-cream" />
          {purchases.total > 0 && (
            <>
              <KpiLine label={t("foodPurchases")} value={fmt(purchases.alimenti)} />
              {purchases.bevande > 0 && <KpiLine label={t("drinkPurchases")} value={fmt(purchases.bevande)} />}
              {purchases.consumabili > 0 && <KpiLine label={t("consumables")} value={fmt(purchases.consumabili)} />}
              {purchases.altro > 0 && <KpiLine label={t("other")} value={fmt(purchases.altro)} />}
            </>
          )}
          <KpiLine label={t("laborEstimate")} value={fmt(estLabor)} />
          {primeCost !== null && (
            <KpiLine
              label={t("primeCost")}
              value={`${primeCost.toFixed(0)}%`}
              color={primeCost < 60 ? "text-v-green" : primeCost <= 70 ? "text-v-amber" : "text-v-red"}
            />
          )}
        </div>
      )}
    </div>
  );
}
