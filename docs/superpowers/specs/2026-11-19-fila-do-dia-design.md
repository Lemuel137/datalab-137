# Fila do dia: desenho (19/11/2026)

Estado: aguardando aprovação do Lemuel. Nada foi construído.

## Por quê

O Lemuel quer abrir o sistema de manhã e encontrar os contatos do dia prontos, sem montar lote, sem subir arquivo e sem caçar follow-up. Palavras dele: "eu nao quero ter que fazer nada manual", "quero um fluxo limpo", "consegue abrir de manha e ter tudo la".

O mesmo molde precisa servir depois para outros nichos e para outras empresas (o irmão dele, com empresa de edição e criação de vídeo, e o cliente Cash Esc). Por isso nada do que é específico de delivery pode ficar preso no código: fica na configuração da frente.

## Objetivos

1. Uma tela, "Fila de hoje", com tudo o que há para fazer no dia em cada frente.
2. Delivery (pizzaria, nacional, Limeira fora) entra na fila sem conferência manual lead a lead.
3. E-commerce entra na mesma fila, com conferência manual do achado, porque esse tipo de achado já errou.
4. O Captor entrega os dossiês no CRM sozinho.
5. Quem pede para parar nunca mais aparece.
6. Um lugar para cadastrar e ajustar frentes (nichos) sem mexer em código.

## Fora desta entrega

- Coleta nova do Captor rodando sozinha (depende do custo do Apify, não verificado).
- Sugestão de nichos por IA a partir da descrição da empresa. Fica como próxima entrega; a tela de frentes desta entrega é onde ela vai encaixar.
- Acesso separado por empresa (irmão, Cash Esc). O sistema continua com um usuário.
- Fonte de CNPJ/Receita para a Cash Esc.
- Frente de ar-condicionado (não tem lista).
- Layout novo. A fila nasce com o visual atual; o redesenho vem depois, com os prompts de design do curso.

## O que nunca pode acontecer

- Disparo automático. O sistema abre a conversa com o texto; quem envia é a pessoa.
- Mensagem que afirma algo sem achado com endereço e data.
- Mais de um follow-up.
- Lead suprimido voltando por uma importação nova.

## Caminhos considerados

| Caminho | Como seria | Por que não |
|---|---|---|
| A. Formato "Captor" na tela de importação | sobe o `dossies.csv` a cada rodada | manual a cada rodada; o Lemuel recusou |
| B. Converter para o CSV atual | script transforma o arquivo | dados do cardápio espremidos em `category`; retrabalho |
| C. Script direto no banco | igual ao da carga do histórico | exige terminal e credencial do banco a cada rodada |
| **D. Captor entrega por uma porta do CRM** | último passo do Captor envia os dossiês | **escolhido**: nada manual, e a mesma porta serve a outras fontes depois |

Para a conferência do achado no delivery: **remedição por script** (escolhida pelo Lemuel) em vez de conferência manual dos 20 por manhã.

## Como funciona

### 1. Frente passa a carregar as regras do nicho

Campos novos em `fronts`:

| Campo | Para quê | Delivery | E-commerce |
|---|---|---|---|
| `findingPolicy` | o que libera o envio: `script` (achado medido por script nas últimas 24 h) ou `conferido` (achado conferido no navegador hoje) | `script` | `conferido` |
| `messageTemplate` | texto da primeira mensagem, com `{nome}` e `{achado}` | a aprovar | a aprovar |
| `followUpTemplate` | texto do follow-up único | a aprovar | a aprovar |
| `weeklyTarget` | leads novos por semana, escolhido de 5 em 5 na tela de frentes | a escolher | a escolher |

`channel`, `dailyLimit` e `usesEngagement` já existem. Frente nova `delivery`: WhatsApp, 20 por dia, sem trava de engajamento.

### 2. A fila

Calculada quando a tela abre (não há rotina noturna no servidor). Para a frente escolhida:

- **Novos:** leads em `importado`, `qualificado` ou `aprovado`, com contato no canal da frente, com achado válido pela política da frente, fora da supressão, ordenados pela nota. Quantidade do dia: o que falta da meta semanal da frente, dividido pelos dias úteis que restam na semana (arredondado para cima), nunca acima do que resta do limite diário do canal. Exemplo: meta de 25 dá 5 por dia; se a segunda foi perdida, os outros dias sobem para 7, 6, 6 e 6. Follow-up não conta na meta semanal, mas conta no limite diário do canal.
- **Follow-ups de hoje:** contatados há 3 dias úteis ou mais, sem resposta e sem follow-up.
- **Responderam:** leads em `respondeu` sem próximo passo registrado.
- **Fora da fila, com o motivo:** achado vencido, sem contato no canal, engajamento não medido. Só a contagem e um link.

