import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as unknown as { DB?: {
      prepare: (query: string) => {
        all: () => Promise<{ results: Array<{ name: string }> }>;
      };
    } }).DB;

    if (!db) {
      return Response.json(
        {
          ok: false,
          error: "D1 binding DB is not available in this Worker.",
          hint: "Check Cloudflare Worker > Settings > Bindings and make sure D1 variable DB is connected to cashflow-db, then redeploy.",
        },
        { status: 500 }
      );
    }

    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' ORDER BY name"
    ).all();

    return Response.json({
      ok: true,
      database: "cashflow-db",
      tables: result.results,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
