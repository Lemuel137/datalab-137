-- Pergunta do texto de anúncio parado, pedida pelo Lemuel em 23/11/2026: olhar para o
-- resultado de hoje, com pergunta aberta. Só troca se o texto ainda for o da migração 0010.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind" || jsonb_build_object('anuncio_parado', 'Oi, tudo bem? Sou o Lemuel, trabalho com anúncio para delivery. Estava vendo os anúncios de pizzaria e me chamou atenção que {achado}. Para durar tanto, imagino que tenha funcionado bem. Como ele está trazendo pedido hoje, comparado com o começo?')
WHERE "slug" = 'delivery' AND "templates_by_kind"->>'anuncio_parado' LIKE '%Como foi que vocês chegaram nele?';
