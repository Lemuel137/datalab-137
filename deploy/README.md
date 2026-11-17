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

## 6. Migrações no primeiro deploy

O app não migra sozinho, de propósito: migração automática em produção é como se perde dado. Rode uma vez, do seu computador, apontando para o banco do DigitalOcean:

```bash
export DATABASE_URL="$(doctl databases connection <id-do-banco> --format URI --no-header)"
pnpm db:migrate
psql "$DATABASE_URL" -f drizzle/seed-fronts.sql
```

Depois de criar o cluster com `doctl databases list`, pegue o id. O URI vem como `postgres://...` com SSL obrigatório.

## Custos

- App: `basic-xxs` — US$ 5/mês
- Banco: `db-s-dev-database` — US$ 7/mês
- Total: cerca de US$ 12/mês

## Se algo falhar

- **Build falha por `DATABASE_URL`**: o app usa conexão preguiçosa, então build não precisa de banco. Se falhar, é outra causa.
- **Health check falhando**: ele bate em `/login`; se o app não responde, veja os logs em `doctl apps logs <id> web --type run`.
- **Login recusado**: `APP_PASSWORD` com menos de 8 caracteres é recusado por projeto, e `SESSION_SECRET` com menos de 32 também.
