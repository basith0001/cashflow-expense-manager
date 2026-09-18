import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' ORDER BY name"
  ).all();

  return Response.json({
    ok: true,
    database: "cashflow-db",
    tables: result.results,
  });
}
