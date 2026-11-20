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

O app não migra sozinho, de propósito. E a migração tem que rodar **antes** do push: o app publica a cada push na `main`, e código novo com banco antigo quebra as telas. Migração que só acrescenta coluna pode rodar com o app antigo no ar.

**Última aplicada em produção: `0004_wakeful_komodo` (20/11/2026).**

O banco é o "dev database" do App Platform (`dev-db-767412`), e ele tem três particularidades medidas em 19/11/2026:

- **Não aparece em `doctl databases list`.** O endereço sai só pelo painel: app → componente do banco → Connection Details. Clique em **show** antes de copiar, senão a senha vem mascarada.
- **Só aceita conexão de fora com a caixa "Add app as a trusted source" desmarcada** (Settings → Trusted Sources). Desmarque só durante a migração e marque de novo no fim. Não há lista de IPs.
- **`pnpm db:migrate` não funciona**: o usuário do banco não pode criar o schema de controle do drizzle. Use o script do projeto, que aplica os arquivos de `drizzle/` numa transação:

```bash
export DATABASE_URL='postgres://usuario:senha@host:25060/banco?sslmode=require'
node scripts/migrar-producao.ts 4            # ensaio, desfaz no fim
node scripts/migrar-producao.ts 4 --gravar   # aplica a partir da 0004
```

O número é a primeira migração ainda não aplicada. Como não há tabela de controle, atualize a linha "Última aplicada" acima a cada migração gravada.

Esse tipo de banco não tem backup automático. Antes de migrar, copie as tabelas.

## Custos

- App: `basic-xxs` — US$ 5/mês
- Banco: `db-s-dev-database` — US$ 7/mês
- Total: cerca de US$ 12/mês

## Se algo falhar

- **Build falha por `DATABASE_URL`**: o app usa conexão preguiçosa, então build não precisa de banco. Se falhar, é outra causa.
- **Health check falhando**: ele bate em `/login`; se o app não responde, veja os logs em `doctl apps logs <id> web --type run`.
- **Login recusado**: `APP_PASSWORD` com menos de 8 caracteres é recusado por projeto, e `SESSION_SECRET` com menos de 32 também.
