# Deploy no DigitalOcean App Platform

O spec está em `deploy/app.yaml` e já foi enviado para o repositório. O app sobe sozinho a cada push na `main`.

## 1. Autorizar o doctl (só você pode fazer)

Crie um token em **API → Tokens → Generate New Token**, com escopo **read + write**. Não cole o token no chat.

```bash
doctl auth init
```

## 2. Informar a senha do app

O spec não carrega a senha em texto. Escolha uma com 12 caracteres ou mais e exporte:

```bash
export APP_PASSWORD='a-senha-que-voce-vai-usar'
export SESSION_SECRET="$(openssl rand -base64 32)"
```

## 3. Criar o app

```bash
doctl apps create --spec deploy/app.yaml \
  --set-env SESSION_SECRET="$SESSION_SECRET" \
  --set-env APP_PASSWORD="$APP_PASSWORD"
```

Se o `--set-env` não for aceito na sua versão, crie pelo painel: **Apps → Create App → GitHub → Lemuel137/datalab-137**, e cadastre as duas variáveis como `SECRET`.

## 4. Confirmar que subiu

```bash
doctl apps list
curl -I https://<url-do-app>/login
```

## 5. Apontar o domínio

No painel do app, aba **Settings → Domains**: adicione `app.datalab137.com`. O DigitalOcean devolve o registro CNAME a criar no seu DNS. Depois de propagar, o certificado sai sozinho.

## 6. Migrações

**O app migra sozinho ao subir** (desde 20/11/2026). A cada publicação, antes de atender pedidos, ele aplica as migrações pendentes de `drizzle/` e registra em `public.app_migrations`. O código está em `src/db/migrations.ts` e é chamado por `src/instrumentation.ts`.

- Se uma migração falhar, ela é desfeita, o processo sai e a publicação nova não entra no ar. A versão anterior continua servindo. Veja o motivo em `doctl apps logs <id> web --type run`, procurando por `[migrações]`.
- O banco é o "dev database" do App Platform (`dev-db-767412`), que só aceita conexão do próprio app e não tem backup automático. Por isso não se migra mais de fora.

**Regra para escrever migração:** como não há cópia de segurança antes, migração nova só **acrescenta** (coluna, tabela, índice) e precisa poder rodar duas vezes sem erro: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `UPDATE` com condição que não se repete. Nada de `DROP` nem de `UPDATE` que reescreve dado existente. Se um dia precisar de uma dessas, é caso de abrir o banco à mão, copiar as tabelas antes e usar `scripts/migrar-producao.ts`.

O drizzle-kit gera o arquivo (`pnpm db:generate`); confira o SQL e acrescente o `IF NOT EXISTS` que ele não põe. `pnpm db:migrate` serve só para banco local.

Linha de base: `0004_wakeful_komodo` foi a última aplicada à mão em produção. Na primeira subida com o controle, o app marca de `0000` a `0004` como feitas e aplica da `0005` em diante.

### Acesso de fora, só em emergência

O endereço sai pelo painel: app → componente do banco → Connection Details (clique em **show** antes de copiar, senão a senha vem mascarada). A conexão de fora só funciona com a caixa "Add app as a trusted source" desmarcada em Settings → Trusted Sources; marque de novo ao terminar.

## Custos

- App: `basic-xxs` — US$ 5/mês
- Banco: `db-s-dev-database` — US$ 7/mês
- Total: cerca de US$ 12/mês

## Se algo falhar

- **Build falha por `DATABASE_URL`**: o app usa conexão preguiçosa, então build não precisa de banco. Se falhar, é outra causa.
- **Health check falhando**: ele bate em `/login`; se o app não responde, veja os logs em `doctl apps logs <id> web --type run`.
- **Login recusado**: `APP_PASSWORD` com menos de 8 caracteres é recusado por projeto, e `SESSION_SECRET` com menos de 32 também.
