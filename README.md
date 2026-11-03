# ERP

Billing and ledger app for a jewellery shop.

- `erp/` — web app (Vite + React) with a local SQLite API for development/testing
- `erp-mobile/` — Android tablet app (Expo / React Native, SQLite on device)
- `docs/` — `ARCHITECTURE.md` (design and rules), `CHANGELOG.md` (dated changes), `AUDIT_LOG.md` (conversation history)
- `CLAUDE.md` — working rules for AI agents (including the changelog / audit-log rules)

Run the web app: `cd erp && npm install && npm run dev`. Build the tablet APK: see `docs/ARCHITECTURE.md`.
