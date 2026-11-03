# ERP — instructions for any agent working in this repo

Jewellery-shop billing/ledger app: web (`erp/`, Vite + React) and Android tablet app (`erp-mobile/`, Expo / React Native). **Read `docs/ARCHITECTURE.md` first** (data model, calculation rules, what is duplicated and how to keep it in sync, how to build), then the latest entries of `docs/CHANGELOG.md` (what changed and when). `docs/AUDIT_LOG.md` is the full conversation history behind every change.

## Rules (always follow)

1. **Changelog rule — every update, new feature or change gets an entry in `docs/CHANGELOG.md`.**
   - Heading: `## YYYY-MM-DD — <feature name>` using the real date of the change (not a relative date).
   - Body: *what feature was implemented or changed*, *what exactly changed* (behaviour, rules, tables/columns, files; mark `W` web / `M` mobile), and anything the next agent must know (migrations, sync steps, caveats).
   - Write it **in the same change/commit** as the code. If a rule, table, column or flow changed, also update `docs/ARCHITECTURE.md`.
2. **Audit-log rule — after every task, append to `docs/AUDIT_LOG.md`:** date/time, *what the user said* (verbatim or faithfully condensed) and *what the agent said/did* (the reply and key decisions). Never rewrite old entries; append only. Because this repository is **public**, replace real customer/party names, amounts tied to real people, emails and phone numbers with placeholders (`<customer 1>`, `<shop name>`) before committing.
3. **Both apps, always.** A feature or fix must be implemented in `erp/` and `erp-mobile/`. Respect the duplicated code: `erp-mobile/src/db.js` is the source of truth and `erp/server/db.js` is generated from it (command in `docs/ARCHITECTURE.md`); `calc.js`, `txn.js`, `data.js`, `id.js` are identical in both; estimate/statement layouts exist twice.
4. **Never lose the user's data.** The tablet holds real shop data in SQLite. Migrations are additive only (`ALTER TABLE … ADD COLUMN`). Never delete `erp-mobile/android/app/debug.keystore`, never run `expo prebuild --clean`, keep the application id — otherwise an APK update cannot be installed over the old app without wiping its data. Back the keystore up outside git. `erp/data/erp.db` is also real data: test only with throwaway `ZZ …` rows and delete them afterwards; never touch the user's real parties/bills.
5. **Never commit** `data/`, `*.db`, `*.apk`, keystores/keys, `.env*`, `node_modules`, `android/`, `ios/` (they are git-ignored — keep it that way).
6. **Be honest about verification.** Web features are tested in the browser; mobile is compile-checked (`npx expo export --platform android`) unless the tablet was connected. Say which, and say if a device test was not possible.

## Conventions the user asked for (keep)
- Money/weights are stored as integers (paise / mg). Show whole numbers (rounded) on screen and prints; rounding is per item, totals are sums of rounded values.
- Balances: positive = party owes the shop (**Naam**), negative = shop owes the party (**Jama**). Do not show `+`/`−` signs on transaction amounts; use colour and Naam/Jama wording. Put `Rs` in front of rupee values.
- Edits and deletes never erase history (reversal rows). Lists show only the current version; the history is in the per-item **edit log**, which is never printed.
- Destructive actions (delete) always show a warning first (web: `ConfirmHost` dialog, mobile: `Alert`).
- When asked to "create build / build apk": build the release APK locally (command in `docs/ARCHITECTURE.md`), copy it to `erp-mobile/erp-mobile.apk`, and give the `adb install -r` command (installing as an update keeps data).
- Dev server for web: `cd erp && npm run dev` (port 5173). Restart it after changing `server/` code.

## Git
Repository root is `playground/` (it contains `erp/` and `erp-mobile/`; other folders there are ignored by the allow-list `.gitignore`). Remote: `https://github.com/hardik-cb/ERP.git`, branch `main`. Commit messages: short, with the feature name and date. Push only when the user asks.
