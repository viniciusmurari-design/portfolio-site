# Portfolio Site — Vinicius Murari

## Projeto
Site portfolio de fotografia/filmmaker/designer baseado em Dublin.
Single-page com admin panel integrado para gestao de conteudo.

## Stack
- **Frontend**: HTML + CSS + JS puro (sem frameworks)
- **Servidor local**: Python (`server.py`) na porta 3000
- **Fotos**: Cloudinary (cloud `dnocmwoub`, upload preset `portfolio_upload`)
- **Metadados fotos**: Supabase (`buhuwnkljilyysyrdkxr.supabase.co`)
- **Configuracoes**: `settings.json` (salvo localmente, vai no push)
- **Hosting**: Cloudflare Pages (gratis, ilimitado) com GitHub auto-deploy
- **Formulario contato**: Web3Forms (gratis, sem conta — ver abaixo)
- **Repo**: `github.com/viniciusmurari-design/portfolio-site` branch `main`

## Como rodar localmente
```bash
cd "/Users/viniciusmurari/new site"
python3 server.py
# Abre http://localhost:3000 (site) e http://localhost:3000/admin.html (admin)
```

## Arquitetura de dados — o que vai para onde

| Dado | Storage | Persiste online? |
|------|---------|-----------------|
| Fotos das galerias | Cloudinary (imagem) + Supabase (metadados) | Sim |
| Hero slideshow config | `settings.json` (URLs do Cloudinary) | Sim, vai no push |
| Textos, cores, reviews | `settings.json` | Sim, vai no push |
| Links sociais, WhatsApp | `settings.json` | Sim, vai no push |
| Ordem das galerias | `settings.json` | Sim, vai no push |
| Formulario contato | Web3Forms | Sim (requer access key) |

## Fluxo de save (admin)
1. Admin salva -> `localStorage` (imediato) + `settings.json` via POST `/api/settings` (automatico)
2. Site principal carrega de `/api/settings` (local) ou `settings.json` (Cloudflare/estatico)
3. Fotos sobem direto para Cloudinary via upload unsigned do browser
4. Metadados das fotos vao para Supabase (visivel para todos visitantes)

## Regras de deploy
- **Trabalhar localmente** e so fazer push quando tudo estiver pronto
- **Um unico push por sessao** — Cloudflare Pages tem builds ilimitados mas e boa pratica
- **Versao no admin**: numero pequeno no rodape da sidebar (ex: v1.9). Incrementar a cada push.
- **Cache bust**: atualizar `?v=N` nos links de CSS/JS no index.html a cada mudanca

## Hero banner
- **Padrao**: CSS `::before`/`::after` com imagem Unsplash + overlay gradient
- **Slideshow**: ativado via classe `.slideshow-active` quando `heroSlides` existe no settings
- **Video**: alternativa ao slideshow, ativado via `heroVideo` no settings
- Se nenhum slide/video configurado, usa o padrao CSS (fundo escuro com foto)

## Dark mode
- So ativa se o usuario escolher explicitamente (nao segue `prefers-color-scheme` do sistema)
- Toggle via `localStorage.theme`

## Formulario de Contato (Web3Forms)
1. Acessar https://web3forms.com
2. Colocar o email (ex: hello@viniciusmurari.com)
3. Receber a access key no email
4. Colar a key no admin: Social & Integrations -> "Web3Forms Access Key"
5. Salvar — pronto, mensagens chegam no email

## Cloudflare Pages — como conectar
1. Acessar https://dash.cloudflare.com
2. Pages -> Create a project -> Connect to Git
3. Selecionar repo: viniciusmurari-design/portfolio-site
4. Build settings:
   - Framework preset: None
   - Build command: (vazio)
   - Build output directory: /
5. Environment variables (necessarias para as Functions):
   - CLOUDINARY_CLOUD_NAME = dnocmwoub
   - CLOUDINARY_API_KEY = (sua key)
   - CLOUDINARY_API_SECRET = (seu secret)
6. Deploy! Site fica online em .pages.dev

## Ficheiros principais
- `index.html` — pagina principal do portfolio
- `admin.html` — painel admin completo (galerias, conteudo, aparencia, social/SEO)
- `script.js` — logica do site (galeria, hero slideshow, form, scroll, etc.)
- `styles.css` — todos os estilos
- `server.py` — servidor local Python (API + static files)
- `settings.json` — configuracoes persistidas (vai no git)
- `_headers` — headers de seguranca/cache para Cloudflare Pages
- `functions/api/photos.js` — Cloudflare Pages Function para listar fotos
- `functions/api/delete-photo.js` — Cloudflare Pages Function para apagar fotos

## Estado atual (v1.9)
- Migrando de Netlify (pausado/pago) para Cloudflare Pages (gratis, ilimitado)
- Admin salva automaticamente no `settings.json`
- Site carrega settings do servidor/arquivo estatico
- Hero slideshow com 2 fotos de food photography do Cloudinary
- Formulario de contato usa Web3Forms (configurar key no admin)

## Comandos uteis
```bash
# Ver status
git status

# Commitar e pushar (um unico push por sessao)
git add -A
git commit -m "descricao das mudancas"
git push origin main

# Rodar servidor local
python3 server.py
```
