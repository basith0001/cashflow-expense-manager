import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const STORES = ["transactions", "accounts", "clients", "loans", "borrowings", "recurring"] as const;
type Store = (typeof STORES)[number];

type KV = {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
};

type Env = { KV?: KV };

function getEnv(): Env {
  return getCloudflareContext().env as unknown as Env;
}

function getKv(env: Env): KV {
  if (!env.KV) throw new Error("Cloudflare KV binding KV is not available.");
  return env.KV;
}

function validStore(value: string | null): value is Store {
  return !!value && (STORES as readonly string[]).includes(value);
}

function keyFor(store: Store) {
  return `store:${store}`;
}

async function readStore(kv: KV, store: Store): Promise<any[]> {
  const raw = await kv.get(keyFor(store), "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(kv: KV, store: Store, items: unknown[]) {
  await kv.put(keyFor(store), JSON.stringify(items));
}

export async function GET(request: Request) {
  try {
    const kv = getKv(getEnv());
    const store = new URL(request.url).searchParams.get("store");

    if (!validStore(store)) {
      return Response.json({ error: "Invalid store" }, { status: 400 });
    }

    return Response.json({ data: await readStore(kv, store) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const kv = getKv(getEnv());
    const body = (await request.json()) as { store?: string; value?: unknown };

    if (!validStore(body.store) || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const items = await readStore(kv, body.store);
    const value = body.value as { id?: string };

    if (!value.id) {
      return Response.json({ error: "Item id is required" }, { status: 400 });
    }

    const index = items.findIndex((item) => item && typeof item === "object" && "id" in item && item.id === value.id);
    if (index >= 0) items[index] = body.value;
    else items.push(body.value);

    await writeStore(kv, body.store, items);
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
    const kv = getKv(getEnv());
    const url = new URL(request.url);
    const store = url.searchParams.get("store");
    const id = url.searchParams.get("id");

    if (!validStore(store) || !id) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const items = await readStore(kv, store);
    const filtered = items.filter((item) => !(item && typeof item === "object" && "id" in item && item.id === id));

    await writeStore(kv, store, filtered);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
