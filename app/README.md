# Glicemia (app)

App web (React + Vite + TypeScript, instalável como PWA) para registrar e acompanhar a glicemia. O que o app faz e por quê está em [`../PROJETO.md`](../PROJETO.md).

## Peças

- **Telas:** `src/`. As cores ficam em `src/index.css`, nos temas claro e escuro.
- **Banco e login:** Supabase. As tabelas e as regras de acesso estão em `supabase/esquema.sql`.
- **Publicação:** Vercel, com a pasta raiz `app`. A Vercel detecta o Vite sozinha.
- **Acessibilidade:** a skill `.claude/skills/acessibilidade` (contraste e auditoria das telas).

## Rodar no computador

Requer Node 20 ou mais novo.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # versão final em dist/
```

Antes, copie `.env.example` para `.env.local` e preencha com o endereço e a chave **pública** do seu projeto Supabase. Na Vercel, cadastre as mesmas duas variáveis em *Environment Variables*.
