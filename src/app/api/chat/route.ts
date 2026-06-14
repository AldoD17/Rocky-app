import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase-server";
import { buildSystemPrompt, buildLearnSystemPrompt } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function getWeekRange(): { monday: string; sunday: string } {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { monday: fmt(monday), sunday: fmt(sunday) };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "bimestrale":  return amount / 2;
    case "trimestrale": return amount / 3;
    case "semestrale":  return amount / 6;
    case "annuale":     return amount / 12;
    default:            return amount;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurant_id, user_message, tab, locale = 'it' } = await req.json();

    if (!restaurant_id) return NextResponse.json({ status: "error", message: "Manca restaurant_id" }, { status: 400 });
    if (!user_message || user_message.trim().length < 2) return NextResponse.json({ status: "error", message: "Messaggio troppo corto" }, { status: 400 });

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const { data: ownedRestaurant } = await supabase
      .from("restaurants").select("user_id").eq("id", restaurant_id).single();
    if (!ownedRestaurant || ownedRestaurant.user_id !== user.id)
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });

    // 1. Profilo ristorante
    const { data: restaurantData, error: rpcError } = await supabase.rpc("get_dati_ristorante", { p_restaurant_id: restaurant_id });
    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json({ status: "error", message: "Errore nel recupero dati ristorante" }, { status: 500 });
    }

    // 2. Cronologia conversazioni
    const { data: conversations } = await supabase
      .from("conversations").select("role, content")
      .eq("restaurant_id", restaurant_id)
      .order("created_at", { ascending: false }).limit(10);
    const history = (conversations || []).reverse()
      .filter((c) => c.role && c.content)
      .map((c) => ({ role: c.role as "user" | "assistant", content: c.content }));

    // 3. Contesto aggiuntivo per tab
    let extraContext = "";

    if (tab === "week") {
      const { monday, sunday } = getWeekRange();
      const { data: weekShifts } = await supabase
        .from("shifts").select("id, shift_date, service_type, revenue, receipts, service_hours, workers_count, supplier_spend, avg_receipt, food_cost_pct")
        .eq("restaurant_id", restaurant_id).gte("shift_date", monday).lte("shift_date", sunday).order("shift_date");
      const { data: weekPurchases } = await supabase
        .from("purchases").select("supplier_name, amount, category, purchase_date")
        .eq("restaurant_id", restaurant_id).gte("purchase_date", monday).lte("purchase_date", sunday);
      const { data: weekWorkers } = await supabase
        .from("shift_workers").select("hours_worked, employees(name, role, contract_type, hourly_rate_gross), shifts(shift_date)")
        .in("shift_id", (weekShifts || []).map((s: Record<string, unknown>) => s.id).filter(Boolean));
      extraContext = `\n\nTURNI SETTIMANA (${monday}→${sunday}):\n${JSON.stringify(weekShifts || [], null, 2)}\n\nACQUISTI SETTIMANA:\n${JSON.stringify(weekPurchases || [], null, 2)}\n\nDIPENDANTI IN TURNO:\n${JSON.stringify(weekWorkers || [], null, 2)}\n\nSe ci sono acquisti con categoria 'altro' o fornitori sconosciuti, chiedine la classificazione. Segnala anomalie di spesa.`;
    }

    if (tab === "month") {
      const { start, end } = getMonthRange();
      const { data: monthShifts } = await supabase
        .from("shifts").select("id, shift_date, service_type, revenue, receipts, service_hours, workers_count, supplier_spend, avg_receipt, food_cost_pct")
        .eq("restaurant_id", restaurant_id).gte("shift_date", start).lte("shift_date", end).order("shift_date");
      const { data: monthPurchases } = await supabase
        .from("purchases").select("supplier_name, amount, category, purchase_date")
        .eq("restaurant_id", restaurant_id).gte("purchase_date", start).lte("purchase_date", end);
      const { data: fc } = await supabase
        .from("fixed_costs").select("category, label, amount, frequency").eq("restaurant_id", restaurant_id).eq("active", true);
      const { data: emp } = await supabase
        .from("employees").select("name, role, contract_type, hourly_rate_gross").eq("restaurant_id", restaurant_id).eq("active", true);
      const fcMonthlized = (fc || []).map((c) => ({ ...c, monthly_equivalent: normalizeToMonthly(c.amount, c.frequency) }));
      // Aggregazione COGS per categoria
      const cogsByCategory: Record<string, number> = {};
      for (const p of (monthPurchases || [])) {
        cogsByCategory[p.category] = (cogsByCategory[p.category] || 0) + (p.amount || 0);
      }
      extraContext = `\n\nTURNI MESE (${start}→${end}):\n${JSON.stringify(monthShifts || [], null, 2)}\n\nACQUISTI PER CATEGORIA:\n${JSON.stringify(cogsByCategory, null, 2)}\n\nCOSTI FISSI (normalizzati mensile):\n${JSON.stringify(fcMonthlized, null, 2)}\n\nPERSONALE:\n${JSON.stringify(emp || [], null, 2)}\n\nChiedi i dati strutturali mancanti (affitto, paghe). Confronta con il mese precedente se possibile.`;
    }

    if (tab === "year") {
      const year = new Date().getFullYear();
      const { data: yearShifts } = await supabase
        .from("shifts").select("shift_date, revenue, supplier_spend, workers_count, service_hours")
        .eq("restaurant_id", restaurant_id).gte("shift_date", `${year}-01-01`).lte("shift_date", `${year}-12-31`);
      const byMonth: Record<string, { revenue: number; cogs: number; shifts: number }> = {};
      for (const s of (yearShifts || [])) {
        const m = s.shift_date.substring(0, 7);
        if (!byMonth[m]) byMonth[m] = { revenue: 0, cogs: 0, shifts: 0 };
        byMonth[m].revenue += s.revenue ?? 0;
        byMonth[m].cogs += s.supplier_spend ?? 0;
        byMonth[m].shifts += 1;
      }
      extraContext = `\n\nTOTALI MENSILI ANNO ${year}:\n${JSON.stringify(byMonth, null, 2)}\n\nAnalizza stagionalità, trend e dai indicazioni di rotta. Stima il risultato di fine anno se il trend continua.`;
    }

    if (tab === "learn") {
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      const thirtyAgoStr = thirtyAgo.toISOString().split("T")[0];
      const { data: recentShifts } = await supabase
        .from("shifts").select("shift_date, revenue, receipts, workers_count, service_hours, supplier_spend, avg_receipt, food_cost_pct")
        .eq("restaurant_id", restaurant_id).gte("shift_date", thirtyAgoStr).order("shift_date");
      const { data: recentPurchases } = await supabase
        .from("purchases").select("supplier_name, amount, category")
        .eq("restaurant_id", restaurant_id).gte("purchase_date", thirtyAgoStr);
      const { data: suppliers } = await supabase
        .from("suppliers").select("name, default_category").eq("restaurant_id", restaurant_id);
      const { data: emp } = await supabase
        .from("employees").select("role, contract_type, hourly_rate_gross").eq("restaurant_id", restaurant_id).eq("active", true);
      const { data: fc } = await supabase
        .from("fixed_costs").select("category, amount, frequency").eq("restaurant_id", restaurant_id).eq("active", true);
      // Aggregazione per analisi aree deboli
      const cogsByCategory: Record<string, number> = {};
      for (const p of (recentPurchases || [])) {
        cogsByCategory[p.category] = (cogsByCategory[p.category] || 0) + (p.amount || 0);
      }
      extraContext = `\n\nDATI PERFORMANCE ULTIMI 30 GIORNI:\nTurni: ${JSON.stringify(recentShifts || [], null, 2)}\nCOGS per categoria: ${JSON.stringify(cogsByCategory)}\nFornitori: ${JSON.stringify(suppliers || [], null, 2)}\nPersonale: ${JSON.stringify(emp || [], null, 2)}\nCosti fissi: ${JSON.stringify(fc || [], null, 2)}\n\nAnalizza i dati, identifica le aree deboli e GUIDA PROATTIVAMENTE l'apprendimento. Cita dati specifici del loro locale, non generici. Suggerisci il termine/concetto più utile da imparare adesso.`;
    }

    // 4. Sistema prompt
    const isLearn = tab === "learn";
    let systemPrompt = isLearn ? buildLearnSystemPrompt(locale) : buildSystemPrompt(restaurantData || {}, locale);
    if (extraContext) systemPrompt += extraContext;

    // 5. Chiama Claude
    const messages = [...history, { role: "user" as const, content: user_message.trim() }];
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantText = response.content.filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : "")).join("").trim();

    if (!assistantText) return NextResponse.json({ status: "error", message: "Risposta vuota dall'AI" }, { status: 500 });

    // 6. Rileva semaforo
    let semaforo: "green" | "yellow" | "red" | null = null;
    if (assistantText.includes("🟢")) semaforo = "green";
    else if (assistantText.includes("🟡")) semaforo = "yellow";
    else if (assistantText.includes("🔴")) semaforo = "red";

    const tokensUsed = response.usage?.output_tokens || null;

    // 7. Salva conversazione
    const { error: insertUserError } = await supabase.from("conversations").insert({ restaurant_id, role: "user", content: user_message.trim(), tokens_used: null, tab });
    if (insertUserError) console.error("CONVERSATION INSERT USER ERROR:", JSON.stringify(insertUserError));

    const { error: insertAssistantError } = await supabase.from("conversations").insert({ restaurant_id, role: "assistant", content: assistantText, tokens_used: tokensUsed, tab });
    if (insertAssistantError) console.error("CONVERSATION INSERT ASSISTANT ERROR:", JSON.stringify(insertAssistantError));

    return NextResponse.json({ status: "ok", message: assistantText, semaforo, tokens_used: tokensUsed });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ status: "error", message: "Errore interno del server" }, { status: 500 });
  }
}
