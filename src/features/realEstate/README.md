# Real Estate module (Bhumi Hisab)

Plot seller CRM, buyer payment ledger, and OCR import of paper ledgers. The module is isolated in `src/features/realEstate/` and feature-gated by the backend.

## How it plugs into the app

| File | Change |
|---|---|
| `src/App.jsx` | `<RealEstateAccessProvider>` inside `<AuthProvider>`; one lazy route `real-estate/*` behind the existing `ProtectedRoute` |
| `src/components/layout/Nav.jsx` | `<RealEstateNavigation />`: a "🏡 Real Estate" item in the main menu bar (and phone drawer), shown to **every visitor**; the language switcher; `nav-has-re` class for the compact bar (`realEstateNav.css`) |
| `tsconfig.json` | `src/features/realEstate` added to `include` |
| `vitest.config.js` | `esbuild.jsx: 'automatic'` (same JSX runtime as the app build, so shared `.jsx` components render in tests) |

Nothing else outside this folder changed. Login, tokens, memberships, payments, notifications and shared components are reused, not modified:

- **HTTP:** `apiClient` (bearer token, refresh on 401, APIM key, envelope unwrapping, `ApiError`)
- **Auth:** `requireAuth`, `AuthContext`, `ProtectedRoute`
- **UI:** `PageShell`, `EmptyState`, `LoadingSpinner`, toasts (`useToast`), `.f-field` / `.f-input` / `.btn` styles, and the theme tokens

## Access

**Current setting: open to every signed-in user** (`OPEN_TO_ALL = true` in `access/RealEstateAccessProvider.tsx`). This is a product decision that overrides the specs' "feature-gated / backend-enabled only" rule:

- **Menu:** the "Real Estate" menu-bar item is shown to every visitor.
- **Sign-in:** still required. Signed-out visitors are sent to sign in (`ProtectedRoute`).
- **Signed-in users:** they get all seven sections and all create actions, whatever `GET /realestate/access` returns. If that endpoint exists, its `partnerId` is still used as the default partner.
- **Backend:** it still authorises every call and must scope every list to the caller's partner(s). The UI setting doesn't grant data access.

**Gated mode** (`OPEN_TO_ALL = false`): the original behaviour, also covered by tests.

- **Enabling:** after sign-in, `GET /realestate/access` is called once per user. Only `data.enabled === true` enables the module. A 404, 401, 403, 5xx or network error leaves it disabled, and users see "Real Estate isn't enabled for your account".
- **Features:** `features` decides which tabs and screens show. Unknown feature names are ignored.
- **Permissions:** optional `permissions` (e.g. `"Partners.Create"`) enable fine-grained actions; admins also pass.

## The three ledger amounts

The handwritten ledger has three separate amounts. The UI never adds, subtracts or derives one from another, and an absent or unreadable amount stays `null`.

| Ledger source | Transaction field | OCR field | UI label | Styling |
|---|---|---|---|---|
| Previous column | `amount` | `totalAmountReceived` | Total received | neutral / primary |
| Lower amount written in black, after Payment Details | `commissionAmount` | `commissionAmount` | Commission (lower black amount) | charcoal |
| Amount written in red | `propertyAmount` | `propertyAmount` | Property amount (red) | red (red is reserved for this and for errors; pending dues are orange) |

Validation requires a total above 0 and a payment mode. Commission and property amount are optional; empty values are sent as `null`, and negative values are rejected. Ledger totals sum each column on its own, and outstanding = agreed value − total received.

## Frontend routes

Section navigation (with icons): 📊 Overview · 🏘️ Projects and plots · 👥 Customers and bookings · 📒 Ledger transactions · 🧾 Ledger OCR · 🗂️ Documents and images.

| Route | Screen | Feature |
|---|---|---|
| `/real-estate` | Overview: counts derived from loaded data, plus aggregates from the optional summary endpoint | — |
| `/real-estate/partners` | Removed: redirects to the overview. Partner choice remains in the project and customer forms (pre-filled when there is one partner) | — |
| `/real-estate/projects?partnerId=` | Projects: partner filter, create | Projects |
| `/real-estate/projects/:projectId/plots` | Plots: status filter, create, "Book" for Available plots only | Plots |
| `/real-estate/customers?partnerId=` | Customers and bookings: paged, search, create; Aadhaar/PAN masked | Customers |
| `/real-estate/bookings` | Bookings: paged, status filter, create with confirmation | Bookings |
| `/real-estate/bookings/:bookingId` | Booking detail: transactions and documents | Bookings |
| `/real-estate/bookings/:bookingId/ledger` | Booking ledger: history, totals, record a payment | Bookings + Ledger |
| `/real-estate/ledger?bookingId=` | Ledger transactions: booking selector + ledger | Ledger |
| `/real-estate/documents?bookingId=` | Documents and images: booking selector + upload | Bookings |
| `/real-estate/ocr?status=` | OCR batch list (or open a batch by ID when there is no list endpoint) | OCR |
| `/real-estate/ocr/new` | OCR upload: drop zone → "Analyse with GPT-6 Luna" (create batch + parse) → popup with the screenshot and editable key → value pairs per row → Submit (corrections + validate) → review page | OCR |
| `/real-estate/ocr/:batchId` | OCR review: issues, corrections, validate / approve / import / reject | OCR |

