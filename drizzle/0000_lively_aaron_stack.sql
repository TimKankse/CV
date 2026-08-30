CREATE TABLE `cv_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`document_json` text NOT NULL,
	`styles_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cv_documents_updated_at` ON `cv_documents` (`updated_at`);