CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"message" text NOT NULL,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"replied_at" timestamp with time zone,
	"reply_kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"evidence_url" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"confidence" text DEFAULT 'media' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fronts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"channel" text NOT NULL,
	"daily_limit" integer DEFAULT 15 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fronts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"front_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"city" text,
	"site" text,
	"instagram" text,
	"phone" text,
	"whatsapp" text,
	"rating" text,
	"review_count" integer,
	"stage" text DEFAULT 'importado' NOT NULL,
	"source" text DEFAULT 'csv' NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_front_id_fronts_id_fk" FOREIGN KEY ("front_id") REFERENCES "public"."fronts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_lead_idx" ON "contacts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "findings_lead_idx" ON "findings" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "leads_front_idx" ON "leads" USING btree ("front_id");--> statement-breakpoint
CREATE INDEX "leads_stage_idx" ON "leads" USING btree ("stage");