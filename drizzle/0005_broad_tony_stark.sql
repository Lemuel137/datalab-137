ALTER TABLE "fronts" ADD COLUMN IF NOT EXISTS "templates_by_kind" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
-- O texto da frente delivery fala de cardápio: passa a valer só para o achado de cardápio.
-- Achado de outro tipo (avaliação sem resposta) só vira mensagem quando tiver texto próprio.
UPDATE "fronts"
SET "templates_by_kind" = jsonb_build_object('cardapio_fraco', "message_template"), "message_template" = NULL
WHERE "slug" = 'delivery' AND "message_template" IS NOT NULL;
