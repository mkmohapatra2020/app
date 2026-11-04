# Mocked APIs — backend build list

The frontend is fully built against the endpoints below. They are **not deployed yet** (each returned 404 on APIM on 2026-10-20), so the site answers them from `src/mocks/mockApi.js`.

**Base URL** (same as every other API): `https://appi-wl.azure-api.net/service/api`. Paths below are relative to it.

**Auth**: every `my-*`, onboarding, eligibility and admin endpoint expects `Authorization: Bearer {token}` and must derive the user from the JWT (no user id in the query).

**Envelope**: either a bare object (as shown) or `{ "Success": true, "Message": "", "Data": <shown object> }` works — the frontend reads both, case-insensitively.

## How the mock works

- `src/services/backendClient.js` checks `mockFor(method, path)` before every call. A matching handler answers in the browser; everything else goes to APIM.
- **When an endpoint goes live:** delete its line from `HANDLERS` in `src/mocks/mockApi.js`. No UI change needed.
- **Turn all mocks off:** set `VITE_MOCK_API=off` (e.g. in `.env`) and rebuild.

---

## Membership — live, no mocks (swagger "json swa.json", checked 2026-10-29)

All membership calls go to APIM with the login token (`Authorization: Bearer …`). Nothing is mocked.

| Endpoint | Swagger response | Used for |
|---|---|---|
| `GET /membership` | ApiResponse `{ success, message, data }` | "Your membership → Membership" card (all fields) |
| `GET /membership/my-memberships` | object | "My memberships" card, account badges |
| `GET /membership/my-entitlements` | MembershipEntitlementResponse | "Entitlements" card |
| `GET /membership/my-credits` | MembershipEntitlementResponse | "Credits & limits" card, welcome pop-up (shown while `usedCredits` is 0 and `remainingCredits` > 0) |
| `GET /membership/my-ai-credits` | object | AI credits card / balance |
| `GET /membership/my-benefits` | object | Benefits page and card |
| `POST /membership/subscribe` | ApiResponse | "Become a member" form (`{ tier, plan, membershipTier }`) |
| `POST /admin/membership/grant-bonus-credits` | object | Admin → grant bonus credits `{ userId, credits, reason }` |

MembershipEntitlementResponse = `{ membership, allocatedCredits, bonusCredits, usedCredits, remainingCredits, maxReferenceImages, priorityQueue, maxConcurrentRequests }`.

**Removed from the site (not in the swagger):** `GET /membership/families`, `GET /membership/plans`, `GET /membership/entitlements` (plan cards and the comparison table), `GET /user/onboarding-status`, `GET /incubator/eligibility`. If the backend adds a plan catalogue, the plan cards can come back.

**Backend issue:** `GET /membership` and `GET /membership/my-entitlements` return 500 (empty body) when the token is missing or invalid — they should return 401 like the other `my-*` endpoints.

## 1. `GET /design-categories` — public

AI Design Studio step "Select category" and gallery filters.

```json
[
  {
    "categoryId": 1, "code": "pergola", "name": "Pergola",
    "description": "Teak or WPC pergola with climbers and lighting.", "icon": "🏡",
    "businessArea": "OutdoorLiving", "visualizationTypeId": 1,
    "promptTemplate": "a teak-wood pergola with climbing plants, outdoor seating and warm string lights",
    "displayOrder": 1
  }
]
```

- `businessArea` ∈ `OutdoorLiving | Heritage | DIY | SeniorLiving | Incubator` — sent as-is in `POST /ai-visualization/submit`.
- `visualizationTypeId` — sent as-is in submit (mock ids 1–6 are placeholders; **backend to confirm real ids**).
- `promptTemplate` — design brief merged into the AI prompt.

## Live endpoints the new screens also use (no mock)

| Endpoint | Screen |
|---|---|
| `POST /auth/login` (`{ cipherText }`) | Login (`Success:false` → shows `Message`) |
| `GET /auth/encryption-key`, `POST /auth/register` (`{ cipherText }`), `POST /auth/register/verify` | Sign-up + OTP screen |
| `POST /ai-visualization/upload` (now sends `userId`), `POST /ai-visualization/submit` (now sends `businessArea`), `GET …/{id}/status`, `GET …/{id}` | AI Design Studio |
| `GET /ai-visualization/my-history?customerId=` | My AI designs — **returns 500** in testing; needs a backend check |
| `GET /images/quota`, `GET /images/history`, `POST /images/generate` (`?userId=` / body `userId`) | `/image-generator` |
| `POST /membership/subscribe` | "Become a member" |

