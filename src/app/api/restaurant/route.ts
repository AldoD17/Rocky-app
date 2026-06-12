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

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await makeAuthClient(req).auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Guard: restituisce il ristorante se esiste già (evita duplicati in caso di race)
    const { data: existing } = await service
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ data: existing[0] });
    }

    // Crea il profilo utente in public.users (upsert)
    await service.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string) || null,
    });

    // Crea ristorante vuoto
    const { data: newR, error } = await service
      .from("restaurants")
      .insert({ user_id: user.id, name: "", onboarding_step: 0 })
      .select()
      .single();

    if (error) {
      console.error("Restaurant create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: newR });
  } catch (error) {
    console.error("Restaurant POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, full_name, ...restaurantUpdates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data: { user } } = await makeAuthClient(req).auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify the restaurant belongs to this user
    const { data: existing } = await service
      .from("restaurants")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update user's full_name if provided
    if (full_name) {
      await service
        .from("users")
        .update({ full_name })
        .eq("id", user.id);
    }

    // Update the restaurant using service role (bypasses RLS)
    const { error } = await service
      .from("restaurants")
      .update(restaurantUpdates)
      .eq("id", id);

    if (error) {
      console.error("Restaurant update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Restaurant API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
