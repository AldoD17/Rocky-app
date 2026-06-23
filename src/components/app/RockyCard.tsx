"use client";
import React from "react";

interface KpiItem {
  label: string;
  value: string;
  trend: "up" | "down" | null;
}

interface HeroItem {
  label: string;
  value: string;
  badge: string | null;
}

interface AlertItem {
  type: "missing" | "warning" | "tip";
  text: string;
}

interface RockyCardData {
  semaforo: string;
  titolo: string;
  kpi: KpiItem[];
  hero: HeroItem;
  alerts: AlertItem[];
  narrativa: string;
  cta: string | null;
}

const ALERT_STYLES: Record<string, React.CSSProperties> = {
  missing: { background: "#2a1e1e", border: "0.5px solid #4a2d2d", color: "#e05a5a" },
  warning: { background: "#2a1e00", border: "0.5px solid #4a3d00", color: "#e0a050" },
  tip:     { background: "#1e1e2a", border: "0.5px solid #2d2d4a", color: "#7090e0" },
};

const ALERT_ICONS: Record<string, string> = {
  missing: "ℹ️",
  warning: "⚠️",
  tip: "💡",
};

export function RockyCard({ data }: { data: RockyCardData }) {
  const semaforoEmoji =
    data.semaforo === "green" ? "🟢" : data.semaforo === "red" ? "🔴" : "🟡";

  return (
    <div style={{
      background: "#1a1a1a",
      borderRadius: 16,
      padding: 16,
      border: "0.5px solid #333",
      fontFamily: "inherit",
    }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <span style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#999",
        }}>
          {data.titolo}
        </span>
        <span style={{ fontSize: 18 }}>{semaforoEmoji}</span>
      </div>

      {/* KPI grid — includes hero and alerts as full-width cells */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 12,
      }}>
        {data.kpi.map((kpi, i) => (
          <div key={i} style={{
            background: "#242424",
            borderRadius: 10,
            padding: "10px 12px",
            border: "0.5px solid #2e2e2e",
          }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 3 }}>{kpi.label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#f0ede6" }}>
              {kpi.value}
              {kpi.trend && (
                <span style={{
                  fontSize: 11,
                  marginLeft: 4,
                  color: kpi.trend === "up" ? "#4caf7d" : "#e05a5a",
                }}>
                  {kpi.trend === "up" ? "↑" : "↓"}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Hero cell */}
        <div style={{
          gridColumn: "1 / -1",
          background: "#1e2a1e",
          border: "0.5px solid #2d4a2d",
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#4caf7d", marginBottom: 3, opacity: 0.8 }}>
              {data.hero.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "#4caf7d" }}>
              {data.hero.value}
            </div>
          </div>
          {data.hero.badge && (
            <span style={{
              fontSize: 10,
              background: "#2d4a2d",
              color: "#4caf7d",
              padding: "2px 8px",
              borderRadius: 20,
            }}>
              {data.hero.badge}
            </span>
          )}
        </div>

        {/* Alert cells */}
        {data.alerts.map((alert, i) => (
          <div key={i} style={{
            gridColumn: "1 / -1",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            ...(ALERT_STYLES[alert.type] ?? ALERT_STYLES.tip),
          }}>
            <span>{ALERT_ICONS[alert.type] ?? "💡"}</span>
            <span>{alert.text}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 0.5, background: "#333", margin: "10px 0" }} />

      {/* Narrativa */}
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "#c8c4bc", marginBottom: 12 }}>
        {data.narrativa}
      </div>

      {/* CTA */}
      {data.cta && (
        <div style={{
          fontSize: 13,
          color: "#e0a050",
          borderTop: "0.5px solid #333",
          paddingTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>→</span>
          <span>{data.cta}</span>
        </div>
      )}
    </div>
  );
}