```
Fila de hoje · quinta 20/11            [ Delivery (pizzaria) ▾ ]
Meta da semana: 25 · hoje: 5 novos · WhatsApp: 0 de 20 enviados hoje

NOVOS (5)
1. Pizzaria X · Joinville/SC · nota 82
   43% do cardápio sem foto (medido hoje 06:10)   [ver cardápio]
   [abrir WhatsApp com a mensagem]   [enviei]   [pular]   [pediu para parar]

FOLLOW-UPS (3)      RESPONDERAM (1)
Fora da fila: 4 com achado vencido · 2 sem WhatsApp
```

- **WhatsApp:** o botão abre `wa.me/<número>?text=<mensagem>` já preenchido.
- **Instagram:** abre `ig.me/m/<arroba>` e copia a mensagem (o Instagram não aceita texto pronto no link).
- **"Enviei"** registra o contato com a mensagem e a hora, e leva o lead a `contatado`. O intervalo de 2 a 3 minutos e o limite diário continuam valendo: o botão de abrir o próximo fica travado até o intervalo passar.
- **Frente com política `conferido`** (e-commerce): no lugar de "abrir", aparece "conferir achado", que leva à evidência. Só depois de registrar a conferência de hoje o envio libera.

Decisão minha: a etapa "aprovado para abordagem" deixa de ser um passo que o Lemuel executa. O lead passa por ela automaticamente quando entra na fila com achado válido. A tela `/aprovacao` sai.

### 3. Entrada do Captor

- Porta `POST /api/ingest/captor`, protegida por chave (`INGEST_TOKEN`), recebe os dossiês em JSON.
- Filtros na entrada: nome da loja contém "pizz"; cidade diferente de Limeira; tem WhatsApp ou Instagram; não está na supressão. A resposta devolve quantos entraram, quantos atualizaram e quantos ficaram de fora por motivo.
- Casa lead existente por WhatsApp, Instagram ou endereço do cardápio. Atualiza em vez de duplicar.
- Vai para `signals`: nota do Captor, plataforma, itens, % sem foto, % sem descrição, cardápio, página do Facebook, cidade e UF, e `anuncia_sem_pixel` (só sinal, nunca achado).
- Os achados de cardápio entram com tipo `cardapio_fraco`, origem `script` e a data da medição. Remedição substitui o achado anterior do mesmo tipo.
- No Captor (`~/prospeccao-ccm`): script novo `10_enviar_crm.py`, e uma rotina diária no Mac às 6h que roda a auditoria de cardápio (`06`, `08`, `09`, que não usam Apify) e envia. Se o Mac estiver desligado, os achados vencem e a fila avisa em vez de mostrar dado velho.

### 4. Supressão

Tabela `suppressions` (WhatsApp, Instagram ou domínio; motivo; data). O botão "pediu para parar" descarta o lead e grava a supressão. A fila e todas as entradas (Captor, CSV) consultam a tabela.

### 5. Tela de frentes

`/frentes`: lista, cria e edita frente (nome, canal, limite diário, leads novos por semana, política de achado, piso de engajamento, textos, ativa ou não). É onde um nicho novo nasce, e onde a sugestão por IA vai entrar depois.

## Ordem de construção

1. Campos da frente, fila e botões, usando os leads que já existem (e-commerce e histórico). Já dá uso real no primeiro dia.
2. Porta do Captor, frente delivery, script de envio e rotina das 6h. Primeira carga dos 51.
3. Supressão.
4. Tela de frentes.

Cada parte passa pelo fluxo do curso: plano, teste antes do código, revisão e verificação. Produção só com o ok do Lemuel.

## Decisões minhas (o Lemuel pode corrigir)

- Fila calculada na abertura da tela, sem rotina no servidor.
- Aprovação vira automática; `/aprovacao` sai.
- Validade do achado de script: 24 horas.
- Meta semanal: dia perdido é redistribuído nos dias que restam da mesma semana; não acumula para a semana seguinte. Semana de segunda a sexta.
- Follow-up vence com 3 dias úteis (regra já usada na prospecção).
- "Pizzaria" é identificada pelo nome da loja; a resposta da entrada mostra quem ficou de fora.
- A rotina das 6h roda no Mac dele, porque a auditoria do Captor é em Python e o CRM não roda Python.

## Em aberto

- **Textos das mensagens** de delivery e e-commerce: escrevo o rascunho na etapa 2 para ele aprovar, com a abordagem que já usamos (abrir pelo que é da empresa, problema pelo lado do cliente dela, fechar com pergunta).
- A auditoria de cardápios do Saipos usa um navegador automático (`07_render.py`); preciso confirmar se roda sem ninguém olhando.
- `PRODUCT.md` diz que nada é enviado sem a marcação "aprovado"; será atualizado junto com a etapa 1.
