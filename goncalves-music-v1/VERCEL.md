# Deploy

## Backend

Se usar Vercel, uma opção é mover `backend/server.js` para uma Function/Route Handler.
Mantenha `LABELGRID_API_TOKEN` somente nas Environment Variables do projeto.

## Nunca

- coloque o token no `frontend/app.js`
- coloque o token no GitHub
- coloque o token em HTML
- publique `.env`

## LabelGrid

Use sandbox durante desenvolvimento e produção somente depois que sua conta/API estiver habilitada.
