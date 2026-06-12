import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICE_IDS = {
  base: "price_1Th5XyQ5DmKxu1Cgr1g5On4r",
  pro: "price_1Th5ZeQ5DmKxu1Cgt9gM0OzJ",
} as const;

export type PlanName = "free" | "base" | "pro";

export function planFromPriceId(priceId: string): PlanName {
  if (priceId === PRICE_IDS.base) return "base";
  if (priceId === PRICE_IDS.pro) return "pro";
  return "free";
}
