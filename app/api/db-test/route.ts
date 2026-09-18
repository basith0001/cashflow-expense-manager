import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

type DbEnv = {
  DB: {
    prepare: (query: string) => {
      all: () => Promise<{ results: Array<{ name: string }> }>;
    };
  };
};

export async function GET() {
  const { env } = getCloudflareContext();
  const db = (env as unknown as DbEnv).DB;

  const result = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' ORDER BY name"
  ).all();

  return Response.json({
    ok: true,
    database: "cashflow-db",
    tables: result.results,
  });
}
