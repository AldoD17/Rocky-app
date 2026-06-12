import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { stripe, PRICE_IDS } from "@/lib/stripe";

function makeAuthClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (plan !== "base" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { data: { user } } = await makeAuthClient(req).auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "if_required",
      line_items: [{ price: PRICE_IDS[plan as "base" | "pro"], quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id, plan },
      success_url: `${origin}/settings`,
      cancel_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