## Backend questions

1. Confirm the shapes above (especially `/membership/entitlements` and `visualizationTypeId` values).
2. Take the user from the JWT for `/images/*`, `ai-visualization/upload|submit|my-history` instead of client `userId`/`customerId`.
3. `my-history?customerId=1` → 500.
4. Are `/images/quota` and AI credits the same balance? The UI shows them separately for now.
5. Registration payload is RSA-OAEP-256 encrypted directly (max 190 bytes JSON). Confirm, or switch to hybrid encryption.

---

## Request encryption (frontend done — backend action needed)

Public key: `GET /auth/encryption-key` → `{ Kty, N, E, Kid, Alg: "RSA-OAEP-256", Use: "enc" }` (RSA-2048). Cached in memory for 10 min.

### Login — `POST /auth/login`

Body `{ "cipherText": base64(RSA-OAEP-SHA256(JSON { usernameOrEmail, password })) }`.

- **Status 2026-10-28:** works — a wrong password returns `200 { Success:false, Message }`. The frontend uses only this endpoint; `/auth/logincheck` is no longer called. If decryption fails (400/5xx) it re-fetches the key once and retries.

### Image generation — `POST /images/generate`

Prompts are up to 1000 characters, more than RSA can encrypt (190 bytes), so this uses a hybrid envelope:

```json
{
  "cipherText": "base64(AES-256-GCM ciphertext || 16-byte tag)",
  "encryptedKey": "base64(RSA-OAEP-SHA256(raw 32-byte AES key))",
  "iv": "base64(12-byte nonce)",
  "kid": "<Kid from /auth/encryption-key>",
  "alg": "RSA-OAEP-256+A256GCM"
}
```

Plaintext = `{ userId, prompt, style, size }`.

- **Status 2026-10-21:** the endpoint ignores `cipherText` (answers "A positive userId is required").
- Frontend flag: `VITE_IMAGE_ENCRYPTION=on` turns it on; default `off` until the backend decrypts it.
- Backend (.NET): RSA-decrypt `encryptedKey` with OAEP-SHA256 → AES key. Split `cipherText` into ciphertext + last 16 bytes tag. Use `AesGcm.Decrypt(iv, ciphertext, tag, plaintext)`.
- `GET /images/history` and `/images/quota` only carry `userId` in the query; nothing to encrypt. Better to drop `userId` and read it from the JWT.

### Try again (Try now dialog)

Now goes only through APIM, with no direct Azure OpenAI call:
- design → `POST /images/generate` (uses the image quota)
- photo → `POST /ai-visualization/upload` + `/submit` + status polling

---

## Image upload + generation via SAS (weekendlive_swagger.json, 2026-10-21)

Used by: Try now (photo and design), Try again, the Outdoor Visualizer and the Image Generator (optional photo).

| Step | Call | When |
|---|---|---|
| 1 | `POST /write-sas-token` `{ userId, blobName: "<userId>/yyyy/MM/dd/<uuid>.jpg", containerName: "uploaded", storageType: "blob", contentType }` | Once per photo, after local checks (JPG/PNG/WebP, ≤ 10 MB) |
| 2 | `PUT {blobUri}?{sasToken}` with `x-ms-blob-type: BlockBlob` | Straight to Blob Storage; the write token is then discarded |
| 3 | `POST /images/generate` `{ userId, prompt, style, size, referenceImageBlobName, referenceImageContainerName, referenceImageUrl }` | Each generate / Try again (Try again reuses step 1–2) |
| 4 | `POST /read-sas-token` `{ userId, blobName, containerName: "aigenerated", storageType: "blob" }` | Only when `imageUrl` has no SAS; cached until `expiresOn − 1 min`; history: max 4 at a time |

Backend to confirm or add:

