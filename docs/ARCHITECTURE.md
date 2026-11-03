# ERP — architecture and rules

Read this together with `CLAUDE.md` (working rules) and `docs/CHANGELOG.md` (what changed, when).

## What this is
A billing / ledger app for a jewellery shop (silver, sold by weight). Two codebases kept in sync by hand:

| Folder | What | Stack | Data |
|---|---|---|---|
| `erp/` | Web app (dev/testing, and the same screens as the tablet) | Vite + React | `erp/data/erp.db`, served by a tiny API inside the Vite dev server (`erp/server/`) using `node:sqlite` |
| `erp-mobile/` | Android tablet app | Expo SDK 57 / React Native 0.86 | `expo-sqlite` on the device (database name `erp.db`) |

The web app exists so features can be tested in a browser against a real SQLite file; the tablet app is what the shopkeeper uses. **Every feature must exist in both.**

## Units (never store floats for money/weight)
- Money: integer **paise** (`toPaise`/`fromPaise`). Weight: integer **milligrams** (`toMg`/`fromMg`). Time: epoch **milliseconds**.
- `pct` / `tunch` are REAL (percent). Rates are entered per **kg** (divide grams by 1000).

## Data model (SQLite)
- `party(id, name, description, cash, metal, created_at, deleted)` — `cash`/`metal` are cached **current balances**. Positive = the party owes the shop ("Naam"); negative = the shop owes the party ("Jama"). Unique name among live parties (`deleted = 0`, partial index). Deleting a party is a soft delete (`deleted = 1`).
- `item(id, name, description, pct, rate, rate_mode)` — `rate` in paise; `rate_mode` is `weight` (per kg) or `piece`. Picking an item in a sale prefills `%` and labour.
- `bill(bill_no, party_id, bill_ts, prev_cash, prev_metal, total_labour, total_weight, settlement_type none|pase|metal, settlement_rate, settlement_amount, received, balance, bhav_katna, bhav_katna_wt, metal_balance, status final|deleted, created_at)`; `bill_item` lines; `bill_metal_row` (metal given: wt, tunch, net_wt). Bill numbers are `MAX(bill_no)+1` (deleted numbers are not reused). Deleting a bill is `status = 'deleted'`.
- `ledger(tno AUTOINCREMENT, epoch, party_id, bill_no NULL, type cash|metal, kind, amount signed, balance_after, voided, chain)` — one row per cash/metal movement. The party balances are updated in the same DB transaction as every ledger write.
  - `kind`: `bill`, `received`, `edit_reversal`, `edit_bill`, `edit_received`, `delete_reversal` (sales); `opening`; `txn_in`, `txn_out`, `txn_edit_reversal`, `txn_delete_reversal` (Transaction In/Out).
  - `voided`: 0 live, 1 replaced by an edit, 2 deleted. `chain`: links every version of one Transaction In/Out (used for its edit log).
- Migrations are additive: `PRAGMA table_info` + `ALTER TABLE … ADD COLUMN` in `init()` of `db.js`. Never make a destructive migration — the tablet holds the shopkeeper's real data.

## Calculation rules (`src/calc.js`, identical in both apps)
- Packaging weight per item = `round(Σ qnt × wtG)`; net weight = `max(qty − packaging, 0)`; billed ("Silver") weight = `net × pct / 100`.
- Weight labour = `ratePerKg / 1000 × net weight` (net, not billed weight); piece labour = `rate × pieces`.
- Each item's labour and billed weight are **rounded per item**; totals are the sum of the rounded values (so printed columns add up).
- Metal given row: net = `round(wt × tunch / 100)`.
- **Pase**: `base = rate × weight / 1000`, total = base + labour.
- **Metal**: `delta = metal fine − bill weight`. Bhav katna (optional) prices only the grams the user types (`katnaWt`, capped at |delta|; `undefined` = whole difference, how old bills were saved) at `rate/1000`; the unpriced remainder stays as a **metal balance** (grams). Total cash = priced value + labour.
- A bill's effect on the party: cash `+settlement amount − received`; metal: all bill weight if no settlement, the metal balance for a Metal settlement, nothing for Pase.

