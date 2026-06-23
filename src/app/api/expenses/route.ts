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

async function getAuthenticatedRestaurant(req: NextRequest, restaurant_id: string) {
  const { data: { user } } = await makeAuthClient(req).auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const service = createServiceClient();
  const { data: restaurant } = await service
    .from("restaurants")
    .select("user_id")
    .eq("id", restaurant_id)
    .single();

  if (!restaurant || restaurant.user_id !== user.id) {
    return { error: "Forbidden", status: 403 };
  }
  return { service };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurant_id = searchParams.get("restaurant_id");
    const month = searchParams.get("month"); // YYYY-MM

    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let query = auth.service
      .from("purchases")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .is("shift_id", null)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      query = query.gte("purchase_date", start).lt("purchase_date", nextMonth);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      restaurant_id,
      macro_category,
      category,
      label,
      amount,
      supplier_name,
      purchase_date,
      is_recurring,
      frequency,
    } = body;

    if (!restaurant_id || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.service
      .from("purchases")
      .insert({
        restaurant_id,
        shift_id: null,
        macro_category: macro_category || "cogs",
        category: category || "altro",
        label: label || null,
        amount: parseFloat(amount),
        supplier_name: supplier_name || null,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
        is_recurring: is_recurring ?? false,
        frequency: frequency || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, restaurant_id, amount, label, category, macro_category, purchase_date } = body;

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Missing id or restaurant_id" }, { status: 400 });
    }

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.service
      .from("purchases")
      .update({
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(label !== undefined && { label: label || null }),
        ...(category !== undefined && { category }),
        ...(macro_category !== undefined && { macro_category }),
        ...(purchase_date !== undefined && { purchase_date }),
      })
      .eq("id", id)
      .eq("restaurant_id", restaurant_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const restaurant_id = searchParams.get("restaurant_id");

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Missing id or restaurant_id" }, { status: 400 });
    }

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { error } = await auth.service
      .from("purchases")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
