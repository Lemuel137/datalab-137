# Datalab137 — Prospecção

Sistema de prospecção da Datalab137. Substitui o conjunto atual de planilhas, scripts Python e memórias em markdown por um único lugar: leads, qualificação, achados verificados, contatos, respostas e cartas-diagnóstico.

## Problema

A prospecção da Datalab137 vive hoje em `~/Documents/claude/prospeccao`: `envios.csv` com status solto, lotes em markdown, dossiês em JSON gerados por `qualificar.py`/`dossie.py`, cartas em `pdfs/gerar_carta.py` e regras de operação espalhadas em memórias e em `config-frentes.md`. Consequências medidas:

- follow-up vence sem aviso e ninguém percebe;
- o achado verificado se perde entre arquivos e a DM repete ponto que já caiu;
- ninguém consegue dizer, por segmento, quantas abordagens viraram resposta de pessoa.

## Público

Lemuel, fundador, único usuário na v1. Mono-tenant, com login. Sem cadastro público e sem cobrança.

## Fluxos principais

1. Entrar com login.
2. Importar leads gerados pela busca (JSON de dossiê e CSV do qualificador) para uma frente.
3. Qualificar lead: registrar achado verificado com evidência (URL, data, o que foi visto) e nível de confiança.
4. Seguir o funil: importado, qualificado, aprovado para abordagem, contatado, respondeu, diagnóstico enviado, reunião, fechado, descartado.
5. Abrir a fila do dia: leads novos pela meta semanal da frente, follow-ups que vencem e respostas, respeitando o limite diário e o intervalo do canal.
6. Registrar contato (canal, data, texto enviado, status) e um único follow-up.
7. Gerar dossiê em tela e carta-diagnóstico.
8. Ler painel por segmento e frente: abordagens, respostas de pessoa, diagnósticos, reuniões, fechamentos.

## Regras de negócio que o sistema deve garantir

- Nada entra na fila sem achado válido pela política da frente: medido por script nas últimas 24 horas, ou conferido no navegador no dia. A etapa "aprovado para abordagem" deixou de ser um passo manual.
- Achado verificado com evidência é obrigatório **somente a partir de** "aprovado para abordagem". Lead importado e qualificado pode existir sem achado.
- Toda afirmação sobre um prospect precisa apontar para um achado com URL e data.
- Limite diário por canal, configurável, semeado com os valores atuais: Instagram DM 15/dia, WhatsApp 20/dia, uma a cada 2 ou 3 minutos.
- Um único follow-up por lead; sem resposta, o lead sai da lista sem insistência.
- Frentes cadastráveis com nome, slug, canal e limite. Semeadas com as reais.
- Nunca citar nome de prospect ou cliente em conteúdo público sem autorização.

## Contexto operacional

- O envio continua manual. O sistema abre a conversa com o texto, registra e mede; nunca dispara.
- Fonte da verdade: este sistema. Quando ele estiver no ar, `config-frentes.md` e a memória de prospecção deixam de ser consultados para operação e passam a ser apenas histórico.
- Domínio: `app.datalab137.com`.

## Fora da v1

- Disparo automático por WhatsApp, Instagram ou e-mail.
- Integração com n8n, Evolution, Z-API ou gateway não oficial.
- Multiusuário, cobrança, permissões por papel.
- Geração de PDF dentro do app (o `pdfs/gerar_carta.py` continua sendo usado até a v2).

## Frentes iniciais

| Frente                          | Slug               | Canal                   | Status  |
| ------------------------------- | ------------------ | ----------------------- | ------- |
| Clínicas                        | clinicas           | Instagram DM            | ativa   |
| Negócios com dor de atendimento | atendimento        | WhatsApp                | inativa |
| Negócios com e-mail público     | email-frio         | E-mail (datalab137.com) | inativa |
| E-commerce (Tranco)             | ecommerce          | Instagram DM            | ativa   |
| Advogados de imigração EUA      | imigracao-eua      | Instagram DM            | pausada |
| Parcerias de cardápio digital   | parcerias-cardapio | Indicação               | ativa   |

## Requisitos técnicos

- Next.js (App Router) com TypeScript, conforme o Vibe Coding Toolkit.
- PostgreSQL em Docker local; Drizzle ORM.
- Testes com Vitest; lint e typecheck no `check`.
- CI no GitHub Actions.
- Deploy em `app.datalab137.com` (destino a decidir: DigitalOcean App Platform ou Vercel, com Postgres gerenciado).
- Interface e documentação em português. Identificadores técnicos em inglês.

## Critérios de aceite da v1

- Importar um dossiê JSON real de `prospeccao/qualificador/` e um CSV real de leads sem edição manual.
- Impedir aprovação de lote que estoure o limite do canal.
- Mostrar, por segmento, abordagens, respostas de pessoa e diagnósticos.
- Registrar contato e exibir follow-up vencido.
- Rodar `npm run check` limpo e a aplicação subir com `docker compose up`.

## Limites de escopo

- Nenhum dado real de prospect em conteúdo público ou em teste automatizado. Fixtures sintéticas.
- Não copiar `envios.csv` real para o repositório, que será público.
