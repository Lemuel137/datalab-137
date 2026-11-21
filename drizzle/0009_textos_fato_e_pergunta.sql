-- Textos da frente delivery no formato aprovado pelo Lemuel em 20/11/2026:
-- "Oi, tudo bem?" + fato medido + pergunta pela experiência do dono. Sem gancho.
-- Só troca o texto que ainda está no formato antigo (usa {gancho}) ou que não existe:
-- o que for editado na tela de frentes depois disso não é sobrescrito.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind"
  || CASE WHEN NOT ("templates_by_kind" ? 'anuncio_parado') OR "templates_by_kind"->>'anuncio_parado' LIKE '%{gancho}%'
    THEN jsonb_build_object('anuncio_parado', 'Oi, tudo bem? Pela Biblioteca de Anúncios, {achado}. Ele ainda traz pedido como no começo, ou vocês sentiram cair?') ELSE '{}'::jsonb END
  || CASE WHEN NOT ("templates_by_kind" ? 'avaliacao_sem_resposta') OR "templates_by_kind"->>'avaliacao_sem_resposta' LIKE '%{gancho}%'
    THEN jsonb_build_object('avaliacao_sem_resposta', 'Oi, tudo bem? No Google, {achado}. Isso chega até vocês no dia a dia, ou só fica sabendo quem abre a ficha?') ELSE '{}'::jsonb END
  || CASE WHEN NOT ("templates_by_kind" ? 'cardapio_fraco') OR "templates_by_kind"->>'cardapio_fraco' LIKE '%{gancho}%'
    THEN jsonb_build_object('cardapio_fraco', 'Oi, tudo bem? No cardápio de vocês, {achado}. O pessoal costuma perguntar desses itens pelo WhatsApp antes de pedir?') ELSE '{}'::jsonb END
WHERE "slug" = 'delivery';
