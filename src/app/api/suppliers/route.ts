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
    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await service.from("suppliers")
      .select("*").eq("restaurant_id", restaurant_id).order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurant_id, name, default_category } = await req.json();
    if (!restaurant_id || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Upsert per nome (case-insensitive)
    const { data: existing } = await service.from("suppliers")
      .select("id").eq("restaurant_id", restaurant_id).ilike("name", name.trim()).maybeSingle();

    if (existing) {
      if (default_category) {
        await service.from("suppliers").update({ default_category }).eq("id", existing.id);
      }
      return NextResponse.json({ data: existing });
    }

    const { data, error } = await service.from("suppliers")
      .insert({ restaurant_id, name: name.trim(), default_category: default_category || "altro" })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, restaurant_id, default_category } = await req.json();
    if (!id || !restaurant_id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const service = await verifyOwner(req, restaurant_id);
    if (!service) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await service.from("suppliers")
      .update({ default_category }).eq("id", id).eq("restaurant_id", restaurant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
