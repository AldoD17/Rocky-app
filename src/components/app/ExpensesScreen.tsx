"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────
interface Expense {
  id: string;
  restaurant_id: string;
  macro_category: string;
  category: string;
  label: string | null;
  amount: number;
  supplier_name: string | null;
  purchase_date: string;
  is_recurring: boolean;
  frequency: string | null;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────
const MACRO_CATEGORIES = [
  { id: "cogs",     label: "COGS",      icon: "ti-meat",         color: "#4caf7d", bg: "#1e2a1e" },
  { id: "fixed",    label: "Fissi",     icon: "ti-file-invoice", color: "#7090e0", bg: "#1e1e2a" },
  { id: "variable", label: "Variabili", icon: "ti-package",      color: "#e0a050", bg: "#2a1e00" },
  { id: "staff",    label: "Staff",     icon: "ti-users",        color: "#d4a24e", bg: "#2a2000" },
  { id: "utility",  label: "Utenze",    icon: "ti-bolt",         color: "#50c8e0", bg: "#001e2a" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  cogs:     ["Food", "Beverage", "Caffè"],
  variable: ["Commissioni", "Materiali di Consumo", "Noleggi", "Packaging"],
  staff:    ["Staff Operativo", "Staff Amministrativo"],
  utility:  ["Energia Elettrica", "Acqua", "Telefono"],
  fixed:    [
    "Commercialista", "Consulenza", "Marketing", "Software", "Assicurazioni",
    "Spese Bancarie", "Spese Amministrative", "Manutenzione Generica",
    "Manutenzione Impianti", "Attrezzature Cucina", "Attrezzature Sala",
    "Automezzi", "Altre Forniture", "Altre Spese", "Rappresentanza", "Abiti Lavoro",
  ],
};

const FILTER_CHIPS = [
  { id: "all",      label: "Tutti" },
  { id: "cogs",     label: "🥩 COGS" },
  { id: "fixed",    label: "🔧 Fissi" },
  { id: "variable", label: "📦 Variabili" },
  { id: "staff",    label: "👥 Staff" },
  { id: "utility",  label: "💡 Utenze" },
];

// ── Helpers ────────────────────────────────────────────────
function fmtAmount(n: number) {
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonthParam() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const months = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
  const monthStr = months[d.getMonth()];

  if (dateStr === todayStr) return `Oggi · ${day} ${monthStr}`;
  if (dateStr === yesterdayStr) return `Ieri · ${day} ${monthStr}`;
  return `${day} ${monthStr}`;
}

function groupByDate(expenses: Expense[]): { date: string; items: Expense[] }[] {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const d = e.purchase_date ?? e.created_at?.split("T")[0] ?? "—";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function getMacro(id: string) {
  return MACRO_CATEGORIES.find((m) => m.id === id) ?? MACRO_CATEGORIES[0];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Sub-components ─────────────────────────────────────────
function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      background: "#1a1a1a",
      borderRadius: 12,
      padding: "10px 12px",
      border: "0.5px solid #2e2e2e",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#f0ede6", lineHeight: 1.2 }}>{value}</div>
      {sub}
    </div>
  );
}

// ── Add/Edit Form (bottom sheet) ───────────────────────────
interface FormState {
  macro_category: string;
  category: string;
  label: string;
  amount: string;
  supplier_name: string;
  purchase_date: string;
  is_recurring: boolean;
  frequency: string;
}

const DEFAULT_FORM: FormState = {
  macro_category: "cogs",
  category: "Food",
  label: "",
  amount: "",
  supplier_name: "",
  purchase_date: todayStr(),
  is_recurring: false,
  frequency: "mensile",
};

function ExpenseForm({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Partial<FormState>;
  onSave: (f: FormState) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, ...initial });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Reset category when macro changes
  const setMacro = (id: string) => {
    const cats = SUBCATEGORIES[id] ?? [];
    setForm((p) => ({ ...p, macro_category: id, category: cats[0] ?? "" }));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#242424",
    border: "0.5px solid #333",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#f0ede6",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%",
        background: "#111",
        borderRadius: "20px 20px 0 0",
        padding: "0 0 32px 0",
        maxHeight: "90dvh",
        overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#333" }} />
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Title */}
          <div style={{ fontSize: 16, fontWeight: 600, color: "#f0ede6", paddingBottom: 4 }}>
            Aggiungi spesa
          </div>

          {/* Macro category chips */}
          <div>
            <span style={labelStyle}>Categoria</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MACRO_CATEGORIES.map((mc) => {
                const active = form.macro_category === mc.id;
                return (
                  <button
                    key={mc.id}
                    onClick={() => setMacro(mc.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `0.5px solid ${active ? mc.color : "#333"}`,
                      background: active ? mc.bg : "#1a1a1a",
                      color: active ? mc.color : "#999",
                      fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`ti ${mc.icon}`} style={{ fontSize: 15 }} />
                    {mc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-category */}
          <div>
            <span style={labelStyle}>Sotto-categoria</span>
            <div style={{ position: "relative" }}>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                style={{ ...inputStyle, paddingRight: 36, appearance: "none" }}
              >
                {(SUBCATEGORIES[form.macro_category] ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <i className="ti ti-chevron-down" style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, color: "#666", pointerEvents: "none",
              }} />
            </div>
          </div>

          {/* Label */}
          <div>
            <span style={labelStyle}>Descrizione (opzionale)</span>
            <input
              style={inputStyle}
              placeholder="es. Fattura Metro, Bolletta Enel..."
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
            />
          </div>

          {/* Amount */}
          <div>
            <span style={labelStyle}>Importo €</span>
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>

          {/* Supplier */}
          <div>
            <span style={labelStyle}>Fornitore (opzionale)</span>
            <input
              style={inputStyle}
              placeholder="es. Metro, Enel, Amazon..."
              value={form.supplier_name}
              onChange={(e) => set("supplier_name", e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <span style={labelStyle}>Data</span>
            <input
              style={inputStyle}
              type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
            />
          </div>

          {/* Recurring toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#f0ede6" }}>Spesa ricorrente</span>
            <button
              onClick={() => set("is_recurring", !form.is_recurring)}
              style={{
                width: 44, height: 26, borderRadius: 13,
                background: form.is_recurring ? "#c8a96e" : "#333",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: 3, left: form.is_recurring ? 21 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#f0ede6",
                transition: "left 0.2s",
              }} />
            </button>
          </div>

          {/* Frequency (if recurring) */}
          {form.is_recurring && (
            <div>
              <span style={labelStyle}>Frequenza</span>
              <div style={{ position: "relative" }}>
                <select
                  value={form.frequency}
                  onChange={(e) => set("frequency", e.target.value)}
                  style={{ ...inputStyle, paddingRight: 36, appearance: "none" }}
                >
                  <option value="mensile">Mensile</option>
                  <option value="annuale">Annuale</option>
                </select>
                <i className="ti ti-chevron-down" style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, color: "#666", pointerEvents: "none",
                }} />
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={() => onSave(form)}
            disabled={!form.amount || saving}
            style={{
              width: "100%", minHeight: 48,
              background: !form.amount || saving ? "#2a2a2a" : "#c8a96e",
              color: !form.amount || saving ? "#555" : "#111",
              border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              cursor: !form.amount || saving ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {saving ? "Salvataggio..." : "Salva spesa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Expense row with swipe-to-delete ──────────────────────
function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (id: string) => void;
}) {
  const macro = getMacro(expense.macro_category);
  const [revealed, setRevealed] = useState(false);
  const startXRef = useRef<number | null>(null);

  const name = expense.label || expense.category;
  const meta = [expense.macro_category, expense.category, expense.supplier_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderRadius: 0 }}
      onTouchStart={(e) => { startXRef.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (startXRef.current === null) return;
        const dx = startXRef.current - e.changedTouches[0].clientX;
        if (dx > 50) setRevealed(true);
        else if (dx < -20) setRevealed(false);
        startXRef.current = null;
      }}
    >
      {/* Delete button revealed on swipe */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        display: "flex", alignItems: "center",
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed ? "auto" : "none",
        transition: "opacity 0.15s",
      }}>
        <button
          onClick={() => onDelete(expense.id)}
          style={{
            height: "100%", width: 72,
            background: "#e05a5a", border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Elimina
        </button>
      </div>

      {/* Row content */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          borderBottom: "0.5px solid #1e1e1e",
          transform: revealed ? "translateX(-72px)" : "translateX(0)",
          transition: "transform 0.2s ease",
          background: "#111",
          cursor: "pointer",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: macro.bg,
          border: `0.5px solid ${macro.color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <i className={`ti ${macro.icon}`} style={{ fontSize: 16, color: macro.color }} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, color: "#f0ede6", fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {name}
          </div>
          <div style={{
            fontSize: 11, color: "#666", marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {meta}
          </div>
        </div>

        {/* Amount */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: "#e05a5a", flexShrink: 0,
        }}>
          −€{fmtAmount(expense.amount)}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export function ExpensesScreen({
  restaurantId,
  onClose,
}: {
  restaurantId: string;
  onClose: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthRevenue, setMonthRevenue] = useState<number>(0);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const month = currentMonthParam();
    const res = await fetch(`/api/expenses?restaurant_id=${restaurantId}&month=${month}`);
    const json = await res.json();
    if (json.data) setExpenses(json.data);
    setLoading(false);
  }, [restaurantId]);

  const fetchRevenue = useCallback(async () => {
    const { start, end } = currentMonthRange();
    const res = await fetch(
      `/api/shifts-summary?restaurant_id=${restaurantId}&start=${start}&end=${end}`
    );
    if (res.ok) {
      const json = await res.json();
      setMonthRevenue(json.revenue ?? 0);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchExpenses();
    // Revenue via direct Supabase client would require RLS — use shifts API or inline query
    // We fetch it via /api/expenses-summary or fall back to 0
    fetchRevenue();
  }, [fetchExpenses, fetchRevenue]);

  const handleSave = async (form: FormState) => {
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        macro_category: form.macro_category,
        category: form.category,
        label: form.label || null,
        amount: parseFloat(form.amount),
        supplier_name: form.supplier_name || null,
        purchase_date: form.purchase_date,
        is_recurring: form.is_recurring,
        frequency: form.is_recurring ? form.frequency : null,
      }),
    });
    const json = await res.json();
    if (json.data) {
      setExpenses((prev) => [json.data, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/expenses?id=${id}&restaurant_id=${restaurantId}`, { method: "DELETE" });
  };

  // Derived metrics
  const totalMonth = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const cogsTotal = expenses.filter((e) => e.macro_category === "cogs").reduce((s, e) => s + (e.amount ?? 0), 0);
  const foodCostPct = monthRevenue > 0 ? (cogsTotal / monthRevenue) * 100 : null;
  const foodCostColor = foodCostPct === null ? "#999" : foodCostPct < 35 ? "#4caf7d" : foodCostPct < 40 ? "#d4a24e" : "#e05a5a";

  const filtered = activeFilter === "all" ? expenses : expenses.filter((e) => e.macro_category === activeFilter);
  const grouped = groupByDate(filtered);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#111",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "52px 16px 12px",
        borderBottom: "0.5px solid #1e1e1e",
        background: "#111",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", color: "#999", cursor: "pointer",
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 20 }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#f0ede6", fontFamily: "inherit" }}>
          Spese
        </span>
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#c8a96e", borderRadius: 10, border: "none", color: "#111", cursor: "pointer",
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        display: "flex", gap: 8, padding: "12px 16px",
        borderBottom: "0.5px solid #1e1e1e", flexShrink: 0,
      }}>
        <SummaryCard
          label="Questo mese"
          value={`€${fmtAmount(totalMonth)}`}
        />
        <SummaryCard
          label="COGS"
          value={`€${fmtAmount(cogsTotal)}`}
        />
        <SummaryCard
          label="Food cost %"
          value={foodCostPct !== null ? `${foodCostPct.toFixed(1)}%` : "—"}
          sub={
            foodCostPct !== null ? (
              <div style={{ fontSize: 10, color: foodCostColor, marginTop: 2, fontWeight: 600 }}>
                {foodCostPct < 35 ? "✓ OK" : foodCostPct < 40 ? "⚠ Attenzione" : "✗ Alto"}
              </div>
            ) : null
          }
        />
      </div>

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px",
        overflowX: "auto", flexShrink: 0,
        scrollbarWidth: "none",
        borderBottom: "0.5px solid #1e1e1e",
      }}>
        {FILTER_CHIPS.map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: `0.5px solid ${active ? "#c8a96e" : "#333"}`,
                background: active ? "#2a2000" : "transparent",
                color: active ? "#c8a96e" : "#666",
                fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                whiteSpace: "nowrap", transition: "all 0.15s",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Expense list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#666", fontSize: 14 }}>
            Caricamento...
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ color: "#666", fontSize: 14 }}>Nessuna spesa registrata</div>
            <div style={{ color: "#444", fontSize: 12, marginTop: 4 }}>
              Tocca + per aggiungere una spesa
            </div>
          </div>
        ) : (
          grouped.map(({ date, items }) => (
            <div key={date}>
              {/* Date header */}
              <div style={{
                padding: "8px 16px 4px",
                fontSize: 11, color: "#555",
                textTransform: "uppercase", letterSpacing: "0.06em",
                background: "#0d0d0d",
              }}>
                {formatDateLabel(date)}
              </div>
              {items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))
        )}
        <div style={{ height: 32 }} />
      </div>

      {/* Add form */}
      {showForm && (
        <ExpenseForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
