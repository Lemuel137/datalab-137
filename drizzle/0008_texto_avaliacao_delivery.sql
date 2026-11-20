-- Texto da primeira mensagem para o achado de avaliação sem resposta, na frente delivery.
-- Aprovado pelo Lemuel em 20/11/2026. Só acrescenta se ainda não houver texto para o tipo:
-- o que for editado depois na tela de frentes não é sobrescrito.
UPDATE "fronts"
SET "templates_by_kind" = "templates_by_kind" || jsonb_build_object(
  'avaliacao_sem_resposta',
  E'Oi! Vi {gancho} e fui olhar a ficha de vocês no Google, como faz quem vai pedir pela primeira vez. Reparei que {achado}.\n\n{cliente}. Isso é comum: na correria do salão quase ninguém consegue abrir o Google para responder.\n\nQuer que eu te mande os links dessas avaliações?'
)
WHERE "slug" = 'delivery' AND NOT ("templates_by_kind" ? 'avaliacao_sem_resposta');
