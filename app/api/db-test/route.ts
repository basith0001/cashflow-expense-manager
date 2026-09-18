import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

type KV = {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
};

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const kv = (env as unknown as { KV?: KV }).KV;

    if (!kv) {
      return Response.json(
        {
          ok: false,
          error: "KV binding KV is not available in this Worker.",
          hint: "The Worker must be deployed with the KV binding declared in wrangler.jsonc.",
        },
        { status: 500 }
      );
    }

    const markerKey = "healthcheck";
    const existing = await kv.get(markerKey, "text");
    await kv.put(markerKey, new Date().toISOString());

    return Response.json({
      ok: true,
      storage: "Cloudflare KV",
      binding: "KV",
      healthcheck: existing ? "read-write confirmed" : "write confirmed",
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
