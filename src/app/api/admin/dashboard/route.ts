import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

async function safeNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://claude.ai",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ROCKY_ADMIN_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.cookies.get("rocky_admin_session")?.value === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Shared data fetched once, used across all sections
  const [
    { data: allUsersData },
    { data: allRestaurantsData },
    { data: allConversationsData },
    { data: allShiftsData },
  ] = await Promise.all([
    supabase.from("users").select("id, email, plan, created_at"),
    supabase.from("restaurants").select("id, name, user_id, created_at, onboarding_step"),
    supabase.from("conversations").select("restaurant_id, role, created_at, tab"),
    supabase.from("shifts").select("restaurant_id, created_at"),
  ]);

  const allUsers = allUsersData || [];
  const allRestaurants = allRestaurantsData || [];
  const allConversations = allConversationsData || [];
  const allShifts = allShiftsData || [];

  // Pre-compute per-restaurant conversation dates for retention (avoid repeated filtering)
  const convDatesByRestaurant = new Map<string, Date[]>();
  for (const c of allConversations) {
    if (!convDatesByRestaurant.has(c.restaurant_id)) {
      convDatesByRestaurant.set(c.restaurant_id, []);
    }
    convDatesByRestaurant.get(c.restaurant_id)!.push(new Date(c.created_at));
  }

  // --- OVERVIEW ---
  const overview = await safeNull(async () => {
    const [
      { count: total_users },
      { count: total_restaurants },
      { count: total_shifts },
      { count: total_conversations },
      { count: total_expenses },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("restaurants").select("*", { count: "exact", head: true }),
      supabase.from("shifts").select("*", { count: "exact", head: true }),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("purchases").select("*", { count: "exact", head: true }).is("shift_id", null),
    ]);
    return {
      total_users,
      total_restaurants,
      total_shifts,
      total_conversations,
      total_expenses,
      date_generated: now.toISOString(),
    };
  });

  // --- GROWTH (last 30 days) ---
  const growth = await safeNull(async () => {
    const groupByDate = (rows: Array<{ created_at: string }>): Array<{ date: string; count: number }> => {
      const map: Record<string, number> = {};
      for (const row of rows) {
        const date = row.created_at.split("T")[0];
        map[date] = (map[date] || 0) + 1;
      }
      const result: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        result.push({ date: dateStr, count: map[dateStr] || 0 });
      }
      return result;
    };

    const [
      { data: signups },
      { data: shiftsCreated },
      { data: userMessages },
    ] = await Promise.all([
      supabase.from("users").select("created_at").gte("created_at", days30Ago.toISOString()),
      supabase.from("shifts").select("created_at").gte("created_at", days30Ago.toISOString()),
      supabase.from("conversations").select("created_at").eq("role", "user").gte("created_at", days30Ago.toISOString()),
    ]);

    return {
      daily_signups: groupByDate(signups || []),
      daily_shifts: groupByDate(shiftsCreated || []),
      daily_messages: groupByDate(userMessages || []),
    };
  });

  // --- RETENTION ---
  const retention = await safeNull(async () => {
    const userRestaurantsMap = new Map<string, string[]>();
    for (const r of allRestaurants) {
      if (!userRestaurantsMap.has(r.user_id)) userRestaurantsMap.set(r.user_id, []);
      userRestaurantsMap.get(r.user_id)!.push(r.id);
    }

    const checkRetention = (dayThreshold: number): number => {
      const eligible = allUsers.filter(
        (u) => now.getTime() - new Date(u.created_at).getTime() >= dayThreshold * 24 * 60 * 60 * 1000
      );
      if (eligible.length === 0) return 0;
      let retained = 0;
      for (const user of eligible) {
        const signupDate = new Date(user.created_at);
        const thresholdDate = new Date(signupDate.getTime() + dayThreshold * 24 * 60 * 60 * 1000);
        const restaurantIds = userRestaurantsMap.get(user.id) || [];
        const hasActivity = restaurantIds.some((rid) =>
          (convDatesByRestaurant.get(rid) || []).some((d) => d >= thresholdDate)
        );
        if (hasActivity) retained++;
      }
      return Math.round((retained / eligible.length) * 100);
    };

    const restaurantsWithOldConv = new Set(
      allConversations
        .filter((c) => new Date(c.created_at) < days14Ago)
        .map((c) => c.restaurant_id)
    );
    const restaurantsWithRecentConv = new Set(
      allConversations
        .filter((c) => new Date(c.created_at) >= days14Ago)
        .map((c) => c.restaurant_id)
    );
    const churned = [...restaurantsWithOldConv].filter((id) => !restaurantsWithRecentConv.has(id)).length;

    return {
      d1_retention: checkRetention(1),
      d7_retention: checkRetention(7),
      d30_retention: checkRetention(30),
      active_last_7_days: new Set(
        allConversations.filter((c) => new Date(c.created_at) >= days7Ago).map((c) => c.restaurant_id)
      ).size,
      active_last_30_days: new Set(
        allConversations.filter((c) => new Date(c.created_at) >= days30Ago).map((c) => c.restaurant_id)
      ).size,
      churned,
    };
  });

  // --- ENGAGEMENT ---
  const engagement = await safeNull(async () => {
    const activeRestaurants7 = new Set(
      allConversations
        .filter((c) => new Date(c.created_at) >= days7Ago)
        .map((c) => c.restaurant_id)
    );

    const shiftsLast7 = allShifts.filter((s) => new Date(s.created_at) >= days7Ago);
    const avg_shifts_per_active_user_week =
      activeRestaurants7.size > 0
        ? Math.round((shiftsLast7.length / activeRestaurants7.size) * 100) / 100
        : 0;

    const messagesLast7 = allConversations.filter(
      (c) => c.role === "user" && new Date(c.created_at) >= days7Ago
    );
    const avg_messages_per_active_user_day =
      activeRestaurants7.size > 0
        ? Math.round((messagesLast7.length / (activeRestaurants7.size * 7)) * 100) / 100
        : 0;

    const tabDist: Record<string, number> = {};
    for (const c of allConversations) {
      if (c.role === "user" && new Date(c.created_at) >= days30Ago) {
        const tab = c.tab || "unknown";
        tabDist[tab] = (tabDist[tab] || 0) + 1;
      }
    }
    const tab_distribution = Object.entries(tabDist).map(([tab, count]) => ({ tab, count }));

    return {
      avg_shifts_per_active_user_week,
      avg_messages_per_active_user_day,
      tab_distribution,
      north_star: avg_shifts_per_active_user_week,
    };
  });

  // --- USERS (per restaurant) ---
  const users = await safeNull(async () => {
    const usersById = new Map(allUsers.map((u) => [u.id, u]));

    const shiftsByRestaurant = new Map<string, number>();
    const shiftsLast7ByRestaurant = new Map<string, number>();
    for (const s of allShifts) {
      shiftsByRestaurant.set(s.restaurant_id, (shiftsByRestaurant.get(s.restaurant_id) || 0) + 1);
      if (new Date(s.created_at) >= days7Ago) {
        shiftsLast7ByRestaurant.set(s.restaurant_id, (shiftsLast7ByRestaurant.get(s.restaurant_id) || 0) + 1);
      }
    }

    const messagesByRestaurant = new Map<string, number>();
    const messagesLast7ByRestaurant = new Map<string, number>();
    const lastActiveByRestaurant = new Map<string, string>();
    for (const c of allConversations) {
      if (c.role === "user") {
        messagesByRestaurant.set(c.restaurant_id, (messagesByRestaurant.get(c.restaurant_id) || 0) + 1);
        if (new Date(c.created_at) >= days7Ago) {
          messagesLast7ByRestaurant.set(
            c.restaurant_id,
            (messagesLast7ByRestaurant.get(c.restaurant_id) || 0) + 1
          );
        }
      }
      const current = lastActiveByRestaurant.get(c.restaurant_id);
      if (!current || c.created_at > current) {
        lastActiveByRestaurant.set(c.restaurant_id, c.created_at);
      }
    }

    return allRestaurants.map((r) => {
      const user = usersById.get(r.user_id);
      const lastActive = lastActiveByRestaurant.get(r.id) || null;
      return {
        restaurant_id: r.id,
        restaurant_name: r.name,
        user_email: user?.email || null,
        plan: user?.plan || null,
        created_at: r.created_at,
        onboarding_step: r.onboarding_step,
        total_shifts: shiftsByRestaurant.get(r.id) || 0,
        total_messages: messagesByRestaurant.get(r.id) || 0,
        last_active: lastActive,
        shifts_last_7_days: shiftsLast7ByRestaurant.get(r.id) || 0,
        messages_last_7_days: messagesLast7ByRestaurant.get(r.id) || 0,
        is_churned: !lastActive || new Date(lastActive) < days14Ago,
      };
    });
  });

  return NextResponse.json({ overview, growth, retention, engagement, users }, { headers: corsHeaders });
}
