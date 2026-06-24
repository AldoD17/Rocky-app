'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// ─── Types ───────────────────────────────────────────────────────────────────

type DailyPoint = { date: string; count: number };
type TabCount = { tab: string; count: number };

type Overview = {
  total_users: number;
  total_restaurants: number;
  total_shifts: number;
  total_conversations: number;
  total_expenses: number;
  date_generated: string;
} | null;

type Growth = {
  daily_signups: DailyPoint[];
  daily_shifts: DailyPoint[];
  daily_messages: DailyPoint[];
} | null;

type Retention = {
  d1_retention: number;
  d7_retention: number;
  d30_retention: number;
  active_last_7_days: number;
  active_last_30_days: number;
  churned: number;
} | null;

type Engagement = {
  avg_shifts_per_active_user_week: number;
  avg_messages_per_active_user_day: number;
  tab_distribution: TabCount[];
  north_star: number;
} | null;

type UserRow = {
  restaurant_id: string;
  restaurant_name: string;
  user_email: string | null;
  plan: string | null;
  created_at: string;
  onboarding_step: number;
  total_shifts: number;
  total_messages: number;
  last_active: string | null;
  shifts_last_7_days: number;
  messages_last_7_days: number;
  is_churned: boolean;
};

type DashboardData = {
  overview: Overview;
  growth: Growth;
  retention: Retention;
  engagement: Engagement;
  users: UserRow[] | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function planBadge(plan: string | null) {
  const colors: Record<string, string> = {
    pro: 'bg-purple-100 text-purple-800',
    base: 'bg-blue-100 text-blue-800',
    free: 'bg-gray-100 text-gray-600',
  };
  const cls = colors[plan ?? 'free'] ?? colors.free;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{plan ?? 'free'}</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;
}

function GrowthChart({
  label,
  points,
  color,
}: {
  label: string;
  points: DailyPoint[];
  color: { bg: string; border: string };
}) {
  const labels = points.map((p) => p.date.slice(5));
  const counts = points.map((p) => p.count);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: counts,
              backgroundColor: color.bg,
              borderColor: color.border,
              borderWidth: 1,
              borderRadius: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}` } } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10 } } },
        }}
        height={80}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [briefing, setBriefing] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userBriefing, setUserBriefing] = useState('');
  const [loadingUserBriefing, setLoadingUserBriefing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    setLoadingBriefing(true);
    setBriefing('');
    setFetchError(null);
    setSelectedUser(null);
    setUserBriefing('');

    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setLoadingData(false);

      // Fetch briefing after data is ready
      try {
        const br = await fetch('/api/admin/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: json }),
        });
        if (br.ok) {
          const { briefing: text } = await br.json();
          setBriefing(text);
        }
      } catch {
        setBriefing('Errore nel caricamento del briefing.');
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setLoadingData(false);
    } finally {
      setLoadingBriefing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const analyzeUser = async (user: UserRow) => {
    setLoadingUserBriefing(true);
    setUserBriefing('');
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: user, focus: 'single_user' }),
      });
      if (res.ok) {
        const { briefing: text } = await res.json();
        setUserBriefing(text);
      }
    } catch {
      setUserBriefing('Errore nel caricamento dell\'analisi.');
    } finally {
      setLoadingUserBriefing(false);
    }
  };

  const sortedUsers = data?.users
    ? [...data.users].sort((a, b) => (b.last_active ?? '').localeCompare(a.last_active ?? ''))
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Rocky</span>
            <span className="text-xs font-semibold bg-gray-900 text-white rounded-full px-2 py-0.5">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {loadingData ? 'Caricamento…' : `Aggiornato: ${fmtDateTime(lastRefresh)}`}
            </span>
            <button
              onClick={fetchAll}
              disabled={loadingData}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loadingData ? 'Aggiornamento…' : '↻ Aggiorna'}
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            Errore nel caricamento dati: {fetchError}
          </div>
        )}

        {/* ── Briefing ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-amber-900 mb-3">Briefing del giorno</p>
          {loadingBriefing ? (
            <div className="space-y-2">
              <SkeletonLine h="h-4" w="w-full" />
              <SkeletonLine h="h-4" w="w-5/6" />
              <SkeletonLine h="h-4" w="w-4/6" />
              <SkeletonLine h="h-4" w="w-full" />
              <SkeletonLine h="h-4" w="w-3/4" />
            </div>
          ) : briefing ? (
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{briefing}</p>
          ) : (
            <p className="text-sm text-amber-700 italic">Briefing non disponibile.</p>
          )}
        </div>

        {/* ── KPI Overview ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Utenti totali" value={data?.overview?.total_users ?? '—'} />
            <KpiCard label="Ristoranti" value={data?.overview?.total_restaurants ?? '—'} />
            <KpiCard label="Turni totali" value={data?.overview?.total_shifts ?? '—'} />
            <KpiCard label="Conversazioni" value={data?.overview?.total_conversations ?? '—'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <KpiCard label="D1 Retention" value={data?.retention != null ? `${data.retention.d1_retention}%` : '—'} sub="dopo giorno 1" />
            <KpiCard label="D7 Retention" value={data?.retention != null ? `${data.retention.d7_retention}%` : '—'} sub="dopo giorno 7" />
            <KpiCard label="Attivi 7gg" value={data?.retention?.active_last_7_days ?? '—'} sub="ristoranti unici" />
            <KpiCard
              label="North Star"
              value={data?.engagement != null ? data.engagement.north_star.toFixed(1) : '—'}
              sub="turni/utente/sett"
            />
          </div>
        </div>

        {/* ── Growth Charts ── */}
        {mounted && data?.growth && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Crescita — ultimi 30 giorni</h2>
            <div className="space-y-3">
              <GrowthChart
                label="Nuovi utenti"
                points={data.growth.daily_signups}
                color={{ bg: 'rgba(59,130,246,0.5)', border: 'rgb(59,130,246)' }}
              />
              <GrowthChart
                label="Turni registrati"
                points={data.growth.daily_shifts}
                color={{ bg: 'rgba(34,197,94,0.5)', border: 'rgb(34,197,94)' }}
              />
              <GrowthChart
                label="Messaggi inviati"
                points={data.growth.daily_messages}
                color={{ bg: 'rgba(168,85,247,0.5)', border: 'rgb(168,85,247)' }}
              />
            </div>
          </div>
        )}

        {/* ── Users Table ── */}
        {data?.users && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Utenti ({sortedUsers.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ristorante</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Piano</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Stato</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Turni</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Msg</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Turni 7gg</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ultima attività</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u) => {
                      const isSelected = selectedUser?.restaurant_id === u.restaurant_id;
                      return (
                        <>
                          <tr
                            key={u.restaurant_id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedUser(null);
                                setUserBriefing('');
                              } else {
                                setSelectedUser(u);
                                setUserBriefing('');
                              }
                            }}
                            className={[
                              'border-b border-gray-100 cursor-pointer transition-colors',
                              u.is_churned ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50',
                              isSelected ? 'ring-2 ring-inset ring-gray-900' : '',
                            ].join(' ')}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {u.restaurant_name}
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{u.user_email ?? '—'}</td>
                            <td className="px-4 py-3">{planBadge(u.plan)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  u.is_churned
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {u.is_churned ? 'Inattivo' : 'Attivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">{u.total_shifts}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{u.total_messages}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{u.shifts_last_7_days}</td>
                            <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                              {fmtDate(u.last_active)}
                            </td>
                          </tr>

                          {/* Inline detail panel */}
                          {isSelected && (
                            <tr key={`${u.restaurant_id}-detail`} className="bg-gray-50">
                              <td colSpan={8} className="px-4 py-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                  {/* Stats */}
                                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                                      <p className="text-xs text-gray-500">Iscritto</p>
                                      <p className="text-sm font-semibold text-gray-900">{fmtDate(u.created_at)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                                      <p className="text-xs text-gray-500">Onboarding</p>
                                      <p className="text-sm font-semibold text-gray-900">Step {u.onboarding_step}</p>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                                      <p className="text-xs text-gray-500">Msg 7gg</p>
                                      <p className="text-sm font-semibold text-gray-900">{u.messages_last_7_days}</p>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                                      <p className="text-xs text-gray-500">Ultima attività</p>
                                      <p className="text-sm font-semibold text-gray-900">{fmtDate(u.last_active)}</p>
                                    </div>
                                  </div>

                                  {/* Analyse button + result */}
                                  <div className="sm:w-56 flex flex-col gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); analyzeUser(u); }}
                                      disabled={loadingUserBriefing}
                                      className="w-full px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    >
                                      {loadingUserBriefing ? 'Analisi…' : 'Analizza questo utente'}
                                    </button>
                                    {userBriefing && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">
                                        {userBriefing}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {loadingData && !data && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonLine key={i} h="h-12" />
            ))}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 pb-4">
          Rocky Admin · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
