-- Frente de ar-condicionado: empresa com ficha bem avaliada no Maps e sem anúncio no Google.
-- Teste de uma semana aprovado pelo Lemuel em 24/11/2026 (5 por dia). Só cria se não existir.
INSERT INTO "fronts" ("name", "slug", "channel", "daily_limit", "active", "uses_engagement", "finding_policy", "weekly_target", "follow_up_template", "templates_by_kind")
VALUES (
  'Ar-condicionado', 'ar-condicionado', 'whatsapp', 20, true, false, 'script', 25,
  'Oi, voltando só uma vez: ficou curioso para saber o que eu vi na busca por ar-condicionado aí na região? Se não for a hora, me avisa que eu não insisto.',
  jsonb_build_object('sem_anuncio_google', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para empresas de serviço. Estava procurando instalação de ar-condicionado e {achado}. Com o calor chegando, fiquei curioso: de onde vêm hoje os pedidos de orçamento de vocês?')
)
ON CONFLICT ("slug") DO NOTHING;
