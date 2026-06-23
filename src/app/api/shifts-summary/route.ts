import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurant_id = searchParams.get("restaurant_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: restaurant } = await service
      .from("restaurants").select("user_id").eq("id", restaurant_id).single();
    if (!restaurant || restaurant.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let query = service.from("shifts").select("revenue").eq("restaurant_id", restaurant_id);
    if (start) query = query.gte("shift_date", start);
    if (end) query = query.lte("shift_date", end);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const revenue = (data ?? []).reduce((s: number, r: { revenue: number }) => s + (r.revenue ?? 0), 0);
    return NextResponse.json({ revenue });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
