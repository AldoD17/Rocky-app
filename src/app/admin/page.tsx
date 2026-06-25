'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Metric,
  Text,
  Title,
  BadgeDelta,
  Badge,
  BarChart,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Grid,
  Col,
  Divider,
} from '@tremor/react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DailyPoint = { date: string; count: number };

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
  tab_distribution: { tab: string; count: number }[];
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

function d7Color(pct: number): string {
  if (pct >= 40) return 'text-emerald-600';
  if (pct >= 20) return 'text-amber-600';
  return 'text-red-600';
}

function northStarColor(val: number): string {
  if (val >= 5) return 'text-emerald-600';
  if (val >= 3) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;
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
      setUserBriefing("Errore nel caricamento dell'analisi.");
    } finally {
      setLoadingUserBriefing(false);
    }
  };

  const sortedUsers = data?.users
    ? [...data.users].sort((a, b) => (b.last_active ?? '').localeCompare(a.last_active ?? ''))
    : [];

  // Chart data helpers
  const shiftsChartData = (data?.growth?.daily_shifts ?? []).map((p) => ({
    date: p.date.slice(5),
    'Turni': p.count,
  }));
  const messagesChartData = (data?.growth?.daily_messages ?? []).map((p) => ({
    date: p.date.slice(5),
    'Messaggi': p.count,
  }));

  // Delta helpers (compare last 30 vs prior 30 for shifts)
  const shiftsLast30 = data?.growth?.daily_shifts?.reduce((s, p) => s + p.count, 0) ?? 0;
  const messagesLast30 = data?.growth?.daily_messages?.reduce((s, p) => s + p.count, 0) ?? 0;

  const d7Ret = data?.retention?.d7_retention ?? 0;
  const northStar = data?.engagement?.north_star ?? 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Rocky</span>
            <Badge color="gray" size="xs">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Text className="text-gray-500">
              {loadingData ? 'Caricamento…' : `Aggiornato: ${fmtDateTime(lastRefresh)}`}
            </Text>
            <button
              onClick={fetchAll}
              disabled={loadingData}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loadingData ? 'Aggiornamento…' : '↻ Aggiorna'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Error ── */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            Errore nel caricamento dati: {fetchError}
          </div>
        )}

        {/* ── Briefing ── */}
        <Card className="border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✨</span>
            <Title className="text-amber-900">Briefing del giorno</Title>
          </div>
          {loadingBriefing ? (
            <div className="space-y-2">
              <SkeletonLine h="h-4" w="w-full" />
              <SkeletonLine h="h-4" w="w-5/6" />
              <SkeletonLine h="h-4" w="w-4/6" />
            </div>
          ) : briefing ? (
            <Text className="text-amber-900 leading-relaxed whitespace-pre-wrap">{briefing}</Text>
          ) : (
            <Text className="text-amber-700 italic">Briefing non disponibile.</Text>
          )}
        </Card>

        {/* ── KPI Row ── */}
        <div>
          <Title className="mb-3 text-gray-500 uppercase text-xs tracking-wide font-semibold">Overview</Title>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
            <Card>
              <Text>Utenti totali</Text>
              <div className="flex items-end justify-between mt-1">
                <Metric>{loadingData ? '—' : (data?.overview?.total_users ?? '—')}</Metric>
                {!loadingData && data?.overview && (
                  <BadgeDelta deltaType="increase" size="xs">questo mese</BadgeDelta>
                )}
              </div>
            </Card>

            <Card>
              <Text>Turni registrati</Text>
              <div className="flex items-end justify-between mt-1">
                <Metric>{loadingData ? '—' : (data?.overview?.total_shifts ?? '—')}</Metric>
                {!loadingData && (
                  <BadgeDelta deltaType={shiftsLast30 > 0 ? 'increase' : 'unchanged'} size="xs">
                    {shiftsLast30} 30gg
                  </BadgeDelta>
                )}
              </div>
            </Card>

            <Card>
              <Text>D7 Retention</Text>
              <div className="flex items-end justify-between mt-1">
                <Metric className={loadingData ? '' : d7Color(d7Ret)}>
                  {loadingData ? '—' : `${d7Ret}%`}
                </Metric>
                {!loadingData && (
                  <BadgeDelta
                    deltaType={d7Ret >= 40 ? 'increase' : d7Ret >= 20 ? 'unchanged' : 'decrease'}
                    size="xs"
                  >
                    dopo 7gg
                  </BadgeDelta>
                )}
              </div>
            </Card>

            <Card>
              <Text>North Star</Text>
              <div className="flex items-end justify-between mt-1">
                <Metric className={loadingData ? '' : northStarColor(northStar)}>
                  {loadingData ? '—' : northStar.toFixed(1)}
                </Metric>
                {!loadingData && (
                  <BadgeDelta
                    deltaType={northStar >= 5 ? 'increase' : northStar >= 3 ? 'unchanged' : 'decrease'}
                    size="xs"
                  >
                    turni/utente/sett
                  </BadgeDelta>
                )}
              </div>
            </Card>
          </Grid>
        </div>

        {/* ── Charts Row ── */}
        {mounted && data?.growth && (
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4">
            <Card>
              <Title>Turni — ultimi 30 giorni</Title>
              <Text>{shiftsLast30} turni totali nel periodo</Text>
              <BarChart
                className="mt-4 h-40"
                data={shiftsChartData}
                index="date"
                categories={['Turni']}
                colors={['teal']}
                showLegend={false}
                showGridLines={false}
                yAxisWidth={30}
              />
            </Card>
            <Card>
              <Title>Messaggi — ultimi 30 giorni</Title>
              <Text>{messagesLast30} messaggi totali nel periodo</Text>
              <BarChart
                className="mt-4 h-40"
                data={messagesChartData}
                index="date"
                categories={['Messaggi']}
                colors={['violet']}
                showLegend={false}
                showGridLines={false}
                yAxisWidth={30}
              />
            </Card>
          </Grid>
        )}

        {/* ── Retention Row ── */}
        <Grid numItemsSm={3} numItemsLg={3} className="gap-4">
          <Card>
            <Text>D1 Retention</Text>
            <Metric className="mt-1">{loadingData ? '—' : `${data?.retention?.d1_retention ?? 0}%`}</Metric>
            <Text className="mt-1 text-gray-400">dopo giorno 1</Text>
          </Card>
          <Card>
            <Text>Attivi ultimi 7 giorni</Text>
            <Metric className="mt-1">{loadingData ? '—' : (data?.retention?.active_last_7_days ?? '—')}</Metric>
            <Text className="mt-1 text-gray-400">ristoranti unici</Text>
          </Card>
          <Card>
            <Text>Churned</Text>
            <Metric
              className={`mt-1 ${!loadingData && (data?.retention?.churned ?? 0) > 0 ? 'text-red-600' : ''}`}
            >
              {loadingData ? '—' : (data?.retention?.churned ?? '—')}
            </Metric>
            <Text className="mt-1 text-gray-400">inattivi da 14gg+</Text>
          </Card>
        </Grid>

        <Divider />

        {/* ── Users Table ── */}
        {data?.users && (
          <div>
            <Title className="mb-3">Utenti ({sortedUsers.length})</Title>
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Ristorante</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Piano</TableHeaderCell>
                    <TableHeaderCell>Stato</TableHeaderCell>
                    <TableHeaderCell className="text-right">Turni totali</TableHeaderCell>
                    <TableHeaderCell className="text-right">7gg</TableHeaderCell>
                    <TableHeaderCell className="text-right">Ultima attività</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedUsers.map((u) => {
                    const isSelected = selectedUser?.restaurant_id === u.restaurant_id;
                    return (
                      <>
                        <TableRow
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
                            'cursor-pointer transition-colors',
                            u.is_churned ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50',
                            isSelected ? 'ring-2 ring-inset ring-gray-900' : '',
                          ].join(' ')}
                        >
                          <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                            {u.restaurant_name}
                          </TableCell>
                          <TableCell className="text-gray-600 whitespace-nowrap">
                            {u.user_email ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              color={u.plan === 'pro' ? 'amber' : u.plan === 'base' ? 'blue' : 'gray'}
                              size="xs"
                            >
                              {u.plan ?? 'free'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge color={u.is_churned ? 'red' : 'green'} size="xs">
                              {u.is_churned ? 'Inattivo' : 'Attivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{u.total_shifts}</TableCell>
                          <TableCell className="text-right">{u.shifts_last_7_days}</TableCell>
                          <TableCell className="text-right text-gray-500 whitespace-nowrap">
                            {fmtDate(u.last_active)}
                          </TableCell>
                        </TableRow>

                        {/* Inline detail panel */}
                        {isSelected && (
                          <TableRow key={`${u.restaurant_id}-detail`} className="bg-gray-50">
                            <TableCell colSpan={7} className="px-4 py-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <Grid numItemsSm={2} numItemsLg={4} className="gap-2 flex-1">
                                  <Card className="p-3">
                                    <Text className="text-xs text-gray-500">Iscritto</Text>
                                    <Text className="font-semibold text-gray-900">{fmtDate(u.created_at)}</Text>
                                  </Card>
                                  <Card className="p-3">
                                    <Text className="text-xs text-gray-500">Onboarding</Text>
                                    <Text className="font-semibold text-gray-900">Step {u.onboarding_step}</Text>
                                  </Card>
                                  <Card className="p-3">
                                    <Text className="text-xs text-gray-500">Msg 7gg</Text>
                                    <Text className="font-semibold text-gray-900">{u.messages_last_7_days}</Text>
                                  </Card>
                                  <Card className="p-3">
                                    <Text className="text-xs text-gray-500">Ultima attività</Text>
                                    <Text className="font-semibold text-gray-900">{fmtDate(u.last_active)}</Text>
                                  </Card>
                                </Grid>
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
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
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
