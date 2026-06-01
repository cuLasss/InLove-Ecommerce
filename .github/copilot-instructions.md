# Project Rules

## Goal

Deliver simple, functional and maintainable solutions.

## Generation Rules

- Prefer the smallest solution that solves the problem.
- Avoid unnecessary files.
- Do not change architecture without explaining the impact.
- Do not add dependencies without a reason.
- Respect the existing stack.
- For large changes, propose clear steps first.
- For bugs, identify the root cause before editing.
- For refactors, preserve current behavior.
- Write clear and direct code.
- Avoid obvious comments.
- Always suggest how to test locally.

## Security Rules

- Never commit real `.env` files.
- Never put Supabase `service_role` in browser code.
- Never commit fiscal tokens, certificates, private keys, NF-e XMLs or client data.
- Keep public repositories limited to sanitized demo data.
