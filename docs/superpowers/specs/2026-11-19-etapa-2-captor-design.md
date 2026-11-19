# Etapa 2: entrada do Captor e frente delivery (desenho curto, 19/11/2026)

Estado: aguardando aprovação do Lemuel. Continua o desenho `2026-11-19-fila-do-dia-design.md`.

## Por quê

A fila do dia está em produção, mas vazia de leads novos: e-commerce depende de conferência manual. O delivery é a frente que enche a fila sozinha, e é a prioridade de negócio (repor faturamento). O Lemuel quer abrir de manhã e ter os contatos prontos, sem fazer nada à mão além de conferir e apertar enviar.

## O que os dados mostraram (medido em 19/11)

- 51 pizzarias nos dossiês do Captor; 48 com texto de anúncio coletado, que rende gancho.
- O achado atual ("% de itens sem descrição") é fraco: em 25 das 43 lojas com exemplos, os itens apontados são só bebida. Usar esse número em mensagem seria afirmar um defeito que o dono não vê.
- O banco de produção não aceita conexão de fora. A entrada tem que ser por dentro do app.

## Decisões do Lemuel

- Delivery só pizzaria por enquanto, nacional, Limeira fora.
- Achado de cardápio é remedido por script e vale 24 horas.
- Gancho e lado do cliente são escritos por IA na rotina das 6h, na assinatura dele do Claude ("Sim, IA escreve").
- Nada manual além de conferir e enviar.

## Caminhos considerados para o gancho

| Caminho                                | Por que não                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| Regra fixa (primeira frase do anúncio) | o texto vem com emoji, hashtag e vários assuntos; sai torto |
| Lemuel escreve na fila                 | é o manual que ele não quer                                 |
| **IA escreve na rotina das 6h**        | **escolhido**                                               |

## Como funciona

### 1. Porta de entrada no CRM

`POST /api/ingest/leads`, protegida por chave (`INGEST_TOKEN`, cabeçalho `Authorization: Bearer`). É genérica, não do Captor: recebe `{ front: <slug>, leads: [...] }`, para servir depois a outras fontes (Cash Esc, outros nichos).

Cada lead traz nome, WhatsApp, Instagram, cidade, UF, endereço da fonte (cardápio), sinais e achados. Regras:

- Casa lead existente por WhatsApp, Instagram ou endereço da fonte; atualiza em vez de duplicar. Lead que já foi contatado não tem a etapa mexida.
- Achado chega com tipo, origem `script`, data da medição, e opcionalmente gancho e lado do cliente com a marca `hookBy: "ia"`.
- Mesmo achado (mesmo tipo e mesmo texto) remedido: só a data avança, e o gancho fica. Texto mudou: o achado antigo sai, o novo entra sem gancho, e o lead fica em "sem gancho" até a IA reescrever.
- Limeira é recusada na entrada. A resposta devolve quantos entraram, atualizaram e ficaram de fora, com o motivo.
- `GET /api/ingest/pendentes?front=<slug>` devolve os leads com achado válido e sem gancho, para a rotina saber o que escrever.

Segurança: a porta não usa a sessão de login, então o `proxy.ts` a libera e ela mesma confere a chave (comparação em tempo constante, chave de 32+ caracteres, corpo validado com zod e limitado em tamanho). Sem `INGEST_TOKEN` configurado, a porta responde 503.

### 2. Frente delivery

Criada por migração: `delivery`, WhatsApp, 20 por dia, meta de 25 por semana, sem trava de engajamento, política `script`, com os dois textos já aprovados (adendo do desenho da fila).

### 3. Medição nova no Captor (`~/prospeccao-ccm`)

Script novo que relê o cardápio de cada pizzaria e mede só comida: tira bebida, adicional, borda, taxa e embalagem. Guarda, por loja, o nome das pizzas sem foto e sem descrição.

O achado vira frase com nomes, por exemplo: `a Calabresa 2 Queijos e a Frango com Catupiry estão sem descrição, junto com outras 7 pizzas`. Loja sem defeito em comida não gera achado e não entra na fila. "Preço redondo" e "anuncia sem pixel" seguem só como sinal, nunca como achado.

Quando o anúncio cita uma pizza pelo nome e ela está sem foto ou sem descrição no cardápio, esse é o achado preferido.

### 4. Rotina das 6h

Tarefa agendada do Claude (a que foi pausada em 12/11, reescrita). Todo dia útil:

1. Roda a medição e envia para a porta.
2. Pergunta à porta quais leads estão sem gancho.
3. Para cada um, lê o texto do anúncio e o achado e escreve gancho e lado do cliente, seguindo a regra do adendo (gancho cita algo do anúncio; lado do cliente diz quem perde). Não inventa fato: só usa o que o anúncio diz e o que o script mediu.
4. Envia de volta.

Se o Mac estiver desligado às 6h, os achados vencem e a fila avisa.

## Fora desta etapa

- Coleta nova de anunciantes (gasta Apify): continua manual, por rodada.
- Marmita e hamburgueria.
- Supressão (etapa 3) e criação de frente pela tela (etapa 4).
- Migração como passo de publicação. Fica anotada como melhoria; hoje segue o `deploy/README.md`.

## Precisa do ok do Lemuel na hora de publicar

- Criar a chave `INGEST_TOKEN` e gravá-la no app do DigitalOcean (muda a configuração do app) e num arquivo local só dele.
- Rodar a migração 0004 em produção (abre a janela do banco de novo por alguns minutos).
- Reativar a tarefa agendada.

## Decisões minhas

- Porta genérica por frente, não específica do Captor.
- O gancho da IA só é reescrito quando o texto do achado muda; fora disso a rotina não gasta IA.
- Campo `hookBy` no achado (`ia` ou `manual`), mostrado na fila e na página do lead.
- Pizzaria continua identificada pelo nome da loja.

## Em aberto

- Quantas das 51 sobram depois da medição só de comida. Só a medição responde.
- Cardápios do Saipos dependem de navegador automático (`07_render.py`); se não rodarem sem ninguém olhando, ficam fora da rotina.
