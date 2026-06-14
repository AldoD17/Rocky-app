"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Chip, TextInput } from "@/components/ui";
import { useTranslations } from "next-intl";
import { CONTRACT_OPTIONS } from "@/lib/constants";

export interface WorkerEntry {
  employee_id: string;
  hours_worked: number;
  name: string;
  role: string | null;
}

interface EmployeePanelProps {
  onConfirm: (formattedText: string, workers: WorkerEntry[]) => void;
  onClose: () => void;
}

interface EmpRow {
  id: string;
  name: string;
  role: string | null;
  contract_type: string | null;
  hourly_rate_gross: number | null;
}

export function EmployeePanel({ onConfirm, onClose }: EmployeePanelProps) {
  const { restaurant } = useAuth();
  const t = useTranslations("Employee");
  const tC = useTranslations("Common");
  const tS = useTranslations("Settings");
  const CONTRACT_LABELS: Record<string, string> = {
    full_time:   tS("contractFullTime"),
    part_time:   tS("contractPartTime"),
    apprendista: tS("contractApprendista"),
    a_chiamata:  tS("contractAChiamata"),
  };
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, number>>({}); // employee_id → hours
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newContract, setNewContract] = useState("full_time");
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    const res = await fetch(`/api/employees?restaurant_id=${restaurant.id}`);
    const json = await res.json();
    setEmployees(json.data || []);
    setLoading(false);
  }, [restaurant?.id]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 4 }; // default 4 ore
    });
  };

  const setHours = (id: string, h: number) => {
    setSelected((prev) => ({ ...prev, [id]: h }));
  };

  const addEmployee = async () => {
    if (!restaurant?.id || !newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        name: newName.trim(),
        role: newRole || null,
        contract_type: newContract,
        hourly_rate_gross: parseFloat(newHourlyRate) || null,
      }),
    });
    const json = await res.json();
    if (json.data) {
      setEmployees((prev) => [...prev, json.data]);
      setNewName(""); setNewRole(""); setNewHourlyRate("");
      setShowAddForm(false);
    }
    setSaving(false);
  };

  const handleConfirm = () => {
    const selectedEmployees = Object.entries(selected)
      .map(([id, hours]) => {
        const emp = employees.find((e) => e.id === id);
        if (!emp) return null;
        return { employee_id: id, hours_worked: hours, name: emp.name, role: emp.role };
      })
      .filter(Boolean) as WorkerEntry[];

    if (selectedEmployees.length === 0) return;

    const text = "👥 Dipendenti: " +
      selectedEmployees.map((w) => `${w.name}${w.role ? ` (${w.role})` : ""}, ${w.hours_worked}h`).join(" · ");

    onConfirm(text, selectedEmployees);
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel — bottom sheet */}
      <div className="fixed left-0 right-0 z-50 mx-auto max-w-md bg-v-panel border-t border-v-line rounded-t-2xl" style={{ bottom: 'calc(56px + max(env(safe-area-inset-bottom, 0px), 8px))' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-v-line" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="font-display text-v-cream text-[16px]">{t("title")}</div>
          <button onClick={onClose} className="text-v-muted hover:text-v-gold cursor-pointer text-xl leading-none">×</button>
        </div>

        {/* Lista dipendenti */}
        <div className="px-4 pb-24 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {loading ? (
            <div className="text-v-muted text-sm font-body text-center py-6">{t("loading")}</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-v-muted text-sm font-body mb-3">{t("noEmployees")}</div>
              {!showAddForm && (
                <button onClick={() => setShowAddForm(true)}
                  className="text-v-gold text-sm font-body underline cursor-pointer">
                  {t("addFirst")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {employees.map((emp) => {
                const isSelected = emp.id in selected;
                return (
                  <div key={emp.id}
                    className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                      isSelected ? "border-v-gold bg-v-panel2" : "border-v-line bg-v-panel2"
                    }`}
                    onClick={() => toggle(emp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-v-gold border-v-gold" : "border-v-line"
                        }`}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="#0f0d0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-body font-semibold text-v-cream">{emp.name}</div>
                          <div className="text-[11px] font-body text-v-muted">
                            {emp.role || "—"} · {CONTRACT_LABELS[emp.contract_type ?? ""] ?? emp.contract_type}
                          </div>
                        </div>
                      </div>
                      {/* Ore input (solo se selezionato) */}
                      {isSelected && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setHours(emp.id, Math.max(0.5, (selected[emp.id] || 4) - 0.5))}
                            className="w-7 h-7 rounded-lg bg-v-panel border border-v-line text-v-muted flex items-center justify-center cursor-pointer hover:border-v-gold hover:text-v-gold">
                            −
                          </button>
                          <span className="text-sm font-body text-v-cream w-10 text-center">
                            {selected[emp.id]}h
                          </span>
                          <button onClick={() => setHours(emp.id, Math.min(16, (selected[emp.id] || 4) + 0.5))}
                            className="w-7 h-7 rounded-lg bg-v-panel border border-v-line text-v-muted flex items-center justify-center cursor-pointer hover:border-v-gold hover:text-v-gold">
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!showAddForm && (
                <button onClick={() => setShowAddForm(true)}
                  className="w-full min-h-[44px] border border-dashed border-v-line rounded-xl text-v-muted text-sm font-body hover:border-v-gold hover:text-v-gold transition-colors cursor-pointer">
                  {t("addEmployee")}
                </button>
              )}
            </div>
          )}

          {/* Mini form aggiunta dipendente */}
          {showAddForm && (
            <div className="bg-v-panel2 border border-v-line rounded-xl p-4 flex flex-col gap-3 mb-4">
              <TextInput
                autoFocus
                placeholder={t("namePlaceholder")}
                value={newName}
                onChange={setNewName}
              />
              <TextInput
                placeholder={t("rolePlaceholder")}
                value={newRole}
                onChange={setNewRole}
              />
              <div className="flex gap-1.5 flex-wrap">
                {CONTRACT_OPTIONS.map((c) => (
                  <Chip key={c.value} label={CONTRACT_LABELS[c.value] ?? c.label} active={newContract === c.value}
                    onClick={() => setNewContract(c.value)} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addEmployee} disabled={saving || !newName.trim()}
                  className="flex-1 min-h-[44px] bg-v-gold text-v-bg rounded-xl text-sm font-body font-semibold cursor-pointer disabled:opacity-50">
                  {saving ? "…" : t("save")}
                </button>
                <button onClick={() => setShowAddForm(false)}
                  className="flex-1 min-h-[44px] border border-v-line text-v-muted rounded-xl text-sm font-body cursor-pointer hover:border-v-gold hover:text-v-gold transition-colors">
                  {tC("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-2 pb-6 border-t border-v-line mt-1">
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="w-full min-h-[48px] bg-v-gold text-v-bg rounded-xl text-sm font-body font-semibold cursor-pointer disabled:opacity-40 hover:bg-v-gold-hover transition-colors"
          >
            {selectedCount > 0
              ? (selectedCount === 1 ? t("confirmSingle") : t("confirmMultiple", { count: selectedCount }))
              : t("selectAtLeastOne")}
          </button>
        </div>
      </div>
    </>
  );
}