1. **`containerName`**: `uploaded` (photos) / `aigenerated` (results), set in `STORAGE_TYPES` (`apiConfig.js`, env `VITE_STORAGE_UPLOAD` / `VITE_STORAGE_GENERATED`). **`storageType` values are not documented.** The frontend sends `"blob"` (`STORAGE_KIND`, env `VITE_STORAGE_TYPE`). Please confirm the accepted values.
2. **Reference image in `generateImageRequest`.** It has no image field. Add `referenceImageBlobName` / `referenceImageContainerName` / `referenceImageUrl` (already sent), otherwise the photo is uploaded but not used for the generation.
3. **`blobName`.** The frontend suggests one. If the server picks its own, return it in `imageSasResponse.blobName` (the frontend uses the returned value).
4. **Blob Storage CORS** on the storage account: allow `PUT, GET` from the site origin(s) and `localhost:5173`, headers `x-ms-blob-type, content-type`.
5. Old `/ai-visualization/read-sas-token` and `/write-sas-token` now return 404; the frontend no longer calls them.
6. The APIM subscription key in `.env` is now rejected (401 "invalid subscription key") on every endpoint. It was probably regenerated.

---

## AI visualization draft workflow (mocked — all routes returned 404 on 2026-10-27)

Spec: `AI_VISUALIZATION_UI_IMPLEMENTATION_PROMPT.md`. Mock: `src/mocks/visualizationWorkflowMock.js` (delete a route there when it ships). Customer is always taken from the bearer token; the UI never sends a customer id, role or location.

| Method | Path | Request | Response the UI reads |
|---|---|---|---|
| POST | `/ai-visualization/drafts` | `{}` | `{ requestId, status: "Draft", generationMode, remainingQuota, maxReferenceImages?, maxSitePhotos?, canChangeGenerationMode? }` |
| POST | `/ai-visualization/{id}/site-photo/upload` | `{ fileName, contentType, assetId? }` (`assetId` = re-issue SAS for a failed upload, no new record) | `{ assetId, blobUri, sasToken, blobName, expiresOn, maxReferenceImages? }` → browser `PUT {blobUri}?{sasToken}` with `x-ms-blob-type: BlockBlob` |
| POST | `/ai-visualization/{id}/reference-image/upload` | same | same (422 when over the limit) |
| POST | `/ai-visualization/{id}/submit` | `{ visualizationTypeId, projectName, userPrompt, additionalDetail, maxBudget?, budgetCurrency?, generationMode, details: { campaign?, requirements, outputType } }` | `{ requestId, status, generationMode, remainingQuota }`; 402 / 403 / 404 / 409 / 422 as in the spec |
| GET | `/ai-visualization/{id}/status` | — | `{ status, reviewNotes? }` |
| GET | `/ai-visualization/{id}` | — | request + `images: [{ imageOrder, imageUrl, expiresOn }]` (temporary read URLs) |
| GET | `/ai-visualization/my-history` | **no `customerId`** | array of requests (legacy `?customerId=` calls still go to the live endpoint) |
| GET | `/design-categories` | — | `[{ visualizationTypeId, code, name, description, icon, fieldSet?: "kids"\|"family", displayOrder }]` |
| GET | `/admin/ai-visualizations` | `status, mode, visualizationTypeId, customer, from, to, failed, page, pageSize` | `{ total, page, pageSize, items }` |
| GET | `/admin/ai-visualizations/{id}` | — | request + `customer, locationSnapshot, computedPrompt, promptRevisions, statusHistory, quota, sitePhotos, referenceImages, rejectQuotaPolicy` |
| POST | `/admin/ai-visualizations/{id}/approve \| submit \| request-changes \| reject \| retry` | submit: `{ userPrompt, additionalDetail, generationMode }`; request-changes: `{ reviewNotes }`; reject: `{ reason }` | updated request |

Statuses: `Draft, Submitted, Queued, Processing, PendingReview, ChangesRequested, Completed, Failed, Rejected, Cancelled`. Mock rules: quota is charged once when generation starts (Auto submit / approve / admin submit), never on reject. Retry is free. A prompt containing `#fail` ends in `Failed` (for testing).

**Backend to confirm:** real `visualizationTypeId` values (mock uses 101–108), the `details` object shape, how `ImageGenOpt` and the reference limit are returned, and the reject quota policy text.

---

