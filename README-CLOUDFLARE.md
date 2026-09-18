# Clareza — GitHub + Cloudflare

- GitHub: código
- Workers: aplicação
- D1 (`DB`): banco
- R2 (`BUCKET`): comprovantes

Crie `clareza-db` e `clareza-receipts`, substitua o database_id em `wrangler.jsonc`, configure `CLAREZA_APP_SECRET` como Secret e importe a migration + backup privado diretamente no D1.
