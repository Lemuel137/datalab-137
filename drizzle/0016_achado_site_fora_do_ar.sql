-- Ar-condicionado: site da ficha do Google fora do ar vira achado próprio.
-- Texto aprovado pelo Lemuel em 25/11/2026. Só acrescenta se ainda não houver.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind" || jsonb_build_object('site_fora_do_ar', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para empresas de serviço. Estava procurando instalação de ar-condicionado e {achado}. Fiquei curioso: por onde chegam hoje os pedidos de orçamento de vocês?')
WHERE "slug" = 'ar-condicionado' AND NOT ("templates_by_kind" ? 'site_fora_do_ar');