Filters and the selected booking live in the URL, so deep links and refresh keep them.

## API dependencies

Paths are relative to the API base (`VITE_BACKEND_URL`, e.g. `…/service/api`). Responses may be bare or wrapped in `{ success, message, data }`, with camelCase or PascalCase keys. Lists may be an array or `{ items, totalCount }`.

### Ledger OCR: interim direct analysis (gpt-6-luna)

Until the backend's `POST /realestate/ocr/batches/:id/parse` is ready, the upload page reads the
page itself through the site's own server route **`POST /api/ledger-ocr`**
(`api/src/lib/ledgerOcr.mjs`). In dev it is served by `vite.config.js`; in Azure Static Web Apps it
is the function `api/src/functions/ledgerOcr.mjs`. It calls
`<resource>/openai/v1/responses` with deployment `gpt-6-luna` (env `AZURE_LEDGER_DEPLOYMENT`), a
fixed prompt and a strict JSON schema, and adds `AZURE_OPENAI_API_KEY` on the server, so the key never
reaches the browser. Accepted: JPG, PNG, WebP, PDF (≤ 10 MB; big photos are scaled down first). Excel is
not supported in this mode.

Flow: choose file (upload to Blob starts) → **Analyse with GPT-6 Luna** (`/api/ledger-ocr`) → popup →
**Submit**: `POST /realestate/ocr/batches` (uploaded blob) → `POST …/corrections` with **every** reviewed
value as `ledgerRows[n].Field` → `POST …/validate` → review page. The backend must accept corrections
for rows it did not parse itself; if it doesn't, switch to `VITE_LEDGER_OCR_MODE=backend` once its parse works.

### Live (swagger checked 2026-11-04)

| Method & path | Request body |
|---|---|
| `GET /realestate/access` | — |
| `GET /realestate/partners` | — |
| `POST /realestate/partners` | `{ businessName, contactPerson, phone, email, address, gstNumber }` |
| `GET /realestate/projects?partnerId={id}` | — |
| `POST /realestate/projects` | `{ partnerId, projectName, phase, location, district, state }` |
| `GET /realestate/projects/:projectId/plots` | — |
| `POST /realestate/plots` | `{ projectId, plotNumber, area, areaUnit, facing, roadWidth }` |
| `GET /realestate/partners/:partnerId/customers` | — (whole list; search and paging happen in the browser) |
| `POST /realestate/customers` | `{ partnerId, name, phone, email, address, aadhaarNumber, panNumber }` |
| `POST /realestate/bookings` | `{ customerId, plotId, bookingAmount, agreedValue }`. **409** when the plot is unavailable |
| `GET /realestate/bookings/:bookingId/transactions` | — |
| `POST /realestate/bookings/:bookingId/transactions` | `{ transactionDate: "2026-01-15T00:00:00Z", amount, commissionAmount?, propertyAmount?, paymentMode, referenceNumber?, remarks? }`, where empty optional fields are omitted |
| `POST /realestate/documents` | `{ bookingId, documentType, blobName }` (`documentUrl` is set by the backend) |
| `POST /realestate/images/upload-grant` | `{ fileName, contentType }` |
| `POST /realestate/ocr/batches` | `{ fileName, contentType, inputType: 0–3, blobName, businessModule: "RealEstate" }`, where `inputType` is an int enum: 0 Image, 1 Pdf, 2 Excel, 3 ScannedLedgerPage (assumed order, to confirm) |
| `GET /realestate/ocr/batches/:batchId` | — |
| `POST /realestate/ocr/batches/:batchId/parse` | `{}` |
| `POST /realestate/ocr/batches/:batchId/corrections` | `{ corrections: [{ fieldName: "ledgerRows[1].CommissionAmount", value: "5000" }] }` |
| `POST /realestate/ocr/batches/:batchId/validate` | `{}` |
| `POST /realestate/ocr/batches/:batchId/approve` | `{}`. Approval only; it never imports |
| `POST /realestate/ocr/batches/:batchId/import` | `{}`. The server imports its own validated rows |
| `POST /realestate/ocr/batches/:batchId/reject` | `{ reason }` |

`ledgerRows[n]` uses the 0-based index of the row in the batch's `ledgerRows` array. Field names are `TransactionDate, CustomerName, PlotNumber, TotalAmountReceived, CommissionAmount, PropertyAmount, PaymentMode, ReferenceNumber, Remarks`.

### Not in the live swagger, so never called

