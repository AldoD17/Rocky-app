# Rocky — Controllo di gestione per ristoratori

App Next.js + Supabase + Claude AI.

## Setup locale

```bash
npm install
```

Crea il file `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=https://oamrocbawmvlgrauqyjn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la tua anon key da Supabase → Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<la tua service_role key>
ANTHROPIC_API_KEY=<la tua chiave API Anthropic>
ROCKY_ADMIN_SECRET=<secret per il dashboard admin — GET /api/admin/dashboard>
```

```bash
npm run dev
```

L'app gira su http://localhost:3000

## Deploy su Vercel

1. Carica il progetto su GitHub (crea un repo e fai push)
2. Vai su vercel.com → New Project → importa il repo
3. Aggiungi le 4 variabili d'ambiente in Vercel → Settings → Environment Variables
4. Deploy automatico

## Architettura

- `/src/app/api/chat/` → API route chat (sostituisce n8n WF1)
- `/src/app/api/turno/` → API route registrazione turno (sostituisce n8n WF2)
- `/src/components/auth/` → Login, registrazione, AuthProvider
- `/src/components/onboarding/` → Onboarding a step
- `/src/components/app/` → App shell con tab
- `/src/components/chat/` → Componente chat riutilizzabile
- `/src/components/ui/` → Componenti UI (Button, Bubble, Semaforo, etc.)
- `/src/lib/` → Supabase client, tipi, prompt di sistema
