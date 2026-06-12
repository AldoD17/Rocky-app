"use client";
import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, TextInput, Mascot } from "@/components/ui";
import { useTranslations } from "next-intl";

export function LoginPage({ onForgot }: { onForgot: () => void }) {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [gdprTerms, setGdprTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const t = useTranslations("Auth");

  const handleSubmit = async () => {
    setError("");
    if (!email.includes("@")) { setError(t("errorEmail")); return; }
    if (password.length < 6) { setError(t("errorPassword")); return; }
    if (isRegister && !gdprTerms) { setError(t("errorTerms")); return; }

    setLoading(true);
    const result = isRegister ? await signUp(email, password) : await signIn(email, password);
    if (result.error) setError(result.error === "invalidCredentials" ? t("errorInvalidCredentials") : result.error);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-v-bg">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <Mascot size={64} />
        <div className="font-display text-v-cream text-[32px] leading-none mt-1">Rocky</div>
        <div className="text-v-muted text-sm font-body">{t("tagline")}</div>
      </div>

      {/* Form panel */}
      <div className="px-5 pt-5 pb-8 border-t border-v-line bg-v-panel">
        {/* Toggle */}
        <div className="flex gap-1 bg-v-panel2 border border-v-line rounded-full p-0.5 mb-5">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-full text-xs font-semibold font-body transition-colors duration-150 cursor-pointer ${
              !isRegister ? "bg-v-gold text-v-bg" : "text-v-muted"
            }`}
          >
            {t("loginTab")}
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2.5 rounded-full text-xs font-semibold font-body transition-colors duration-150 cursor-pointer ${
              isRegister ? "bg-v-gold text-v-bg" : "text-v-muted"
            }`}
          >
            {t("registerTab")}
          </button>
        </div>

        {/* Social buttons */}
        <button
          onClick={signInWithGoogle}
          className="w-full bg-v-panel2 border border-v-line rounded-xl min-h-[48px] text-sm text-v-cream font-body font-medium flex items-center justify-center gap-2.5 mb-2 cursor-pointer hover:border-v-gold transition-colors duration-150"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t("googleBtn")}
        </button>
        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-v-line" />
          <span className="text-[11px] font-body text-v-muted uppercase tracking-[0.3px]">{t("or")}</span>
          <div className="flex-1 h-px bg-v-line" />
        </div>

        {/* Email */}
        <label className="text-[12px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block">
          {t("emailLabel")}
        </label>
        <TextInput
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={setEmail}
          onKeyDown={(e) => e.key === "Enter" && document.getElementById("pw-input")?.focus()}
        />

        {/* Password */}
        <label className="text-[12px] font-body font-medium text-v-muted uppercase tracking-[0.3px] block mt-4">
          {isRegister ? t("createPasswordLabel") : t("passwordLabel")}
        </label>
        <div className="relative">
          <TextInput
            id="pw-input"
            type={showPw ? "text" : "password"}
            placeholder={isRegister ? t("passwordPlaceholderNew") : t("passwordPlaceholder")}
            value={password}
            onChange={setPassword}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-v-muted text-xs font-body cursor-pointer"
          >
            {showPw ? t("hidePassword") : t("showPassword")}
          </button>
        </div>

        {!isRegister && (
          <button
            onClick={onForgot}
            className="block text-right text-[11px] font-body text-v-muted underline decoration-v-line mt-2 ml-auto cursor-pointer"
          >
            {t("forgotPassword")}
          </button>
        )}

        {/* GDPR */}
        {isRegister && (
          <label
            className="flex items-start gap-3 mt-4 cursor-pointer"
            onClick={() => setGdprTerms(!gdprTerms)}
          >
            <div
              className={`w-[18px] h-[18px] rounded shrink-0 border flex items-center justify-center mt-0.5 transition-colors duration-150 ${
                gdprTerms ? "bg-v-gold border-v-gold" : "bg-v-bg border-v-line"
              }`}
            >
              {gdprTerms && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="#0f0d0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-xs font-body text-v-muted leading-relaxed">
              {t("termsAccept")}{" "}
              <span className="text-v-gold">{t("termsLink")}</span>{" "}
              {t("termsAnd")}{" "}
              <span className="text-v-gold">{t("privacyLink")}</span>{" "}
              {t("termsOf")}
            </span>
          </label>
        )}

        {/* Error */}
        {error && (
          <div className="bg-v-red-dim text-v-red rounded-lg px-3.5 py-2.5 text-[12px] font-body mt-3 animate-shake">
            {error}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading} className="mt-4">
          {loading ? t("loadingBtn") : isRegister ? t("registerBtn") : t("loginBtn")}
        </Button>

        <div className="text-center mt-3 text-xs font-body text-v-muted">
          {isRegister ? t("alreadyHaveAccount") : t("noAccount")}
          <button
            onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}
            className="text-v-gold cursor-pointer bg-transparent border-none font-body"
          >
            {isRegister ? t("loginTab") : t("registerTab")}
          </button>
        </div>
      </div>
    </div>
  );
}
