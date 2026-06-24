import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ALLOWED_ORIGINS = [
  'https://rocky-app-six.vercel.app',
  'http://localhost:3000',
  'http://localhost:3099',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    Vary: 'Origin',
  };
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ROCKY_ADMIN_SECRET;
  if (!secret) return false;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return req.cookies.get('rocky_admin_session')?.value === secret;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get('origin'));

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const { data, focus } = await req.json();
    const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

    const userPrompt =
      focus === 'single_user'
        ? `Analizza questo ristoratore e dimmi: sta usando Rocky bene? Cosa rischia? Cosa dovrei fare per aumentare il suo engagement? Dati: ${JSON.stringify(data)}`
        : `Oggi è ${today}. Analizza questi dati di Rocky e forniscimi:\n1. STATO GENERALE (2 righe): come stiamo andando oggi vs ieri\n2. UTENTI A RISCHIO CHURN: chi non usa Rocky da più di 7 giorni e cosa fare\n3. TREND POSITIVI: cosa sta funzionando bene\n4. PRIORITÀ OGGI: 2-3 azioni concrete che devo fare oggi\n5. METRICA DA MONITORARE: il numero più importante da tenere d'occhio questa settimana\n\nDati: ${JSON.stringify(data)}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'Sei il chief of staff di Rocky, un SaaS B2B per ristoratori indipendenti italiani. Analizzi i dati operativi e fornisci briefing concisi, diretti e azionabili in italiano. Tono: professionale, diretto, come un analyst che parla al CEO. Niente fronzoli.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const briefing = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    return NextResponse.json({ briefing }, { headers: cors });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: cors });
  }
}
