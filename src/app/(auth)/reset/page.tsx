"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button, TextInput, Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";

type Phase = "loading" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("Reset");
  const tAuth = useTranslations("Auth");

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPhase("form");
      }
    });

    // Handle PKCE flow: exchange code for session
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setPhase("invalid");
        // PASSWORD_RECOVERY event fires after successful exchange
      });
    } else {
      // Implicit flow: onAuthStateChange handles the token from URL hash.
      // Fall back to invalid after a timeout if no event fires.
      const timer = setTimeout(() => {
        setPhase((prev) => (prev === "loading" ? "invalid" : prev));
      }, 4000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async () => {
    setError("");
    if (password.length < 6) { setError(t("errorMinLength")); return; }
    if (password !== confirm) { setError(t("errorMismatch")); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      await supabase.auth.signOut();
      setPhase("success");
    }
  };

  return (
    <div className="flex flex-col h-full bg-v-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <Mascot size={64} />
        <div className="font-display text-v-cream text-[32px] leading-none mt-1">Rocky</div>
        <div className="text-v-muted text-sm font-body">{tAuth("tagline")}</div>
      </div>

      <div className="px-5 pt-5 pb-8 border-t border-v-line bg-v-panel">
        {phase === "loading" && (
          <div className="flex items-center justify-center py-8 text-v-muted text-sm font-body">
            {t("loadingSession")}
          </div>
        )}

        {phase === "invalid" && (
          <div className="text-center py-6">
            <div className="text-v-red text-3xl mb-3">
              <i className="ti ti-link-off" />
            </div>
            <p className="text-sm font-body text-v-muted mb-6">{t("invalidLink")}</p>
            <Button onClick={() => router.push("/")} variant="ghost">
              {t("goToLoginBtn")}
            </Button>
          </div>
        )}

        {phase === "form" && (
          <>
            <div className="font-display text-v-cream text-[18px] mb-5">{t("title")}</div>

            <label className="text-[12px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block">
              {t("newPasswordLabel")}
            </label>
            <div className="relative">
              <TextInput
                type={showPw ? "text" : "password"}
                placeholder={t("newPasswordPlaceholder")}
                value={password}
                onChange={setPassword}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("confirm-input")?.focus()}
                autoFocus
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-v-muted text-xs font-body cursor-pointer"
              >
                {showPw ? tAuth("hidePassword") : tAuth("showPassword")}
              </button>
            </div>

            <label className="text-[12px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block mt-4">
              {t("confirmPasswordLabel")}
            </label>
            <div className="relative">
              <TextInput
                id="confirm-input"
                type={showConfirm ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirm}
                onChange={setConfirm}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-v-muted text-xs font-body cursor-pointer"
              >
                {showConfirm ? tAuth("hidePassword") : tAuth("showPassword")}
              </button>
            </div>

            {error && (
              <div className="bg-v-red-dim text-v-red rounded-lg px-3.5 py-2.5 text-[12px] font-body mt-3 animate-shake">
                {error}
              </div>
            )}

            <Button onClick={handleSave} disabled={loading} className="mt-4">
              {loading ? t("saving") : t("saveBtn")}
            </Button>
          </>
        )}

        {phase === "success" && (
          <div className="text-center py-6">
            <div className="text-v-gold text-3xl mb-3">
              <i className="ti ti-circle-check" />
            </div>
            <div className="font-display text-v-cream text-[22px] mb-2">{t("successTitle")}</div>
            <p className="text-sm font-body text-v-muted mb-6">{t("successDesc")}</p>
            <Button onClick={() => router.push("/")}>
              {t("goToLoginBtn")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
