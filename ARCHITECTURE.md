# Receita do Site — Vinicius Murari Photography

> Este ficheiro explica **tudo** sobre como o site funciona: que plataformas usa, como os dados fluem, o que cada ficheiro faz e como tudo se liga. Se um dia precisar de outra ferramenta ou outro developer para trabalhar no site, este documento tem toda a informacao necessaria.

---

## 1. Visao geral

Site portfolio de fotografia, filmmaking e drone baseado em Dublin, Irlanda.
E um site **estatico** (HTML + CSS + JS puro, sem framework) com um painel admin integrado.
Nao ha servidor backend — tudo funciona com servicos externos gratuitos.

**URL de producao:** `https://viniciusmurari.com`

---

## 2. Stack completa

| Camada | Tecnologia | Custo |
|--------|-----------|-------|
| Frontend | HTML + CSS + JS puro (sem React, sem frameworks) | Gratis |
| Hosting | Cloudflare Pages (deploy automatico via GitHub) | Gratis |
| Repositorio | GitHub (`viniciusmurari-design/portfolio-site`, branch `main`) | Gratis |
| Fotos/Videos | Cloudinary (cloud `dnocmwoub`, preset `portfolio_upload`) | Gratis (25 GB) |
| Base de dados | Supabase (`buhuwnkljilyysyrdkxr.supabase.co`) | Gratis |
| Formulario contacto | Web3Forms (envia email sem backend) | Gratis |
| Analytics | Google Analytics 4 (opcional, so com consentimento) | Gratis |
| Dominio | viniciusmurari.com (registrado externamente, DNS no Cloudflare) | Pago |

---

## 3. Plataformas e logins

| Plataforma | URL de acesso | Para que serve |
|-----------|--------------|----------------|
| Cloudflare Pages | https://dash.cloudflare.com | Hospeda o site. Publica automaticamente quando faz push no GitHub. |
| GitHub | https://github.com/viniciusmurari-design/portfolio-site | Guarda o codigo. O Cloudflare le daqui. |
| Cloudinary | https://console.cloudinary.com | Guarda e entrega fotos/videos via CDN. Cloud name: `dnocmwoub`. |
| Supabase | https://supabase.com/dashboard | Base de dados: metadados de fotos + posts do blog. |
| Google Analytics | https://analytics.google.com | Estatisticas de visitas (opcional). |
| Web3Forms | https://web3forms.com | Fornece a access key para o formulario de contacto. Nao requer conta/login. |

---

## 4. Ficheiros do projeto — o que cada um faz

### Paginas publicas

| Ficheiro | Funcao |
|---------|--------|
| `index.html` | Pagina principal do portfolio (single-page: hero, galerias, about, reviews, contacto) |
| `landing.html` | Template reutilizavel para landing pages de servicos (Airbnb, Wedding, etc.) |
| `blog-post.html` | Template para posts individuais do blog/journal |
| `privacy.html` | Pagina de politica de privacidade (GDPR) |
| `404.html` | Pagina de erro "nao encontrado" |

### Estilos e scripts publicos

| Ficheiro | Funcao |
|---------|--------|
| `styles.css` | Todos os estilos do site principal (index.html) |
| `script.js` | Toda a logica do site: galeria, hero slideshow, formulario, scroll, modo escuro, analytics |
| `landing.css` | Estilos das landing pages |
| `landing.js` | Logica das landing pages: FAQ accordion, slider, SEO schemas, formulario |

### Painel admin

| Ficheiro | Funcao |
|---------|--------|
| `admin.html` | Estrutura HTML do painel admin (login, sidebar, tabs, modals) |
| `admin.css` | Todos os estilos do painel admin |
| `admin.js` | Toda a logica: autenticacao, upload, galerias, settings, blog, landing pages |

### Dados e configuracao

