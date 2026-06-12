import { NextRequest, NextResponse } from "next/server";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import type Stripe from "stripe";

async function resolveUserId(
  service: ReturnType<typeof createServiceClient>,
  metaUserId: string | undefined,
  customerId: string | undefined
): Promise<string | null> {
  if (metaUserId) return metaUserId;
  if (!customerId) return null;
  const { data } = await service
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (sig && secret) {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook parse error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription || !session.customer) break;

        const userId = await resolveUserId(
          service,
          session.metadata?.user_id,
          session.customer as string
        );
        if (!userId) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id ?? "";
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

        await service.from("users").update({
          plan: planFromPriceId(priceId),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          trial_ends_at: trialEnd,
        }).eq("id", userId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          service,
          sub.metadata?.user_id,
          sub.customer as string
        );
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const isActive = ["active", "trialing"].includes(sub.status);
        const plan = isActive ? planFromPriceId(priceId) : "free";
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

        await service.from("users").update({
          plan,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          trial_ends_at: trialEnd,
        }).eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          service,
          sub.metadata?.user_id,
          sub.customer as string
        );
        if (!userId) break;

        await service.from("users").update({
          plan: "free",
          stripe_subscription_id: null,
          trial_ends_at: null,
        }).eq("id", userId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        if (!subRef) break;

        const sub = await stripe.subscriptions.retrieve(
          typeof subRef === "string" ? subRef : subRef.id
        );
        const userId = await resolveUserId(
          service,
          sub.metadata?.user_id,
          sub.customer as string
        );
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        await service.from("users").update({
          plan: planFromPriceId(priceId),
        }).eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("Payment failed for invoice:", invoice.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
