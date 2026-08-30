import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cvDocuments = sqliteTable(
  "cv_documents",
  {
    id: text("id").primaryKey().notNull(),
    title: text("title").notNull(),
    documentJson: text("document_json").notNull(),
    stylesJson: text("styles_json").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_cv_documents_updated_at").on(table.updatedAt)],
);