| Ficheiro | Funcao |
|---------|--------|
| `settings.json` | Configuracoes do site: textos, cores, reviews, links sociais, hero slides, landing pages. Editado pelo admin, vai no git. |
| `content.json` | (Legacy) Conteudo alternativo, pode ser removido se settings.json tiver tudo. |
| `_headers` | Headers de seguranca e cache para o Cloudflare Pages (CSP, CORS, HSTS). |
| `_redirects` | Regras de URL rewrite: landing page slugs, /privacy, etc. |
| `robots.txt` | Instrucoes para motores de busca (permite tudo, referencia sitemaps). |
| `sitemap.xml` | Mapa do site para Google (paginas + landing pages). |
| `image-sitemap.xml` | Mapa de imagens para Google Image Search. |
| `manifest.webmanifest` | Manifesto PWA (instalar no telemovel como app). |

### Cloudflare Pages Functions (serverless)

| Ficheiro | Funcao |
|---------|--------|
| `functions/api/photos.js` | API para listar fotos do Cloudinary (usa API key do servidor, nao expoe no browser). |
| `functions/api/delete-photo.js` | API para apagar fotos do Cloudinary (requer admin token). |
| `functions/api/settings.js` | API para ler/gravar settings.json (usado localmente pelo server.py). |
| `functions/api/content.js` | API para ler/gravar content.json. |

### Documentacao

| Ficheiro | Funcao |
|---------|--------|
| `CLAUDE.md` | Instrucoes para ferramentas de IA (Claude, etc.) sobre como trabalhar com o projeto. |
| `SECURITY.md` | Checklist de seguranca: Cloudinary, senhas, Supabase RLS, CORS, GDPR. |
| `ARCHITECTURE.md` | Este ficheiro — receita completa do site. |
| `privacy.html` | Politica de privacidade publica (GDPR). |

### Servidor local (dev apenas)

| Ficheiro | Funcao |
|---------|--------|
| `server.py` | Servidor Python na porta 3000. Serve ficheiros estaticos + APIs locais (/api/settings, /api/photos, etc.). So usado em desenvolvimento. |

---

## 5. Fluxo de dados — como tudo se liga

```
┌──────────────┐       push         ┌──────────────┐     auto-deploy    ┌──────────────────┐
│   VS Code    │ ──────────────────>│    GitHub     │ ──────────────────>│ Cloudflare Pages │
│  (local dev) │                    │  (repositorio)│                    │   (hosting)      │
└──────┬───────┘                    └──────────────┘                    └────────┬─────────┘
       │                                                                         │
       │  python3 server.py                                         viniciusmurari.com
       │  http://localhost:3000                                                  │
       │                                                                         │
       ▼                                                                         ▼
┌──────────────┐                                                    ┌──────────────────┐
│  Admin Panel │                                                    │   Visitante      │
│ (admin.html) │                                                    │   (browser)      │
└──────┬───────┘                                                    └────────┬─────────┘
       │                                                                     │
       │  upload fotos          lê metadados                    lê metadados │
       │  (browser direto)      das fotos                       das fotos    │
       ▼                            │                                │       │
┌──────────────┐            ┌───────▼──────┐                ┌───────▼──────┐│
│  Cloudinary  │            │   Supabase   │                │   Supabase   ││
│  (imagens)   │            │ (metadados)  │                │ (metadados)  ││
└──────────────┘            └──────────────┘                └──────────────┘│
                                                                            │
                                                               formulario  │
                                                               de contacto │
                                                                    ▼      │
                                                            ┌──────────────┐│
                                                            │  Web3Forms   ││
                                                            │  (email)     ││
                                                            └──────────────┘│
                                                                            │
                                                               analytics    │
                                                               (se aceitar) │
                                                                    ▼
                                                            ┌──────────────┐
                                                            │ Google       │
                                                            │ Analytics 4  │
                                                            └──────────────┘
```

---

## 6. Como as fotos funcionam

### Upload (admin → Cloudinary → Supabase)

1. No admin, o utilizador clica "Choose Photos" numa categoria.
2. O browser faz upload **direto** para o Cloudinary usando preset unsigned (`portfolio_upload`), pasta `portfolio/`.
3. O Cloudinary retorna a URL da imagem.
4. O admin grava os **metadados** (URL, categoria, ordem, sub-categoria) no **Supabase** (tabela `photos`).

