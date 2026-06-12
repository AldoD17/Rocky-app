"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Restaurant } from "@/lib/types";
import type { PlanName } from "@/lib/stripe";

interface AuthState {
  user: SupabaseUser | null;
  restaurant: Restaurant | null;
  userPlan: PlanName;
  stripeCustomerId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshRestaurant: () => Promise<void>;
  refreshUserPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [userPlan, setUserPlan] = useState<PlanName>("free");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadUserPlan = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("plan, stripe_customer_id")
      .eq("id", userId)
      .single();
    if (data) {
      setUserPlan((data.plan ?? "free") as PlanName);
      setStripeCustomerId(data.stripe_customer_id ?? null);
    }
  }, [supabase]);

  const loadRestaurant = useCallback(async (userId: string) => {
    // Cerca ristorante esistente
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Error loading restaurant:", error);
      return;
    }

    if (data && data.length > 0) {
      setRestaurant(data[0]);
    } else {
      // Nessun ristorante: creane uno via API server-side (usa service role, nessun 401)
      const res = await fetch("/api/restaurant", { method: "POST" });
      if (res.ok) {
        const { data: newR } = await res.json();
        if (newR) setRestaurant(newR);
      } else {
        console.error("Error creating restaurant:", await res.text().catch(() => "unknown"));
      }
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await Promise.all([
          loadRestaurant(session.user.id),
          loadUserPlan(session.user.id),
        ]);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await Promise.all([
          loadRestaurant(session.user.id),
          loadUserPlan(session.user.id),
        ]);
      } else {
        setUser(null);
        setRestaurant(null);
        setUserPlan("free");
        setStripeCustomerId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadRestaurant]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "invalidCredentials" : error.message };
    return {};
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };
    // users e restaurants vengono creati in loadRestaurant dopo la conferma email
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } });
  };

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${window.location.origin}/` } });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) return { error: error.message };
    return {};
  };

  const refreshRestaurant = async () => {
    if (user) await loadRestaurant(user.id);
  };

  const refreshUserPlan = async () => {
    if (user) await loadUserPlan(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, userPlan, stripeCustomerId, loading, signIn, signUp, signOut, signInWithGoogle, signInWithApple, resetPassword, refreshRestaurant, refreshUserPlan }}>
      {children}
    </AuthContext.Provider>
  );
}
