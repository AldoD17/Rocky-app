import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase-server";
import { TURNO_EXTRACTION_PROMPT, buildSystemPrompt } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface PurchaseExtracted {
  supplier_name: string;
  amount: number | null;
  category: "alimenti" | "bevande" | "consumabili" | "altro";
}

interface ParsedShift {
  is_shift_data: boolean;
  shift_date: string;
  service_type: string;
  revenue: number | null;
  receipts: number | null;
  service_hours: number | null;
  workers_count: number | null;
  supplier_spend: number | null;
  confidence: string;
  missing_fields: string[];
  purchases: PurchaseExtracted[];
}

interface ShiftWorkerInput {
  employee_id: string;
  hours_worked: number;
}

function buildShiftAnalysisMessage(parsed: ParsedShift): string {
  const avgReceipt = parsed.revenue && parsed.receipts && parsed.receipts > 0
    ? (parsed.revenue / parsed.receipts).toFixed(2) : null;
  const foodCostPct = parsed.revenue && parsed.supplier_spend
    ? ((parsed.supplier_spend / parsed.revenue) * 100).toFixed(1) : null;
  const manHours = parsed.workers_count && parsed.service_hours
    ? (parsed.workers_count * parsed.service_hours).toFixed(1) : null;
  const revenuePerMh = parsed.revenue && manHours
    ? (parsed.revenue / parseFloat(manHours)).toFixed(2) : null;

  const purchasesStr = parsed.purchases.length > 0
    ? "\nAcquisti registrati: " + parsed.purchases.map(p => `${p.supplier_name} €${p.amount ?? "?"} (${p.category})`).join(", ")
    : "";

  return [
    "Turno appena registrato — analizza le performance e dai il semaforo.",
    "",
    `Data: ${parsed.shift_date} · Servizio: ${parsed.service_type}`,
    `Incasso: €${parsed.revenue}`,
    parsed.receipts ? `Scontrini: ${parsed.receipts}${avgReceipt ? ` (scontrino medio €${avgReceipt})` : ""}` : "",
    parsed.service_hours ? `Ore servizio: ${parsed.service_hours}h` : "",
    parsed.workers_count ? `Persone in turno: ${parsed.workers_count}${manHours ? ` (${manHours} man-hours)` : ""}` : "",
    parsed.supplier_spend ? `Spesa totale fornitori: €${parsed.supplier_spend}${foodCostPct ? ` (food cost ${foodCostPct}%)` : ""}${purchasesStr}` : "Food cost: non registrato",
    revenuePerMh ? `Revenue/man-hour: €${revenuePerMh}` : "",
    "",
    "Rispondi con semaforo 🟢🟡🔴, numero-eroe e max 3 righe di analisi.",
  ].filter(Boolean).join("\n");
}