## Learning / Knowledge Center (deployed, not yet on APIM — checked 2026-10-28)

All 9 routes answer on the Function App (`…azurewebsites.net/api/api/learn/*`) but return **404 on APIM** (`appi-wl.azure-api.net/service/api/learn/*`). **Backend/APIM action: add the Learning operations to the APIM API.**

The frontend calls APIM first. Only when APIM answers 404 (or, in local dev, the browser call is CORS-blocked) does it use `src/mocks/learnMock.js`, which serves a snapshot of the live catalog (`learnFixture.json`: 14 categories, 13 paths, 9 certifications, 55 workshops). Once APIM publishes the routes, live data is used automatically. Delete the fixture afterwards.

| Method | Path | Used by |
|---|---|---|
| GET | `/learn/categories` | Learn › topic chips |
| GET | `/learn/workshops?ageGroup&skillLevel&projectType&toolType&duration` | Learn › Workshops (filters sent to the API) |
| GET | `/learn/workshops/{id}` | `/learn/workshops/:id` detail |
| POST | `/learn/workshops/{id}/register` | Detail › Register (body `{ userId, name, email, phone, participants, notes }`) |
| GET | `/learn/paths` | Learn › Learning paths (steps by `sequence`) |
| GET | `/learn/certifications` | Learn › Certifications |
| GET | `/learn/dashboard/{userId}` | Learn › My learning |
| POST | `/learn/incubator/concepts` | Learn › Submit an idea `{ userId, title, description }` → expects `data.conceptId` |
| POST | `/learn/media?conceptId&userId&fileName&fileType&youtubeVideoLink` | Optional file / YouTube link for the idea (binary body) |

Notes: most paths have `steps: []` (only Woodworking Fundamentals has steps). `imageUrl`/`toolsUsed`/`takeHomeProject` are mostly empty, so the UI shows series icons and hides empty sections. Please confirm the concept response returns `conceptId`.

## Real Estate CRM, ledger and OCR — live (swagger checked 2026-11-04)

All 19 `/realestate/*` routes from the Real Estate spec are deployed, and the UI calls them through APIM with the login token. There is no mock or sample data for Real Estate: every screen uses the live API.

**Not in the swagger, so the UI never calls them:**

| Missing route | What the UI does instead |
|---|---|
| `GET /realestate/bookings` (list; 404 — only `POST` exists) | Lists the bookings created in this browser tab (sessionStorage), and any booking can be opened by ID |
| `GET /realestate/bookings/{id}` | Shows details and the agreed value for bookings created in this tab. For other bookings it shows only the ledger, with no agreed value or outstanding |
| `GET /realestate/ocr/batches` (list) | Lists the batches created or opened in this tab, plus an "Open a batch by ID" form |
| `GET /realestate/overview` | The Overview counts partners, active projects and the user's partner's customers from the list calls; other totals aren't computed |

`GET /realestate/partners/{partnerId}/customers` has no paging or search parameters, so the whole list is loaded and searched and paged in the browser. Empty optional fields (commission, property amount, reference, remarks, email…) are **left out** of request bodies rather than sent as `null`, `0` or `""`, because the swagger models them as non-nullable.

**Backend questions and issues:**

- **Unauthenticated calls return 500.** Without a token, `/realestate/*` returns 500 with an empty body, where it should return 401 (`/membership/my-credits` correctly returns 401).
- **`createOcrBatchRequest.inputType` values.** It is an `int32` enum `0–3` with no names. The UI assumes `0 Image, 1 Pdf, 2 Excel, 3 ScannedLedgerPage`, following the order in the Platform OCR spec. Please confirm.
- **Nullable amounts.** `createTransactionRequest.commissionAmount` and `propertyAmount` are `double` in the swagger. When the ledger has no value, the UI leaves the field out. If the backend defaults it to `0`, "no commission written" can't be told apart from "commission 0", so please make them `double?`.
- **Documents.** `createDocumentRequest` is sent as `{ bookingId, documentType, blobName }`. `documentUrl` is left for the backend to set, because the UI never builds storage URLs.
- **Response shapes.** All Real Estate responses are `ApiResponse` with an untyped `data`. The UI reads the field names listed in `src/features/realEstate/README.md` (camelCase or PascalCase).
