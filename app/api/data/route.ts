import { getClarezaUser } from "@/app/auth";
import { validate, Data } from "@/lib/finance";
import { env } from "cloudflare:workers";

function supabaseConfig() {
  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase não configurado");
  return { url: url.replace(/\/$/, ""), secret };
}

async function supabase(path: string, init?: RequestInit) {
  const { url, secret } = supabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      apikey: secret,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export async function GET() {
  const user = await getClarezaUser();
  if (!user) {
    return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  }

  try {
    const owner = encodeURIComponent(user.userId);
    const [userRes, accountsRes, cardsRes, entriesRes, reservesRes] = await Promise.all([
      supabase(`finance_users?select=revision,categories&id=eq.${owner}&limit=1`),
      supabase(`accounts?select=payload&owner=eq.${owner}`),
      supabase(`cards?select=payload&owner=eq.${owner}`),
      supabase(`entries?select=payload&owner=eq.${owner}`),
      supabase(`reserves?select=payload&owner=eq.${owner}`),
    ]);

    const responses = [userRes, accountsRes, cardsRes, entriesRes, reservesRes];
    const failed = responses.find((r) => !r.ok);
    if (failed) {
      console.error("Supabase GET failed:", failed.status, await failed.text());
      throw new Error("Falha ao consultar Supabase");
    }

    const [users, accounts, cards, entries, reserves] = await Promise.all(
      responses.map((r) => r.json() as Promise<any[]>)
    );

    const row = users[0];
    if (!row) throw new Error("Usuário financeiro não encontrado");

    return Response.json(
      {
        revision: row.revision,
        data: {
          accounts: accounts.map((r) => r.payload),
          cards: cards.map((r) => r.payload),
          entries: entries.map((r) => r.payload),
          reserves: reserves.map((r) => r.payload),
          categories: row.categories,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Não foi possível carregar seus dados. Tente novamente." },
      { status: 503 }
    );
  }
}

export async function PUT(req: Request) {
  const user = await getClarezaUser();
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });

  if (req.headers.get("origin") && new URL(req.headers.get("origin")!).host !== new URL(req.url).host) {
    return Response.json({ error: "Origem inválida" }, { status: 403 });
  }

  try {
    const body = await req.text();
    if (body.length > 4_000_000) throw new Error("Limite de registros por operação excedido");

    const { data, revision } = JSON.parse(body) as { data: Data; revision: number };
    if (!Number.isInteger(revision) || !Array.isArray(data.categories)) {
      throw new Error("Dados inválidos");
    }

    validate(data);

    const response = await supabase("rpc/clareza_replace_data", {
      method: "POST",
      body: JSON.stringify({
        p_owner: user.userId,
        p_revision: revision,
        p_categories: data.categories,
        p_accounts: data.accounts,
        p_cards: data.cards,
        p_entries: data.entries,
        p_reserves: data.reserves,
      }),
    });

    if (!response.ok) {
      console.error("Supabase PUT failed:", response.status, await response.text());
      throw new Error("Não foi possível salvar no banco");
    }

    const nextRevision = await response.json() as number;

    if (nextRevision === -1) {
      return Response.json(
        { error: "Seus dados mudaram em outra aba. Recarregue a página antes de salvar." },
        { status: 409 }
      );
    }

    return Response.json({ revision: nextRevision });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Não foi possível salvar." },
      { status: 400 }
    );
  }
}