| Missing route | What the UI does instead |
|---|---|
| `GET /realestate/bookings` (list) | Bookings created in this tab (`utils/recent.ts`, sessionStorage), plus "open by booking ID" |
| `GET /realestate/bookings/:bookingId` | Details and agreed value for bookings created in this tab; otherwise only the ledger, with no agreed value or outstanding |
| `GET /realestate/ocr/batches` (list) | Batches created or opened in this tab, plus "open by batch ID" |
| `GET /realestate/overview` | Overview counts from the partners, projects and customers lists only |

The session memory keeps only display fields (customer name, plot, amounts, status). It holds no Aadhaar, PAN or contact details, and it is cleared when the tab closes. If the backend adds these routes, the screens can switch back to them.

### Response fields the UI reads

- **Upload grant:** `{ uploadUrl, blobName, container?, expiresOn?, maxBytes?, allowedContentTypes?, requiredHeaders? }`.
- **Partner:** `isActive`. **Project:** `status`.
- **OCR batch:** `{ id, status, fileName, createdAt, updatedAt, confidence, rowCount, issueCount, rawText, error, ledgerRows[], validationIssues[] }`.
  - **Each row:** the canonical fields, flat or under `extracted`; optional `corrections` and `fieldConfidence`; `confidence`; `matchStatus`; `matchedBookingId`; `matchLabel`.
  - **Each issue:** `{ code, message, fieldName: "ledgerRows[n].Field", severity: "Error" | "Warning" }`. Only errors block approval.

## Safety rules enforced in the UI

- **Uploads:** same flow as the AI Space Visualizer (`src/services/blobService.js`). Files are checked locally first (max 10 MB). Documents accept JPG, PNG, WebP and PDF; OCR also accepts Excel. The UI then calls `POST /write-sas-token` `{ userId, blobName: "<userId>/yyyy/MM/dd/<uuid>.<ext>", containerName: "uploaded", storageType, contentType }` and `PUT`s the file to `blobUri?sasToken` (`x-ms-blob-type: BlockBlob`, no bearer token). It keeps only `{ blobName, container, contentType, size, fileName }`; the SAS URL is never stored. (`POST /realestate/images/upload-grant` is no longer used.)
- **OCR:**
  - Customer name and plot number are shown as matching hints, never as ids. Booking links come only from the server's `matchedBookingId`.
  - **Approve** and **Import** stay disabled while any validation error, unmatched row or unsaved correction remains. Import also requires status `Approved`; approving never imports.
  - Corrections are staged locally and sent only on **Save corrections**.
  - Approve and import show a confirmation with rows, total received, total commission, total property amount, validation issues and unmatched rows. Reject and booking also ask for confirmation.
  - Each issue shows its code, message and row/field; choosing it moves focus to that field.
- **Customer data:** Aadhaar and PAN are masked in lists (`XXXX XXXX 1234`, `XXXXXX234F`) and cleared from the form after save. The module has no logging.
- **Errors:** messages come from `ApiError` (5xx bodies are replaced by friendly text). Each state has its own view: unauthorized (sign-in link), forbidden, not found, conflict (plot no longer available), validation (field errors mapped onto the form), network (retry) and OCR extraction failure.
- **Payments:** buyer payments use only `/realestate/bookings/:id/transactions`, never the membership payment API.

## Tests

`npm test` runs `src/features/realEstate/__tests__/`, which covers:

- the access gate and navigation
- existing routes left unchanged
- 401, 403 and 409 handling
- status badges
- booking validation and confirmation
- ledger totals
- OCR editing, corrections payload and import blocking
- dedicated upload grants
- no direct OCR writes
- Aadhaar/PAN masking

## Language (English / ଓଡ଼ିଆ)

The header has a language button next to the theme button; the phone menu has a matching row. The choice is saved in `localStorage` (`wl-lang`) and sets `<html lang>`.

- **Core:** `src/i18n/language.ts`. `t('English text', { vars })` uses the English text as the key, so anything untranslated stays English. Feature dictionaries register themselves with `registerStrings`.
- **Real Estate (fully translated):** `i18n/or.ts`. A test fails if any `t('…')` string is missing an Odia translation, or a translation drops a `{placeholder}`.
- **Header:** `src/i18n/commonStrings.ts`. The rest of the site's page content is still English.
- **Font:** `@fontsource/noto-sans-oriya` is bundled. `src/i18n/odia-font.css` adds its Odia letters to Work Sans and Fraunces, so it is downloaded only when Odia text is on screen.
- **Dates:** in Odia they use built-in month names, because most browsers have no Odia date data.
- **What never changes:** amounts stay in Indian format with Western digits (₹14,00,000.00), and values sent to the API (statuses, payment modes) stay in English.
- **Review:** the Odia text is a draft translation; have a native speaker review it before launch.

## Not yet done

- WhatsApp statement export and voice notes (SRS Premium tier). These need backend endpoints.