## Edit / delete / history
- Editing or deleting a sale writes **reversal rows** and keeps the originals (audit trail); the bill keeps its number and party.
- Transaction In/Out (cash and/or metal paid in or out without a sale): *In* deducts from what the party owes, *Out* adds. Edit/delete use reversal rows + `voided` + `chain`.
- **Lists show only the current version** of each entry: deleted items, edit/reversal rows and superseded versions are hidden (`getTransactions`). Each opened sale / transaction shows an **edit log** at the bottom (`getBillLog`, `getTransactionLog`) — never in a printout.
- Opening balance edits (Alter Party) shift the party balance and the running `balance_after` values; they are not logged.

## Screens and navigation
Both apps use a single `screen` state in `App` (no router): `'list'`, `'new'`, `{ billNo, edit?, back? }`, `{ estimate: billNo, back? }`, `'transactions'`, `{ txn: 'in'|'out', party, txnId? }`, `{ newFor: party }`, `{ statement: true }`, `'alterParty'`, `'addParty'`, `{ partyDetail: id }`, `'alterItem'`, `'addItem'`, `{ itemDetail: item }`. Mobile also maps Android back (`BackHandler`) up one level. `back` on a screen object says where ← returns.

Sale list → bottom pills: **Add Sale**, a round **+** (pop-out: Alter Party / Alter Items), **Transaction**. Transactions screen: totals, party search, from/to dates, print (statement), per-party pills (Transaction In / Out / Add Sale). Cards open the sale or the transaction (view → Edit / Delete).

## Printing
- **Estimate** ("Rough Estimate", A4 portrait): per bill — numbered items with `Box :qnt x wt,` packing line, labour (`/kg` or `/pc`), katna row, Payment lines (metal given / Pase / cash received), Prev Bal and Final Balance (Naam/Jama). Shop name comes from `SHOP_NAME` in `src/data.js`.
- **Statement**: for the Transactions filter (party + date range): every sale as its full estimate and every Transaction In/Out / opening balance as a voucher, oldest first.
- Web: React components (`EstimateSheet.jsx`, `Statement.jsx`) + browser print → "Save as PDF" (file name `<party>-<date>`). Mobile: HTML strings (`src/estimate.js`, `src/statement.js`) shown in a WebView with SAVE (system print dialog) and SHARE (`expo-print` → `expo-sharing`). **The two layouts are duplicated — change both.**

## Code that is duplicated on purpose (keep in sync)
- `erp-mobile/src/db.js` is the **source of truth**. `erp/server/db.js` is generated from it:
  ```bash
  sed -e "s#expo-sqlite#./sqlite-node.js#; s#'./id'#'../src/id'#; s#'./calc'#'../src/calc'#" erp-mobile/src/db.js > erp/server/db.js
  ```
  (`erp/server/sqlite-node.js` adapts `node:sqlite` to the expo-sqlite API.) Restart the Vite dev server after changing DB code.
- `src/calc.js`, `src/txn.js`, `src/data.js`, `src/id.js` are identical in both apps.
- Components exist twice (`.jsx` web / `.js` React Native) with the same props.

## Run / build / test
- Web: `cd erp && npm run dev` → http://localhost:5173 (API in `server/api.js`, DB in `erp/data/erp.db`, git-ignored — **real data**).
- Tablet APK (local, no Expo account): `cd erp-mobile/android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`, then copy `app/build/outputs/apk/release/app-release.apk` to `erp-mobile/erp-mobile.apk` (git-ignored). Install with `adb install -r erp-mobile/erp-mobile.apk`.
- Compile check without a device: `cd erp-mobile && npx expo export --platform android --output-dir <tmp>`.
- **Keep the user's data on updates:** the APK is signed with `erp-mobile/android/app/debug.keystore`. An update only installs over the old app (keeping its SQLite data) if the **same key** signs it. `android/` is generated (git-ignored): do **not** run `expo prebuild --clean` or delete `debug.keystore`; **back the keystore up outside git**. Keep `applicationId com.hardikverma.erpmobile`. Migrations must stay additive.
- Testing used throwaway rows named `ZZ …` in the web DB, deleted afterwards with `sqlite3`; never touch the user's real parties/bills. Web UI was driven in the browser pane; mobile is compile-checked, and verified on the tablet by the user.
