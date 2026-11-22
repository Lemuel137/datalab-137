-- Textos com apresentação e pergunta aberta, tom aprovado pelo Lemuel em 22/11/2026.
-- Delivery: só troca o texto que ainda é o da migração 0009 (ou que não existe);
-- o que foi editado na tela de frentes fica.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind"
  || CASE WHEN NOT ("templates_by_kind" ? 'anuncio_parado') OR "templates_by_kind"->>'anuncio_parado' LIKE 'Oi, tudo bem? Pela Biblioteca de Anúncios,%'
    THEN jsonb_build_object('anuncio_parado', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para delivery. Estava vendo os anúncios de pizzaria e me chamou atenção que {achado}. Para durar tanto, imagino que tenha funcionado bem. Como foi que vocês chegaram nele?') ELSE '{}'::jsonb END
  || CASE WHEN NOT ("templates_by_kind" ? 'avaliacao_sem_resposta') OR "templates_by_kind"->>'avaliacao_sem_resposta' LIKE 'Oi, tudo bem? No Google,%'
    THEN jsonb_build_object('avaliacao_sem_resposta', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para delivery. Estava lendo as avaliações de vocês no Google e vi que {achado}. Sei que na correria do salão isso é o último da fila. Como vocês lidam com essa parte hoje?') ELSE '{}'::jsonb END
  || CASE WHEN NOT ("templates_by_kind" ? 'cardapio_fraco') OR "templates_by_kind"->>'cardapio_fraco' LIKE 'Oi, tudo bem? No cardápio de vocês,%'
    THEN jsonb_build_object('cardapio_fraco', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para delivery. Estava olhando o cardápio de vocês e vi que {achado}. Como vocês decidem o que ganha foto e descrição no cardápio?') ELSE '{}'::jsonb END
WHERE "slug" = 'delivery';
--> statement-breakpoint
-- E-commerce: texto para destino de anúncio quebrado, se ainda não houver.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind" || jsonb_build_object('destino_anuncio', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para loja virtual. Estava vendo os anúncios de vocês e vi que {achado}. Com catálogo grande isso é comum. Como vocês cuidam dessa atualização hoje?')
WHERE "slug" = 'ecommerce' AND NOT ("templates_by_kind" ? 'destino_anuncio');
--> statement-breakpoint
-- E-commerce passa a aceitar achado medido por script: todo achado já exige a conferência
-- do dia na fila, que era o papel da política "conferido". Aprovado pelo Lemuel em 22/11/2026.
UPDATE "fronts" SET "finding_policy" = 'script' WHERE "slug" = 'ecommerce' AND "finding_policy" = 'conferido';
