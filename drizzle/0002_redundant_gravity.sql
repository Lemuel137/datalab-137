ALTER TABLE "fronts" ADD COLUMN "finding_policy" text DEFAULT 'conferido' NOT NULL;--> statement-breakpoint
ALTER TABLE "fronts" ADD COLUMN "message_template" text;--> statement-breakpoint
ALTER TABLE "fronts" ADD COLUMN "follow_up_template" text;--> statement-breakpoint
ALTER TABLE "fronts" ADD COLUMN "weekly_target" integer DEFAULT 25 NOT NULL;