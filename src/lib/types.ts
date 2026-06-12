export interface User {
  id: string;
  full_name: string | null;
  email: string;
  plan: "free" | "base" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  covers: number | null;
  open_days_per_week: number | null;
  service_type: string | null;
  avg_vat_rate: number | null;
  tax_accrual_pct: number | null;
  tax_regime: string | null;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  restaurant_id: string;
  name: string;
  role: string | null;
  contract_type: string | null;
  hourly_rate_gross: number | null;
  salary_pay_day: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedCost {
  id: string;
  restaurant_id: string;
  category: string;
  label: string | null;
  amount: number;
  frequency: string;
  pay_day: number | null;
  active: boolean;
  updated_at: string;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  shift_date: string;
  service_type: string | null;
  revenue: number;
  receipts: number;
  service_hours: number;
  workers_count: number;
  supplier_spend: number | null;
  avg_receipt: number | null;
  man_hours: number | null;
  revenue_per_man_hour: number | null;
  food_cost_pct: number | null;
  notes: string | null;
  raw_message: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  restaurant_id: string;
  role: "user" | "assistant";
  content: string;
  shift_id: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface Goal {
  id: string;
  restaurant_id: string;
  description: string;
  metric: string | null;
  target_value: number | null;
  active: boolean;
  created_at: string;
}

// Chat API types
export interface ChatRequest {
  restaurant_id: string;
  user_message: string;
  tab?: "day" | "week" | "month" | "year" | "learn";
}

export interface ChatResponse {
  status: "ok" | "error";
  message: string;
  semaforo: "green" | "yellow" | "red" | null;
  tokens_used: number | null;
}

export interface TurnoRequest {
  restaurant_id: string;
  user_message: string;
}

export interface TurnoResponse {
  status: "ok" | "needs_clarification" | "no_shift" | "error";
  message: string;
  shift_id?: string;
  warnings?: string[];
  missing_fields?: string[];
  parsed_data?: Record<string, unknown> | null;
  semaforo?: "green" | "yellow" | "red" | null;
}

// CCNL multipliers
export const CCNL_MULTIPLIERS: Record<string, number> = {
  full_time: 1.58,
  part_time: 1.55,
  apprendista: 1.22,
  a_chiamata: 1.45,
};
