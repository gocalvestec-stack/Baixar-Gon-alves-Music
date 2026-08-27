# Gonçalves Music V1

Distribuidora musical white-label preparada para integração com a API da LabelGrid.

## O que já está incluído

- Site público responsivo
- Cadastro/login demonstrativo no frontend
- Dashboard do artista
- Formulário de novo lançamento
- Upload de áudio e capa para o backend
- Backend Node/Express
- Cliente LabelGrid no servidor
- Validação e distribuição via LabelGrid
- Consulta de lançamentos
- Consulta de status de entrega
- Webhook para eventos da LabelGrid
- Schema SQL para Supabase
- Variáveis de ambiente
- Modo sandbox/produção

## Importante

O token da LabelGrid NUNCA deve ser colocado no frontend.

1. Crie/ative seu plano de API da LabelGrid.
2. Gere um Bearer Token.
3. Copie `.env.example` para `.env`.
4. Preencha `LABELGRID_API_TOKEN`.
5. Use sandbox para testes.
6. Depois troque `LABELGRID_BASE_URL` para produção.

A API precisa estar habilitada na sua conta LabelGrid.

## Rodar localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Abra:

http://localhost:3000

## Vercel

O backend pode ser adaptado para Functions/Serverless. Para a primeira instalação, é recomendado testar localmente e depois publicar o backend com as mesmas variáveis de ambiente.

## Supabase

Execute `supabase/schema.sql` no SQL Editor do seu projeto Supabase.

## Próxima etapa

A V1 deixa a integração com LabelGrid concentrada em `backend/services/labelgrid.js`. Assim, mudanças de API ou troca de fornecedor não exigem reconstruir o painel inteiro.
