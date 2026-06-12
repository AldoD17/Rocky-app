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
    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.service
      .from("fixed_costs")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .eq("active", true)
      .order("category");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, category, label, amount, frequency } = body;

    if (!restaurant_id || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await getAuthenticatedRestaurant(req, restaurant_id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.service
      .from("fixed_costs")
      .insert({
        restaurant_id,
        category,
        label: label || null,
        amount: amount ?? 0,
        frequency: frequency || "mensile",
        active: true,
      })
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
      .from("fixed_costs")
      .update({ active: false })
      .eq("id", id)
      .eq("restaurant_id", restaurant_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
