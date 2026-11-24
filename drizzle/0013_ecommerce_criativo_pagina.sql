-- E-commerce: dois achados novos, com texto aprovado pelo Lemuel em 24/11/2026.
-- Só acrescenta o texto de cada tipo se ainda não houver.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind"
  || CASE WHEN "templates_by_kind" ? 'criativo_sem_diferencial' THEN '{}'::jsonb
     ELSE jsonb_build_object('criativo_sem_diferencial', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para loja virtual. Estava vendo os anúncios de vocês e reparei que {achado}. Fiquei curioso: o que vocês já testaram para mostrar por que comprar de vocês e não de outra loja?') END
  || CASE WHEN "templates_by_kind" ? 'pagina_produto' THEN '{}'::jsonb
     ELSE jsonb_build_object('pagina_produto', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para loja virtual. Estava olhando os produtos de vocês e reparei que {achado}. Como o cliente não pega o produto na mão, fiquei curioso: como vocês lidam hoje com quem chega no produto e fica em dúvida?') END
WHERE "slug" = 'ecommerce';
--> statement-breakpoint
-- Link quebrado deixa de abrir conversa (decisão do Lemuel em 24/11/2026: o dono corrige em minutos
-- e não sobra o que vender). O achado continua guardado no lead. Só tira o texto se for o da 0010.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind" - 'destino_anuncio'
WHERE "slug" = 'ecommerce' AND "templates_by_kind"->>'destino_anuncio' LIKE '%Como vocês cuidam dessa atualização hoje?';
