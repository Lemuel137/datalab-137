ALTER TABLE "findings" ADD COLUMN "kind" text DEFAULT 'outro' NOT NULL;--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "origin" text DEFAULT 'conferido' NOT NULL;--> statement-breakpoint
ALTER TABLE "fronts" ADD COLUMN "engagement_min" real;--> statement-breakpoint
ALTER TABLE "fronts" ADD COLUMN "uses_engagement" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "followers" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "engagement_pct" real;--> statement-breakpoint
-- Parcerias não são avaliadas por engajamento no Instagram.
UPDATE "fronts" SET "uses_engagement" = false WHERE "slug" = 'parcerias-cardapio';--> statement-breakpoint
-- E-commerce: a régua por tamanho reprovou 24 de 24 lojas que anunciam (10/11/2026).
-- Piso baixo só para tirar perfil quase zerado (decisão do Lemuel, 19/11/2026).
UPDATE "fronts" SET "engagement_min" = 0.02 WHERE "slug" = 'ecommerce';--> statement-breakpoint
-- Importações antigas guardaram o "@" e a tela mostrava "@@".
UPDATE "leads" SET "instagram" = lower(ltrim("instagram", '@')) WHERE "instagram" LIKE '@%';