### Exibicao (visitante → Supabase → Cloudinary)

1. O `script.js` carrega os metadados das fotos do Supabase (`GET /rest/v1/photos`).
2. Para cada foto, usa a URL do Cloudinary com transformacoes automaticas (`f_auto,q_auto,w_800`).
3. As galerias sao montadas dinamicamente no browser.

### Eliminacao (admin → Cloudflare Function → Cloudinary + Supabase)

1. O admin envia pedido para `/api/delete-photo` (Cloudflare Pages Function).
2. A function apaga a imagem no Cloudinary (usa API secret do servidor) e o registo no Supabase.

---

## 7. Como os settings funcionam

### Estrutura

O `settings.json` contem TUDO sobre o site:
- Textos do hero, about, stats, quote, contacto
- Links sociais (Instagram, Facebook, WhatsApp)
- Reviews dos clientes
- Hero slides (URLs das fotos do slideshow)
- Cor de destaque (accent color)
- Configuracoes SEO (titulo, descricao, OG image)
- Capas das categorias (`categoryCover`)
- Configuracoes de analytics (GA Measurement ID)
- Landing pages (array `landingPages` com toda a config de cada pagina)

### Fluxo de save

```
Admin edita campo → localStorage (imediato, backup local)
                   → POST /api/settings (grava settings.json no disco)
                   → Push para GitHub → Cloudflare publica novo settings.json
```

### Leitura no site publico (script.js)

O site tenta 3 fontes, nesta ordem:
1. `/api/settings` (funciona localmente com server.py)
2. `/settings.json` (funciona no Cloudflare Pages como ficheiro estatico)
3. **Supabase** tabela `site_settings` (fallback, garante que alteracoes de categoryCover etc. funcionem mesmo antes do push)

---

## 8. Autenticacao do admin

- **Algoritmo:** PBKDF2-SHA256 com 200.000 iteracoes e salt aleatorio de 16 bytes.
- **Armazenamento:** O hash fica no `localStorage` do browser (chave `adminPasswordHash`).
- **Migracao automatica:** Se o browser tiver um hash antigo SHA-256, ao fazer login ele e automaticamente atualizado para PBKDF2.
- **Hash legado (fallback):** `fd45b6bf13a9617363cfc3bb5bbfcb2554fa0c7a42d41f59393ea51ee0c57afc`
- **Token de sessao:** Gerado aleatoriamente via `crypto.getRandomValues()`, guardado em `sessionStorage`. Nao e derivado da senha.
- **Minimo:** 12 caracteres para nova senha.

---

## 9. Landing pages

O site suporta paginas de servico dedicadas (Airbnb Photography, Wedding, etc.):

- **Template:** `landing.html` (unico ficheiro reutilizado por todas as landing pages).
- **Dados:** Array `landingPages` dentro de `settings.json`. Cada entrada tem slug, SEO, hero, services, portfolio, FAQ, packages, etc.
- **Roteamento:** `_redirects` mapeia `/airbnb-photography` → `/landing.html`, etc.
- **SEO:** `landing.js` injeta JSON-LD (Service, FAQPage, BreadcrumbList) dinamicamente.

### Landing pages atuais

1. `/airbnb-photography`
2. `/restaurant-photography`
3. `/real-estate-photography`
4. `/food-photography-dublin`
5. `/product-photography`
6. `/event-photography-dublin`
7. `/wedding-photography`
8. `/corporate-photography`
9. `/drone-photography`

---

## 10. Blog / Journal

- **Template:** `blog-post.html` (carrega post individual do Supabase).
- **Dados:** Tabela `posts` no Supabase (colunas: id, slug, title, excerpt, body, cover_image, published_at, status).
- **Listagem:** `script.js` carrega posts com status `published` e mostra na seccao Journal do `index.html`.
- **SEO:** `blog-post.html` injeta JSON-LD (BlogPosting + BreadcrumbList) dinamicamente.

---

## 11. SEO e schemas implementados

O site injeta 7+ schemas JSON-LD:

