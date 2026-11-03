# Changelog

Newest entries at the bottom of each month's block; dates are `YYYY-MM-DD` (IST, from the session transcript).
**Rule:** every change gets an entry here — date, feature, what changed (see `CLAUDE.md`). `W` = web (`erp/`), `M` = mobile (`erp-mobile/`).

---

## 2026-07-26 — Web billing form (first version)
Feature: React (Vite) sale-entry screen built from the shopkeeper's wireframes, to be moved to React Native later.
- Top bar with invoice no., date, time. Party search with previous dues chips (Rs / gm).
- Item rows: quantity, packaging weight, net weight, %; `+ Search item to add…`; item list replaced by the real items (Chaurasi, Bichya jahalar, PK lacche, kade fansi, Jodpuri, chain, singa puri).
- Packaging popup (rows of qnt × wt) deducted from quantity; Labour popup (per piece `Rs10 x 10pc`, or per kg applied to **net** weight, not the billed weight).
- Pase / Metal settlement popups (extra/less metal, bhav quoted **per kg**), shown as an expandable applied chip with ✕; signed **Total** instead of take/give; Received, Total / Received / Balance box.
- Rounding: net weight floored; Rs and weight rounded in totals; round-off rows removed. Layout made edge-to-edge (no page border), header aligned.
Fixes this day: new item reusing the previous row's values (autofill → `autoComplete="off"`), last saved row copied to first / delete of first row (duplicate ids → `createId` with `crypto.randomUUID`), wrong totals, dropdown bleed-through.

## 2026-07-27 — React Native (Expo) app on the Android tablet
Feature: same UI ported to `erp-mobile/` (Expo, sibling folder) and installed on the connected Android tablet via Expo Go; run/install commands given.

## 2026-10-03 — Local storage, ledger, sale list, edit/delete, estimate PDF
Feature: **SQLite storage** (`expo-sqlite` on device; `node:sqlite` + API in the Vite server for web, file `erp/data/erp.db`).
- Tables `party`, `item`, `bill`, `bill_item`, `bill_metal_row`, `ledger` (every cash/metal movement as its own signed row with `tno`, epoch, bill no, kind, balance after). Cash due and cash received are separate ledger rows; metal is only booked when no settlement closed it. Save button on the form. (W+M `db.js`, `calc.js`; W `server/`)
- Party and item lists read from the DB, with create-on-the-fly; no hard-coded names.
- **Sale list** home screen (cards, UNPAID/PARTIAL/PAID badges, search, Add Sale pill); tap a card → read-only bill with **Edit** (reversal-based audit trail, same bill no.).
- ⋮ menu on cards: Edit / **Delete** (soft delete; ledger reversed).
- **Bhav katna** option in the Metal settlement (off = unpriced metal stays as a metal balance; on = priced at the rate). Metal balance shown as "Metal balance" / "Metal we owe".
- **Operations** pill + Add Party (name, description, cash, metal → opening ledger rows) and Add Items (name, description, %, labour rate per kg / per piece) forms; picking an item prefills % and labour. (Later replaced by Alter Party / Alter Items, 2026-11-03.)
- `Rs` prefix on Balance.
- **Print button → "Rough Estimate"** PDF modelled on the shopkeeper's paper bill (photo IMG_0778): A/C of, voucher no., date, Description / Gr. Wt. / L. Wt. / Net Wt. / T+W / Pc / Labour / Silver / Amount, totals, Prev Bal / Final Balance (Naam/Jama). Web: preview page with a Save button (browser Save as PDF). Mobile: PDF through `expo-print` + share sheet via `expo-sharing`.
- Estimate heading changed to the shop name; **`Box :3x25.55,`** packing line under each item name; Pc column / `500/pc` for piece labour.
- Debug APK builds: `erp-mobile.apk` via local Gradle. Explained that updating with the same signing key keeps the SQLite data.

## 2026-10-24
- Adding an item no longer pre-fills quantity with `0` (empty field). (W+M `App`)
- Shared PDF file name is now `<party name>-<bill date>` (mobile: file renamed with `expo-file-system`; web: page title). 

