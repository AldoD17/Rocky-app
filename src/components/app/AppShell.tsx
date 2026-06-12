"use client";
import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChatView, type QuickButton, type ChatViewHandle } from "@/components/chat/ChatView";
import { WeekCalendar } from "@/components/app/WeekCalendar";
import { MonthSummary } from "@/components/app/MonthSummary";
import { YearSummary } from "@/components/app/YearSummary";
import { EmployeePanel, type WorkerEntry } from "@/components/app/EmployeePanel";
import { Dashboard } from "@/components/app/Dashboard";
import { Mascot, SuggestChip } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";import type { ChatResponse } from "@/lib/types";

type TabId = "day" | "week" | "month" | "year" | "learn";

interface Message { role: "bot" | "user"; content: string; }


function getGreeting() {
  const h = new Date().getHours();
  return { h, isLunch: h >= 6 && h < 16 };
}

export function AppShell({ onSettings }: { onSettings: () => void }) {
  const { restaurant, user } = useAuth();
  const t = useTranslations("App");
  const tC = useTranslations("Common");
  const locale = useLocale();
  const LEARN_CHIPS = t("learnChips").split(",");
  const [tab, setTab] = useState<TabId>("day");
  const [loading, setLoading] = useState(false);
  const [chatState, setChatState] = useState<Record<string, Message[]>>({});
  const [showEmployeePanel, setShowEmployeePanel] = useState(false);
  const [pendingWorkers, setPendingWorkers] = useState<WorkerEntry[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);

  const chatViewRef = useRef<ChatViewHandle>(null);
  const restaurantId = restaurant?.id;
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  const TABS = [
    { id: "day" as TabId,   icon: "ti-calendar-event",  label: t("tabDay")   },
    { id: "week" as TabId,  icon: "ti-chart-bar",        label: t("tabWeek")  },
    { id: "month" as TabId, icon: "ti-report-analytics", label: t("tabMonth") },
    { id: "year" as TabId,  icon: "ti-trending-up",      label: t("tabYear")  },
    { id: "learn" as TabId, icon: "ti-school",           label: t("tabLearn") },
  ];

  const QUICK_BUTTONS: QuickButton[] = [
    { label: `💰 ${t("qbRevenue")}`,          prefix: `💰 ${t("qbRevenue")}: `          },
    { label: `🧾 ${t("qbReceipts")}`,         prefix: `🧾 ${t("qbReceipts")}: `         },
    { label: `🍽️ ${t("qbCovers")}`,          prefix: `🍽️ ${t("qbCovers")}: `          },
    { label: `⏱️ ${t("qbServiceHours")}`,    prefix: `⏱️ ${t("qbServiceHours")}: `    },
    { label: `👥 ${t("qbEmployees")}`,        prefix: `👥 ${t("qbEmployees")}: `,       onClick: () => setShowEmployeePanel(true) },
    { label: `🕐 ${t("qbShiftHours")}`,      prefix: `🕐 ${t("qbShiftHours")}: `      },
    { label: `📦 ${t("qbPurchases")}`,        prefix: `📦 ${t("qbPurchases")}: `        },
  ];

  const getInitialMessages = useCallback((tId: TabId): Message[] => {
    const { isLunch } = getGreeting();
    const service = isLunch ? t("serviceLunch") : t("serviceDinner");
    const boldName = firstName ? `<strong>${firstName}</strong>` : "";
    const boldService = `<strong>${service}</strong>`;

    const dayLine1 = firstName
      ? t("greetingDayLine1Name",   { name: boldName, service: boldService })
      : t("greetingDayLine1NoName", { service: boldService });
    const learnLine1 = firstName
      ? t("greetingLearnLine1Name",   { name: boldName })
      : t("greetingLearnLine1NoName");

    const msgs: Record<TabId, string> = {
      day:   `${dayLine1}<br><br>${t("greetingDayLine2")}`,
      week:  firstName ? t("greetingWeekName",  { name: boldName }) : t("greetingWeekNoName"),
      month: firstName ? t("greetingMonthName", { name: boldName }) : t("greetingMonthNoName"),
      year:  firstName ? t("greetingYearName",  { name: boldName }) : t("greetingYearNoName"),
      learn: `${learnLine1}<br><br>${t("greetingLearnLine2")}`,
    };
    return [{ role: "bot", content: msgs[tId] }];
  }, [firstName, t]);

  const getMessages = (tId: TabId) => chatState[tId] || getInitialMessages(tId);

  const sendMessage = async (text: string) => {
    if (!restaurantId) return;
    const currentTab = tab;
    const prev = getMessages(currentTab);
    const withUser = [...prev, { role: "user" as const, content: text }];
    setChatState((s) => ({ ...s, [currentTab]: withUser }));
    setLoading(true);

    try {
      const endpoint = currentTab === "day" ? "/api/turno" : "/api/chat";
      const body = currentTab === "day"
        ? { restaurant_id: restaurantId, user_message: text, locale, shift_workers: pendingWorkers.map(w => ({ employee_id: w.employee_id, hours_worked: w.hours_worked })) }
        : { restaurant_id: restaurantId, user_message: text, tab: currentTab, locale };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: ChatResponse & { status: string; parsed_data?: Record<string, unknown> | null } = await res.json();

      if (data.status !== "error") {
        setChatState((s) => ({
          ...s,
          [currentTab]: [...(s[currentTab] || withUser), { role: "bot", content: data.message }],
        }));
        if (currentTab === "day") setPendingWorkers([]);
      } else {
        setChatState((s) => ({
          ...s,
          [currentTab]: [...(s[currentTab] || withUser), { role: "bot", content: "⚠️ " + (data.message || t("../../Common.error")) }],
        }));
      }
    } catch {
      setChatState((s) => ({
        ...s,
        [currentTab]: [...(s[currentTab] || withUser), { role: "bot", content: "⚠️ " + tC("connectionError") }],
      }));
    }
    setLoading(false);
  };

  const tabLabels: Record<TabId, string> = {
    day:   t("headerDay"),
    week:  t("headerWeek"),
    month: t("headerMonth"),
    year:  t("headerYear"),
    learn: t("headerLearn"),
  };

  const headerSlot: React.ReactNode =
    tab === "week"  ? <WeekCalendar /> :
    tab === "month" ? <MonthSummary /> :
    tab === "year"  ? <YearSummary /> :
    tab === "learn" ? (
      <div className="flex gap-2 flex-wrap mb-3">
        {LEARN_CHIPS.map((chip) => (
          <SuggestChip key={chip} label={chip} onClick={() => sendMessage(chip)} />
        ))}
      </div>
    ) : undefined;

  return (
    <div className="flex flex-col h-full">
      {showEmployeePanel && (
        <EmployeePanel
          onConfirm={(formattedText, workers) => {
            setPendingWorkers(workers);
            chatViewRef.current?.appendText(formattedText);
            setShowEmployeePanel(false);
          }}
          onClose={() => setShowEmployeePanel(false)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-[52px] pb-3 border-b border-v-line bg-v-panel shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDashboard((v) => !v)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <Mascot size={28} />
            <div className="text-left">
              <div className="font-display text-v-cream text-[16px]">
                {showDashboard ? t("headerDashboard") : tabLabels[tab]}
              </div>
              <div className="text-v-muted text-[11px] font-body mt-0.5">
                {restaurant?.name || t("venueFallback")}
              </div>
            </div>
          </button>
          <button onClick={onSettings} className="text-v-muted cursor-pointer hover:text-v-gold transition-colors duration-150 w-9 h-9 flex items-center justify-center">
            <i className="ti ti-settings" style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {showDashboard ? (
        <Dashboard />
      ) : (
        <ChatView
          ref={chatViewRef}
          messages={getMessages(tab)}
          onSend={sendMessage}
          loading={loading}
          placeholder={tab === "learn" ? t("placeholderLearn") : t("placeholderChat")}
          quickButtons={tab === "day" ? QUICK_BUTTONS : undefined}
          headerSlot={headerSlot}
        />
      )}

      {/* Spacer: same height as the fixed tab bar so content isn't hidden behind it */}
      <div
        className="shrink-0"
        style={{ height: 'calc(56px + max(env(safe-area-inset-bottom, 0px), 8px))' }}
        aria-hidden="true"
      />

      {/* Bottom nav — fixed to viewport bottom, padding handles safe-area home indicator */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-v-line bg-v-panel px-1 pt-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {TABS.map((tItem) => (
          <button
            key={tItem.id}
            onClick={() => { setTab(tItem.id); setShowDashboard(false); }}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 cursor-pointer border-t-2 transition-all duration-150 ${
              !showDashboard && tab === tItem.id
                ? "text-v-gold font-semibold border-v-gold"
                : "text-v-muted border-transparent"
            }`}
          >
            <i className={`ti ${tItem.icon}`} style={{ fontSize: 20, lineHeight: 1 }} />
            <span className="text-[10px] font-body">{tItem.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
