"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LandingPage } from "@/components/landing/LandingPage";
import { LoginPage } from "@/components/auth/LoginPage";
import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { AppShell } from "@/components/app/AppShell";
import { SettingsScreen } from "@/components/app/SettingsScreen";
import { Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";

type Screen = "landing" | "login" | "reset" | "onboarding" | "app" | "settings";

export default function Home() {
  const { user, restaurant, loading } = useAuth();
  const [screen, setScreen] = useState<Screen | null>(null);
  const t = useTranslations("Page");

  // When user is signed out, return to landing regardless of current screen
  useEffect(() => {
    if (!loading && !user) setScreen(null);
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Mascot size={48} />
          <div className="text-v-muted text-[12px] font-body">{t("loadingApp")}</div>
        </div>
      </div>
    );
  }

  const currentScreen =
    screen ||
    (user
      ? restaurant && restaurant.onboarding_step >= 4
        ? "app"
        : "onboarding"
      : "landing");

  if (currentScreen === "landing") {
    return <LandingPage onStart={() => setScreen("login")} />;
  }

  if (currentScreen === "login") {
    return <LoginPage onForgot={() => setScreen("reset")} />;
  }

  if (currentScreen === "reset") {
    return <ForgotPasswordScreen onBack={() => setScreen("login")} />;
  }

  if (currentScreen === "onboarding") {
    return <OnboardingFlow onComplete={() => setScreen("app")} />;
  }

  if (currentScreen === "settings") {
    return <SettingsScreen onBack={() => setScreen("app")} />;
  }

  return <AppShell onSettings={() => setScreen("settings")} />;
}