## 2026-10-25 — Estimate redesign, payment lines, partial bhav katna
- Estimate: numbered items, light row borders, much smaller A/C-of/Remark box, **portrait** A4 (was landscape). (W `Estimate`, M `estimate.js`)
- Stamp column removed. **Payment box** lists what the customer gave: metal rows (`Metal given 400g x 92%` → fine), Pase, bhav katna, cash received. (`calc.js paymentLines`)
- Per-item rounding: each item's Silver/Amount rounded, totals = sum of rounded values; the sale form totals follow the same rule (`grandTotals`).
- Packaging weight is **rounded to a whole number per item** before it is deducted.
- **Bhav katna takes a typed weight** ("Katna wt (g)"): only that many grams are priced at the rate, the remainder stays a metal balance. New column `bill.bhav_katna_wt`; `metalSettlement({…, katnaWt})`; `billEffects` books the remaining metal to the party. Old bills keep pricing the whole difference. (W+M `MetalPopup`, `calc.js`, `db.js`)
- Bhav katna is shown as its own **row of the estimate table** and its cash is added into the Amount total (negative if extra metal was given).
- Mobile: tapping print opens an **in-app preview** (WebView) with **SAVE** (system print dialog → Save as PDF) and **SHARE**.

## 2026-10-31
- Metal given rows round **to the nearest gram** (`round(wt × tunch / 100)`), was floor (e.g. 83 g × 40.40 % = 34 g). Stored `bill_metal_row.net_wt` uses the same function. (`calc.js`, `db.js`)

## 2026-11-03 — Transactions, statements, Alter Party / Items, edit log
**Transactions screen** (new bottom pill on the Sale list)
- Lists every ledger movement (latest first) with date/time, party, what it was, cash/metal amounts and balance after; party search with dropdown, **From/To** date pickers; cards open the sale or the transaction. No +/- signs on amounts (colour shows direction). Totals boxes on top: *Current cash/metal* of the selected party, or *Total* of all parties, in Naam/Jama.
- With a party selected: pills **Transaction In**, **Transaction Out**, **Add Sale** (opens a new sale with that party chosen).
- **Transaction In/Out** = cash and/or metal paid in (deducts from what the party owes) or out (adds). Form: party (read-only), cash, metal, Save. Opening a saved one → read-only with **Edit** and **Delete** (warning first). Edit/delete use reversal rows; `ledger.voided`, `ledger.chain` added. (`addTransaction`, `updateTransaction`, `deleteTransaction`, `getTransaction`)
- Sale view gets **Delete** next to Edit (warning). Web delete confirmations now use an in-app dialog (`ConfirmHost`) because the browser confirm box could be blocked.
- Print button on the top bar of a saved sale (opens the estimate preview). Removed the ↗ / ⋮ icons from the sale top bar and the "Pdf" button from the Sale list header.

**Statements (PDF)**
- Print button next to From/To → **statement** of the filtered party/date range. First a concise table, then (same day) **detailed**: every sale as its full estimate, every Transaction In/Out / opening balance as a voucher with Prev Bal / amount / Final Balance, oldest first. File name `<party>-<from>-to-<to>`. (W `Statement.jsx`, `EstimateSheet.jsx`; M `statement.js`, `Statement.js`; `getStatement`). Date range now survives opening a bill/transaction.

**Alter Party / Alter Items** (replaces Operations)
- Search bar + full list + bottom **Add Party / Add Items** pill; tap a party → view with **Edit** (name, description, opening cash/metal — changes the current balance by the same amount) and **Delete** (refused while the party has live sales/transactions; soft delete). Same for items (edit %, rate, per kg/piece; delete keeps old bills). Party delete = `party.deleted`; unique name only among live parties. 
- Sale list: the Operations pill became a round **+** that pops out *Alter Party* and *Alter Items* (Operations page removed).

**No edit/reversal clutter + edit log**
- Transactions list and statements show only the **current version** of each sale/transaction (deleted, edit and reversal rows hidden); sales are dated by bill date; a sale's cash+metal sit on one card.
- Opening a sale or a Transaction In/Out shows an **Edit log** at the bottom (created / each edit with previous and new amounts) — on screen only, never printed. (`getBillLog`, `getTransactionLog`, `EditLog`)

## 2026-11-03 — Repository, docs and rules
- Code pushed to https://github.com/hardik-cb/ERP (monorepo rooted at `playground/`, containing `erp/` and `erp-mobile/`). Added `CLAUDE.md` (working rules incl. the changelog/audit-log rule), `docs/ARCHITECTURE.md`, this changelog and `docs/AUDIT_LOG.md` (conversation log; customer names redacted because the repo is public).
