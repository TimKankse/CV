import { desc, eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import { cvDocuments } from "../../../db/schema";

type CvPayload = {
  id?: string;
  title?: string;
  document?: unknown;
  styles?: unknown;
  createdAt?: number;
  updatedAt?: number;
};

function serialize(row: typeof cvDocuments.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    document: JSON.parse(row.documentJson),
    styles: JSON.parse(row.stylesJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validate(payload: CvPayload) {
  const id = payload.id?.trim();
  const title = payload.title?.trim() || "Untitled CV";
  const document = payload.document as { sections?: unknown[] } | undefined;
  if (!id || !document?.sections || !payload.styles) return null;
  const now = Date.now();
  return {
    id,
    title,
    documentJson: JSON.stringify(payload.document),
    stylesJson: JSON.stringify(payload.styles),
    createdAt: Number.isFinite(payload.createdAt) ? Number(payload.createdAt) : now,
    updatedAt: Number.isFinite(payload.updatedAt) ? Number(payload.updatedAt) : now,
  };
}

export async function GET() {
  try {
    await ensureDatabase();
    const rows = await getDb().select().from(cvDocuments).orderBy(desc(cvDocuments.updatedAt));
    return Response.json({ cvs: rows.map(serialize) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load CVs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const values = validate((await request.json()) as CvPayload);
    if (!values) return Response.json({ error: "Invalid CV document" }, { status: 400 });
    await ensureDatabase();
    const [row] = await getDb()
      .insert(cvDocuments)
      .values(values)
      .onConflictDoUpdate({
        target: cvDocuments.id,
        set: { title: values.title, documentJson: values.documentJson, stylesJson: values.stylesJson, updatedAt: values.updatedAt },
      })
      .returning();
    return Response.json({ cv: serialize(row) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create CV" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const values = validate((await request.json()) as CvPayload);
    if (!values) return Response.json({ error: "Invalid CV document" }, { status: 400 });
    await ensureDatabase();
    const [row] = await getDb()
      .insert(cvDocuments)
      .values(values)
      .onConflictDoUpdate({
        target: cvDocuments.id,
        set: { title: values.title, documentJson: values.documentJson, stylesJson: values.stylesJson, updatedAt: values.updatedAt },
      })
      .returning();
    return Response.json({ cv: serialize(row) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save CV" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "CV id is required" }, { status: 400 });
    await ensureDatabase();
    await getDb().delete(cvDocuments).where(eq(cvDocuments.id, id));
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete CV" }, { status: 500 });
  }
}