| Schema | Onde | Conteudo |
|--------|------|----------|
| WebSite | index.html | Nome, URL, search action |
| Organization | index.html | Nome, logo, redes sociais |
| LocalBusiness | index.html | Morada, telefone, horario, area |
| Person | index.html | Fotografo, competencias |
| ImageGallery | script.js | Galerias dinamicas |
| Review | index.html | 6 reviews com rating |
| BreadcrumbList | landing.html, blog-post.html | Navegacao hierarquica |
| Service | landing.js | Servico da landing page |
| FAQPage | landing.js | Perguntas frequentes |
| BlogPosting | blog-post.html | Artigo do blog |

---

## 12. Seguranca

### Headers (`_headers`)

- **CSP** restrito: so permite scripts/estilos/imagens de dominios especificos.
- **HSTS** com 2 anos de max-age.
- **CORS** nos `/api/*` restrito a `https://viniciusmurari.com`.
- **X-Frame-Options, X-Content-Type-Options, X-XSS-Protection** configurados.

### Supabase RLS (Row Level Security)

A chave do Supabase no codigo e a chave publica ("anon key"). A seguranca real esta nas politicas RLS:
- `photos`: anon pode SELECT, nao pode INSERT/UPDATE/DELETE.
- `site_settings`: anon pode SELECT, nao pode INSERT/UPDATE/DELETE.
- `posts`: anon pode SELECT onde status='published', nao pode INSERT/UPDATE/DELETE.

### Cloudinary

Upload e feito via preset unsigned — a seguranca depende da configuracao do preset no dashboard do Cloudinary (ver `SECURITY.md`).

---

## 13. GDPR / Privacidade

- **Cookie banner:** Aparece so se GA Measurement ID estiver configurado. Visitante pode aceitar ou rejeitar.
- **Se rejeitar:** GA nao carrega, nenhum cookie e criado.
- **Escolha guardada:** `localStorage` chave `vm_consent_analytics`.
- **Politica:** `privacy.html` com 10 seccoes, lista todos os processadores.
- **GA4 configurado com:** `anonymize_ip`, sem Google Signals, sem personalizacao de ads.

---

## 14. Como rodar localmente

```bash
cd "/Users/viniciusmurari/new site"
python3 server.py
# Abre http://localhost:3000      (site)
# Abre http://localhost:3000/admin.html  (admin)
```

O `server.py` serve os ficheiros estaticos e implementa as APIs locais:
- `GET/POST /api/settings` — le/grava `settings.json`
- `GET /api/photos` — lista fotos (proxy para Cloudinary)
- `POST /api/delete-photo` — apaga foto
- `GET/POST /api/content` — le/grava `content.json`

---

## 15. Como publicar (deploy)

1. Fazer as alteracoes localmente (admin ou codigo).
2. Clicar "🚀 Publish" no admin para gravar tudo no `settings.json`.
3. Fazer push para o GitHub:
   ```bash
   git add -A
   git commit -m "descricao"
   git push origin main
   ```
   (Ou usar o botao "Push to GitHub" no admin, se tiver token configurado.)
4. O Cloudflare Pages deteta o push e publica automaticamente em ~30 segundos.

---

## 16. Variaveis de ambiente (Cloudflare Pages)

Configurar no dashboard do Cloudflare Pages → Settings → Environment variables:

| Variavel | Valor | Obrigatoria |
|---------|-------|-------------|
| `CLOUDINARY_CLOUD_NAME` | `dnocmwoub` | Sim |
| `CLOUDINARY_API_KEY` | (a sua key) | Sim |
| `CLOUDINARY_API_SECRET` | (o seu secret) | Sim |
| `ADMIN_TOKEN` | (opcional, para validar delete requests) | Nao |

---

## 17. Cache busting

Ao alterar CSS ou JS, atualizar o `?v=N` nos links:
- `index.html`: `styles.css?v=36`, `script.js?v=39`
- `admin.html`: `admin.css?v=2`, `admin.js?v=3`

---

## 18. Versao atual

- **Site:** v3.3
- **Admin:** v3.3 (visivel no rodape da sidebar)
- **Incrementar** o numero a cada push.
