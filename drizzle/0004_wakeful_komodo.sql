ALTER TABLE "findings" ADD COLUMN IF NOT EXISTS "hook_by" text;--> statement-breakpoint
-- Frente de delivery (pizzaria): entra pelo Captor, achado remedido por script.
INSERT INTO "fronts" ("name", "slug", "channel", "daily_limit", "active", "uses_engagement", "finding_policy", "weekly_target", "message_template", "follow_up_template")
VALUES (
  'Delivery (pizzaria)', 'delivery', 'whatsapp', 20, true, false, 'script', 25,
  E'Oi! Vi {gancho} e fui abrir o cardápio como quem vai pedir. Reparei que {achado}.\n\nComo o anúncio leva direto para lá, {cliente}. Isso é comum: o cardápio vai ao ar na correria e ninguém volta para completar.\n\nQuer que eu te mande a lista dos itens que eu vi?',
  'Oi, passando só para saber se faz sentido eu te mandar o que vi no cardápio da {nome}. Se não for a hora, me avisa que eu não insisto.'
)
ON CONFLICT ("slug") DO NOTHING;
