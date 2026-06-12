import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase-server";

function makeAuthClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
}

async function verifyOwner(req: NextRequest, restaurant_id: string) {
  const { data: { user } } = await makeAuthClient(req).auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: r } = await service.from("restaurants").select("user_id").eq("id", restaurant_id).single();
  if (!r || r.user_id !== user.id) return null;
  return service;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurant_id = searchParams.get("restaurant_id");
    const shift_id = searchParams.get("shift_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let q = service.from("purchases").select("*, suppliers(name, default_category)")
      .eq("restaurant_id", restaurant_id).order("purchase_date", { ascending: false });
    if (shift_id) q = q.eq("shift_id", shift_id);
    if (start) q = q.gte("purchase_date", start);
    if (end) q = q.lte("purchase_date", end);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accetta sia un singolo oggetto che un array
    const items: unknown[] = Array.isArray(body) ? body : [body];
    const restaurant_id = (items[0] as Record<string, unknown>)?.restaurant_id as string;
    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await service.from("purchases").insert(items).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, restaurant_id, category, supplier_id } = await req.json();
    if (!id || !restaurant_id) return NextResponse.json({ error: "Missing id or restaurant_id" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates: Record<string, unknown> = {};
    if (category !== undefined) updates.category = category;
    if (supplier_id !== undefined) updates.supplier_id = supplier_id;

    const { error } = await service.from("purchases").update(updates).eq("id", id).eq("restaurant_id", restaurant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
