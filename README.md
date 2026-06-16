# MemeFlow

Aplicação full-stack de vídeos/memes estilo TikTok/Reels com Vite + React + TypeScript, Tailwind CSS, componentes shadcn/ui-style, Supabase Auth/Database/Storage/Realtime e deploy na Vercel.

## Stack

- Frontend: Vite + React + TypeScript
- Estilização: Tailwind CSS + componentes em `src/components/ui`
- Backend/BaaS: Supabase Auth, Postgres, Storage e Realtime
- Rotas: `react-router-dom` v6
- Formulários/validação: `react-hook-form` + `zod`
- Toasts: `sonner`

## Scripts SQL finais

O script completo está em:

```text
supabase/schema.sql
```

Ele cria tabelas, índices, triggers, RLS, policies, buckets `videos`, `thumbnails` e `avatars`, e habilita Realtime para `messages`.

### Nota sobre `storage.foldername(name)[1]`

A abordagem foi mantida e corrigida: no Supabase atual, `storage.foldername(name)` retorna as pastas do path do objeto. Como a aplicação faz upload sempre em `{user_id}/arquivo.ext`, a policy valida:

```sql
auth.uid()::text = (storage.foldername(name))[1]
```

A correção importante em relação ao script base foi aplicar essa validação também no `INSERT`, não apenas em `UPDATE/DELETE`, para impedir que um usuário envie arquivos para a pasta de outro usuário.

## Variáveis de ambiente

Crie um arquivo `.env` baseado em `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## Rodar localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Guia detalhado de configuração e deploy

### 1. Criar projeto no Supabase e obter URL/Anon Key

1. Acesse https://supabase.com/dashboard.
2. Clique em **New project**.
3. Escolha a organização, nome do projeto, região e senha do banco.
4. Aguarde a criação do projeto.
5. Vá em **Project Settings > API**.
6. Copie:
   - **Project URL** para `VITE_SUPABASE_URL`.
   - **anon public key** para `VITE_SUPABASE_ANON_KEY`.

### 2. Rodar scripts SQL no SQL Editor

1. No Supabase, abra **SQL Editor**.
2. Crie uma nova query.
3. Cole todo o conteúdo de `supabase/schema.sql`.
4. Clique em **Run**.

O script inclui:

- `profiles`, `videos`, `likes`, `comments`, `follows`, `messages`.
- Índices para feed, busca, mensagens e contadores.
- Triggers de `updated_at`.
- Trigger `handle_new_user` para criar perfil automaticamente no cadastro.
- RLS em todas as tabelas.
- Policies finais de banco.
- Buckets e policies de Storage.
- Realtime em `messages`.

### 3. Habilitar Realtime em `messages`

O script já tenta executar:

```sql
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

Se preferir conferir pelo painel:

1. Vá em **Database > Replication**.
2. Procure a publication `supabase_realtime`.
3. Garanta que a tabela `messages` esteja habilitada.

A aplicação usa `supabase.channel` para receber mensagens novas instantaneamente nas rotas `/chat` e `/chat/:userId`.

### 4. Configurar autenticação

1. Vá em **Authentication > Providers**.
2. Habilite **Email**.
3. Em **Email Auth**, habilite cadastro por email/senha.
4. Para recuperação de senha, mantenha o envio de emails ativo.
5. Vá em **Authentication > URL Configuration**.
6. Configure:
   - **Site URL local** durante desenvolvimento: `http://localhost:5173`
   - **Redirect URLs**:
     - `http://localhost:5173/*`
     - `https://seu-dominio-vercel.vercel.app/*`

A rota de recuperação usa redirect para:

```text
/profile/edit
```

Depois do deploy, inclua a URL final da Vercel nas redirect URLs do Supabase.

### 5. Criar buckets `videos` e `thumbnails` pelo painel

O script já cria os buckets `videos`, `thumbnails` e `avatars`. Se preferir criar pelo painel:

1. Vá em **Storage**.
2. Clique em **New bucket**.
3. Crie:
   - `videos` como público.
   - `thumbnails` como público.
   - `avatars` como público.
4. Depois rode o script SQL para aplicar as policies.

Leitura pública é necessária para que URLs públicas funcionem no feed/perfil. Escrita continua protegida por RLS/Storage policies.

### 6. Convenção obrigatória de upload

A aplicação respeita a estrutura:

```text
{user_id}/nome-do-arquivo.ext
```

Implementado em:

```text
src/hooks/useUpload.ts
```

Essa convenção é essencial para as policies de Storage funcionarem.

### 7. Configurar `.env` local

Na raiz do projeto:

```bash
cp .env.example .env
```

Edite `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 8. Execução local

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:5173
```

### 9. GitHub

```bash
git init
git add .
git commit -m "Initial MemeFlow app"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

### 10. Deploy na Vercel

1. Acesse https://vercel.com.
2. Clique em **Add New > Project**.
3. Conecte o repositório GitHub.
4. Framework: **Vite**.
5. Configure:
   - Build command: `vite build` ou `npm run build`
   - Output directory: `dist`
6. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Clique em **Deploy**.
8. Copie a URL final da Vercel.
9. Volte ao Supabase em **Authentication > URL Configuration** e adicione:
   - `https://sua-app.vercel.app/*`
   - defina **Site URL** como `https://sua-app.vercel.app` em produção.

### 11. Possíveis ajustes extras

- Se uploads grandes falharem, ajuste `file_size_limit` dos buckets no SQL ou pelo painel.
- Se vídeos externos não mostrarem thumbnail automática, isso é limitação de CORS do provedor externo. Upload direto gera thumbnail automaticamente pelo navegador.
- Se emails não chegarem em produção, configure SMTP próprio em **Authentication > SMTP Settings**.
- Para domínios personalizados na Vercel, adicione também o domínio em **Redirect URLs** do Supabase.

## Rotas implementadas

- `/` Feed protegido
- `/explore` Explorar vídeos recentes e busca
- `/upload` Criar/editar vídeo protegido
- `/video/:id` Detalhes, like e comentários
- `/profile/:username` Perfil público
- `/profile/edit` Edição protegida
- `/chat` Lista de conversas protegida
- `/chat/:userId` Chat em tempo real protegido
- `/login` Login
- `/register` Cadastro
- `/forgot-password` Recuperação de senha

## Verificação

Este projeto foi verificado com:

```bash
npm run build
```
