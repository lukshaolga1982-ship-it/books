const schema = `CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`;

async function database() {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(schema).run();
  return env.DB;
}

export async function GET() {
  const db = await database();
  const row = await db.prepare("SELECT payload FROM app_state WHERE id = 1").first<{ payload: string }>();
  return Response.json(row ? JSON.parse(row.payload) : { units: [], customItems: [] });
}

export async function PUT(request: Request) {
  const db = await database();
  const payload = await request.json() as { units?: unknown[]; customItems?: unknown[] };
  if (!Array.isArray(payload.units) || !Array.isArray(payload.customItems)) return Response.json({ error: "Некорректные данные" }, { status: 400 });
  await db.prepare(`INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`).bind(JSON.stringify(payload)).run();
  return Response.json({ ok: true });
}
