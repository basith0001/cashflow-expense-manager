import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const STORES = ["transactions", "accounts", "clients", "loans", "recurring"] as const;
type Store = (typeof STORES)[number];

type DB = { prepare: (query: string) => any };

function getDb() {
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: DB }).DB;
  if (!db) throw new Error("Cloudflare D1 binding DB is not available.");
  return db;
}

async function ensureTable(db: DB) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS app_data (
      store TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
}

function validStore(value: string | null): value is Store {
  return !!value && (STORES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    await ensureTable(db);
    const url = new URL(request.url);
    const store = url.searchParams.get("store");
    if (!validStore(store)) return Response.json({ error: "Invalid store" }, { status: 400 });

    const row = await db.prepare("SELECT data FROM app_data WHERE store = ?").bind(store).first() as {data:string} | null;
    return Response.json({ data: row ? JSON.parse(row.data) : [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    await ensureTable(db);
    const body = await request.json() as {store?: string; value?: unknown};
    if (!validStore(body.store) || !body.value || typeof body.value !== "object") {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const existing = await db.prepare("SELECT data FROM app_data WHERE store = ?").bind(body.store).first<{data:string}>();
    const items = existing ? JSON.parse(existing.data) : [];
    const index = items.findIndex((x:any) => x?.id === (body.value as any).id);
    if (index >= 0) items[index] = body.value;
    else items.push(body.value);
    await db.prepare("INSERT INTO app_data(store,data,updated_at) VALUES(?,?,?) ON CONFLICT(store) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at")
      .bind(body.store, JSON.stringify(items), new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    await ensureTable(db);
    const url = new URL(request.url);
    const store = url.searchParams.get("store");
    const id = url.searchParams.get("id");
    if (!validStore(store) || !id) return Response.json({ error: "Invalid request" }, { status: 400 });
    const row = await db.prepare("SELECT data FROM app_data WHERE store = ?").bind(store).first<{data:string}>();
    if (!row) return Response.json({ ok: true });
    const items = JSON.parse(row.data).filter((x:any) => x?.id !== id);
    await db.prepare("INSERT INTO app_data(store,data,updated_at) VALUES(?,?,?) ON CONFLICT(store) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at")
      .bind(store, JSON.stringify(items), new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
