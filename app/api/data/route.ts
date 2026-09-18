import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const STORES = ["transactions", "accounts", "clients", "loans", "borrowings", "recurring"] as const;
type Store = (typeof STORES)[number];

type KV = {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
};

type Env = {
  KV?: KV;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

function getEnv(): Env {
  return getCloudflareContext().env as unknown as Env;
}

function getKv(env: Env) {
  const kv = env.KV;
  if (!kv) throw new Error("Cloudflare KV binding KV is not available.");
  return kv;
}

function getSupabaseConfig(env: Env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, key };
}

async function getAuthenticatedUserId(request: Request, env: Env) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length);
  const { url, key } = getSupabaseConfig(env);

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: key,
    },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as { id?: string };
  return user.id || null;
}

function validStore(value: string | undefined | null): value is Store {
  return !!value && (STORES as readonly string[]).includes(value);
}

function keyFor(userId: string, store: Store) {
  return `user:${userId}:store:${store}`;
}

function legacyKeyFor(store: Store) {
  return `store:${store}`;
}

async function parseStore(raw: string | null) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function readStore(kv: KV, userId: string, store: Store) {
  const userKey = keyFor(userId, store);
  const existing = await kv.get(userKey, "text");
  if (existing !== null) return parseStore(existing);

  // One-time migration for the existing single-user app data.
  // The first authenticated account claims the legacy data; later accounts start clean.
  const legacyOwner = await kv.get("auth:legacy-owner", "text");
  const legacy = await kv.get(legacyKeyFor(store), "text");

  if ((legacyOwner === null || legacyOwner === userId) && legacy !== null) {
    if (legacyOwner === null) {
      await kv.put("auth:legacy-owner", userId);
    }
    await kv.put(userKey, legacy);
    return parseStore(legacy);
  }

  return [];
}

async function writeStore(kv: KV, userId: string, store: Store, items: unknown[]) {
  await kv.put(keyFor(userId, store), JSON.stringify(items));
}

export async function GET(request: Request) {
  try {
    const env = getEnv();
    const kv = getKv(env);
    const userId = await getAuthenticatedUserId(request, env);

    if (!userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = new URL(request.url);
    const store = url.searchParams.get("store");

    if (!validStore(store)) {
      return Response.json({ error: "Invalid store" }, { status: 400 });
    }

    return Response.json({ data: await readStore(kv, userId, store) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const kv = getKv(env);
    const userId = await getAuthenticatedUserId(request, env);

    if (!userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as { store?: string; value?: unknown };

    if (
      !validStore(body.store) ||
      !body.value ||
      typeof body.value !== "object" ||
      Array.isArray(body.value)
    ) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const items = await readStore(kv, userId, body.store);
    const value = body.value as { id?: string };

    if (!value.id) {
      return Response.json({ error: "Item id is required" }, { status: 400 });
    }

    const index = items.findIndex((item) => item?.id === value.id);
    if (index >= 0) items[index] = body.value;
    else items.push(body.value);

    await writeStore(kv, userId, body.store, items);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const env = getEnv();
    const kv = getKv(env);
    const userId = await getAuthenticatedUserId(request, env);

    if (!userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = new URL(request.url);
    const store = url.searchParams.get("store");
    const id = url.searchParams.get("id");

    if (!validStore(store) || !id) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const items = await readStore(kv, userId, store);
    const filtered = items.filter((item) => item?.id !== id);

    await writeStore(kv, userId, store, filtered);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