async function savePurchases(
  supabase: ReturnType<typeof createServiceClient>,
  restaurant_id: string,
  shift_id: string,
  shift_date: string,
  purchases: PurchaseExtracted[]
) {
  for (const p of purchases) {
    if (!p.supplier_name) continue;

    // Cerca o crea il fornitore (case-insensitive)
    let supplierId: string | null = null;
    let resolvedCategory = p.category || "altro";

    const { data: existing } = await supabase
      .from("suppliers")
      .select("id, default_category")
      .eq("restaurant_id", restaurant_id)
      .ilike("name", p.supplier_name.trim())
      .maybeSingle();

    if (existing) {
      supplierId = existing.id;
      // Usa la categoria del fornitore se l'acquisto non ha una categoria precisa
      if (p.category === "altro" && existing.default_category !== "altro") {
        resolvedCategory = existing.default_category;
      }
    } else {
      const { data: newSup } = await supabase
        .from("suppliers")
        .insert({ restaurant_id, name: p.supplier_name.trim(), default_category: resolvedCategory })
        .select("id").single();
      supplierId = newSup?.id || null;
    }

    await supabase.from("purchases").insert({
      restaurant_id,
      shift_id,
      supplier_id: supplierId,
      supplier_name: p.supplier_name.trim(),
      amount: p.amount ?? 0,
      category: resolvedCategory,
      purchase_date: shift_date,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurant_id, user_message, shift_workers, locale = 'it' } = await req.json();

    if (!restaurant_id) return NextResponse.json({ status: "error", message: "Manca restaurant_id" }, { status: 400 });
    if (!user_message || user_message.trim().length < 3) return NextResponse.json({ status: "error", message: "Messaggio troppo corto" }, { status: 400 });

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const today = new Date().toISOString().split("T")[0];
    const supabase = createServiceClient();
    const { data: ownedRestaurant } = await supabase
      .from("restaurants").select("user_id").eq("id", restaurant_id).single();
    if (!ownedRestaurant || ownedRestaurant.user_id !== user.id)
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });

    // 1. Estrai dati strutturati
    const extractionRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 768,
      system: TURNO_EXTRACTION_PROMPT,
      messages: [{ role: "user", content: `Oggi è ${today}.\n\nMessaggio del ristoratore:\n"${user_message.trim()}"` }],
    });

    const rawText = extractionRes.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("").trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: ParsedShift;
    try {
      parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed.purchases)) parsed.purchases = [];
    } catch {
      parsed = {
        is_shift_data: false, purchases: [], shift_date: "", service_type: "cena",
        revenue: null, receipts: null, service_hours: null, workers_count: null,
        supplier_spend: null, confidence: "low", missing_fields: [],
      };
    }

    // 2. Messaggio non-turno → risposta chat generica
    if (!parsed.is_shift_data || !parsed.revenue) {
      const { data: restaurantData } = await supabase.rpc("get_dati_ristorante", { p_restaurant_id: restaurant_id });
      const { data: conversations } = await supabase
        .from("conversations").select("role, content")
        .eq("restaurant_id", restaurant_id)
        .order("created_at", { ascending: false }).limit(10);
      const history = (conversations || []).reverse()
        .filter((c) => c.role && c.content)
        .map((c) => ({ role: c.role as "user" | "assistant", content: c.content }));

      const chatRes = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(restaurantData || {}, locale),
        messages: [...history, { role: "user", content: user_message.trim() }],
      });
      const assistantText = chatRes.content.filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : "")).join("").trim();

      let semaforo: "green" | "yellow" | "red" | null = null;
      if (assistantText.includes("🟢")) semaforo = "green";
      else if (assistantText.includes("🟡")) semaforo = "yellow";
      else if (assistantText.includes("🔴")) semaforo = "red";

      await supabase.from("conversations").insert({ restaurant_id, role: "user", content: user_message.trim(), tokens_used: null, tab: "oggi" });
      await supabase.from("conversations").insert({ restaurant_id, role: "assistant", content: assistantText, tokens_used: chatRes.usage?.output_tokens || null, tab: "oggi" });
      return NextResponse.json({ status: "ok", message: assistantText, semaforo, parsed_data: null });
    }

    // 3. Dati mancanti
    if (parsed.missing_fields && parsed.missing_fields.length > 0) {
      const labels: Record<string, string> = {
        revenue: "incasso della serata in euro",
        receipts: "numero di scontrini",
        service_hours: "ore di servizio",
        workers_count: "quante persone erano in turno",
      };
      const missing = parsed.missing_fields.map((f) => labels[f] || f);
      return NextResponse.json({
        status: "needs_clarification",
        message: `Non ho capito ${missing.join(" e ")}. Me lo puoi ridire?`,
        missing_fields: parsed.missing_fields,
        parsed_data: parsed,
      });
    }

    // 4. Validazione anomalie
    const warnings: string[] = [];
    if (parsed.revenue && parsed.revenue > 50000) warnings.push("Incasso molto alto (>50.000€): è corretto?");
    if (parsed.revenue && parsed.revenue < 10) warnings.push("Incasso molto basso (<10€): errore di battitura?");

    // 5. Salva il turno
    // supplier_spend: usa il totale degli acquisti se non esplicitamente fornito
    const purchasesTotal = parsed.purchases.reduce((s, p) => s + (p.amount ?? 0), 0);
    const supplierSpend = parsed.supplier_spend ?? (purchasesTotal > 0 ? purchasesTotal : null);

    const { data: insertedShift, error: insertError } = await supabase
      .from("shifts")
      .insert({
        restaurant_id,
        shift_date: parsed.shift_date,
        service_type: parsed.service_type,
        revenue: parsed.revenue,
        receipts: parsed.receipts,
        service_hours: parsed.service_hours,
        workers_count: parsed.workers_count,
        supplier_spend: supplierSpend,
        raw_message: user_message.trim(),
      })
      .select("id").single();

    if (insertError || !insertedShift) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ status: "error", message: "Errore nel salvataggio del turno" }, { status: 500 });
    }

    const shiftId = insertedShift.id;

    // 6. Salva acquisti e fornitori
    if (parsed.purchases.length > 0) {
      await savePurchases(supabase, restaurant_id, shiftId, parsed.shift_date, parsed.purchases);
    }

    // 7. Salva shift_workers se passati dal frontend (pannello dipendenti)
    const workers: ShiftWorkerInput[] = Array.isArray(shift_workers) ? shift_workers : [];
    if (workers.length > 0) {
      const swRows = workers
        .filter((w) => w.employee_id && w.hours_worked > 0)
        .map((w) => ({ shift_id: shiftId, employee_id: w.employee_id, hours_worked: w.hours_worked }));
      if (swRows.length > 0) {
        await supabase.from("shift_workers").insert(swRows);
      }
    }

    // 8. Genera analisi Rocky
    const { data: restaurantData } = await supabase.rpc("get_dati_ristorante", { p_restaurant_id: restaurant_id });
    const { data: conversations } = await supabase
      .from("conversations").select("role, content")
      .eq("restaurant_id", restaurant_id)
      .order("created_at", { ascending: false }).limit(8);
    const history = (conversations || []).reverse()
      .filter((c) => c.role && c.content)
      .map((c) => ({ role: c.role as "user" | "assistant", content: c.content }));

    const analysisRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(restaurantData || {}, locale),
      messages: [
        ...history,
        { role: "user", content: user_message.trim() },
        { role: "assistant", content: "(turno registrato)" },
        { role: "user", content: buildShiftAnalysisMessage({ ...parsed, supplier_spend: supplierSpend }) },
      ],
    });

    const assistantText = analysisRes.content.filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : "")).join("").trim();

    let semaforo: "green" | "yellow" | "red" | null = null;
    if (assistantText.includes("🟢")) semaforo = "green";
    else if (assistantText.includes("🟡")) semaforo = "yellow";
    else if (assistantText.includes("🔴")) semaforo = "red";

    // 9. Salva conversazione
    await supabase.from("conversations").insert({ restaurant_id, role: "user", content: user_message.trim(), shift_id: shiftId, tokens_used: null, tab: "oggi" });
    await supabase.from("conversations").insert({ restaurant_id, role: "assistant", content: assistantText, shift_id: shiftId, tokens_used: analysisRes.usage?.output_tokens || null, tab: "oggi" });

    return NextResponse.json({ status: "ok", message: assistantText, semaforo, shift_id: shiftId, warnings, parsed_data: parsed });
  } catch (error) {
    console.error("Turno API error:", error);
    return NextResponse.json({ status: "error", message: "Errore interno del server" }, { status: 500 });
  }
}
