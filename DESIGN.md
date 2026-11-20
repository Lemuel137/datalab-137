# DESIGN.md — contrato visual do Datalab137

Fonte da verdade do visual. O sistema completo (guia da marca, tokens com uso, logo) está publicado em
https://claude.ai/artifact/2h63hZVVmTckXJuJWm7DTy. Os valores que o código usa estão em `src/app/globals.css`.
Se os dois divergirem, corrija o `globals.css` para bater com o sistema, não o contrário.

## Regras

1. **Cor, raio e fonte só por token.** Nada de `zinc-500`, `#fff`, `rounded-[7px]` nas telas. Use `text-ink`, `bg-surface`, `border-line`, `rounded-md`.
2. **Uma ação em `brand` por tela.** É a ação principal (na fila, "abrir conversa" do lead da vez). Salvar e registrar usam `btn btn-solid`; o resto, `btn` ou `btn btn-ghost`.
3. **Sem sombra e sem degradê.** Profundidade se faz com cor: `ground` atrás, `surface` no cartão, `surface-raised` no campo. O degradê existe só no arquivo do logo.
4. **Número em mono.** Meta, enviados, nota e porcentagem usam `font-mono`.
5. **Todo número mostra de onde veio.** Achado aparece com a data da medição.
6. **Texto de sistema:** técnico e direto, minúsculas em botão, sem emoji e sem exclamação.
7. **Os dois temas sempre.** Escuro é o de origem; claro segue `prefers-color-scheme`. Confira os dois antes de entregar tela nova.

## Tokens de cor

| Token                        | Classe                | Uso                                         |
| ---------------------------- | --------------------- | ------------------------------------------- |
| `ground`                     | `bg-ground`           | fundo da página                             |
| `surface`                    | `bg-surface`, `.card` | cartões e painéis                           |
| `surface-raised`             | `bg-surface-raised`   | campos, item selecionado                    |
| `line`                       | `border-line`         | divisórias e contorno de cartão (decoração) |
| `line-strong`                | `border-line-strong`  | borda de campo e de botão (3:1)             |
| `ink`                        | `text-ink`            | texto principal                             |
| `ink-muted`                  | `text-ink-muted`      | apoio, rótulos, metadados                   |
| `brand` / `on-brand`         | `.btn-brand`          | a ação principal                            |
| `brand-text`                 | `text-brand-text`     | link e número em destaque                   |
| `brand-soft`                 | `bg-brand-soft`       | fundo de aviso neutro                       |
| `brand-end`                  | `text-brand-end`      | só identidade; nunca texto corrido          |
| `success` `warning` `danger` | `text-success` etc.   | estado, como texto                          |

Raios: `rounded-sm` 6px (etiqueta), `rounded-md` 10px (botão, campo), `rounded-lg` 16px (cartão).

## Classes prontas (`globals.css`)

- `.card` — cartão. O padding é da tela (`p-5`, `p-6`).
- `.btn`, `.btn-brand`, `.btn-solid`, `.btn-ghost` — botões e links com cara de botão.
- `.field` — padding de campo. Cor, borda e raio de `input`, `select` e `textarea` já vêm da base.
- `.label-caps` — rótulo em caixa alta.
- `.chip` — etiqueta de etapa, nota, canal.

## Tipografia

Geist (texto) e Geist Mono (número), carregadas em `src/app/layout.tsx`.

| Papel                         | Classes                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| Título da tela                | `text-[32px] font-semibold leading-9 tracking-tight`         |
| Título de seção, nome do lead | `text-xl font-semibold tracking-tight`                       |
| Corpo                         | padrão do `body` (15px / 24px)                               |
| Metadado                      | `text-[13px] leading-5 text-ink-muted`                       |
| Rótulo                        | `.label-caps`                                                |
| Número de painel              | `font-mono text-[28px] font-medium leading-8 tracking-tight` |

## Estrutura das telas

- Barra do topo fixa (`src/app/nav.tsx`) em todas as telas menos o login. A entrada cai em `/fila`.
- Largura de conteúdo: `max-w-6xl`, com `px-4 sm:px-8`.
- A fila se lê de cima para baixo, um lead por cartão: o primeiro abre expandido e os outros ficam recolhidos (`<details>`).

## O que ainda não existe

Conjunto de ícones (por enquanto ação é palavra), marca própria do produto (o nome vai em Geist 600) e versão do logo em vetor.
