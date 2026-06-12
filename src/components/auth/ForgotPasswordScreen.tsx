"use client";
import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, TextInput, Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";

type Phase = "form" | "sent";

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth();
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("ForgotPassword");
  const tAuth = useTranslations("Auth");

  const handleSend = async () => {
    setError("");
    if (!email.includes("@")) { setError(tAuth("errorEmail")); return; }
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setPhase("sent");
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
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onBack}
            className="text-v-muted cursor-pointer hover:text-v-gold transition-colors"
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} />
          </button>
          <div className="font-display text-v-cream text-[18px]">{t("title")}</div>
        </div>

        {phase === "form" ? (
          <>
            <p className="text-sm font-body text-v-muted mb-5">{t("desc")}</p>

            <label className="text-[12px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block">
              {tAuth("emailLabel")}
            </label>
            <TextInput
              type="email"
              placeholder={tAuth("emailPlaceholder")}
              value={email}
              onChange={setEmail}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              autoFocus
            />

            {error && (
              <div className="bg-v-red-dim text-v-red rounded-lg px-3.5 py-2.5 text-[12px] font-body mt-3 animate-shake">
                {error}
              </div>
            )}

            <Button onClick={handleSend} disabled={loading} className="mt-4">
              {loading ? t("sending") : t("sendBtn")}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-v-panel2 border border-v-line rounded-2xl p-5 mb-5 text-center">
              <div className="text-v-gold text-2xl mb-3">
                <i className="ti ti-mail-check" />
              </div>
              <div className="font-display text-v-cream text-[18px] mb-2">{t("sentTitle")}</div>
              <p className="text-sm font-body text-v-muted">{t("sentDesc")}</p>
            </div>

            <Button
              onClick={async () => {
                setLoading(true);
                await resetPassword(email);
                setLoading(false);
              }}
              disabled={loading}
              variant="ghost"
              className="mb-3"
            >
              {loading ? t("sending") : t("resendBtn")}
            </Button>

            <Button onClick={onBack} variant="ghost">
              {t("backToLogin")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
