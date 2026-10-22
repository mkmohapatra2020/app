# Mocked APIs — backend build list

The frontend is fully built against the endpoints below. They are **not deployed yet** (each returned 404 on APIM on 2026-10-20), so the site answers them from `src/mocks/mockApi.js`.

**Base URL** (same as every other API): `https://appi-wl.azure-api.net/service/api`. Paths below are relative to it.

**Auth**: every `my-*`, onboarding, eligibility and admin endpoint expects `Authorization: Bearer {token}` and must derive the user from the JWT (no user id in the query).

**Envelope**: either a bare object (as shown) or `{ "Success": true, "Message": "", "Data": <shown object> }` works — the frontend reads both, case-insensitively.

## How the mock works

- `src/services/backendClient.js` checks `mockFor(method, path)` before every call. A matching handler answers in the browser; everything else goes to APIM.
- **When an endpoint goes live:** delete its line from `HANDLERS` in `src/mocks/mockApi.js`. No UI change needed.
- **Turn all mocks off:** set `VITE_MOCK_API=off` (e.g. in `.env`) and rebuild.
- Mock state (plans owned, credits used, bonus) is kept per user in `localStorage` key `wl-mock-state`. Clear it to reset.
- Every mock user starts with **Maker** + **Silver** and an unused welcome gift.
- Side effect: a successful **live** `POST /ai-visualization/submit` spends 1 mock credit (`afterLiveCall`). The real backend must do this itself.

---

## 1. `GET /membership/families` — public

Home membership section, plan grouping.

```json
[
  { "familyCode": "DIY", "familyName": "DIY Memberships", "description": "…", "displayOrder": 1 },
  { "familyCode": "SERVICE", "familyName": "Service Memberships", "description": "…", "displayOrder": 2 }
]
```

## 2. `GET /membership/plans` — public

Home section, `/membership`, account page.

```json
[
  {
    "planId": 2, "planCode": "MAKER", "planName": "Maker", "familyCode": "DIY",
    "description": "For regular weekend makers.",
    "price": 499, "currency": "INR", "billingPeriod": "month",
    "displayOrder": 2, "isFeatured": true
  }
]
```

`price` optional (`0` shows "Free"). New plans render automatically.

## 3. `GET /membership/entitlements` — public

Rows of the `/membership` comparison matrix and the perks on each plan card.

```json
{
  "definitions": [
    { "code": "AI_MONTHLY_CREDITS", "name": "AI design credits / month", "valueType": "number", "displayOrder": 1 }
  ],
  "values": [
    { "planCode": "MAKER", "code": "AI_MONTHLY_CREDITS", "value": "15" }
  ]
}
```

- `value` is always a string: `"true"`/`"false"`, a number, or text. Codes ending in `_PERCENT` render with `%`.
- `name` is the display label; if missing the UI humanises the code.
- Codes used by the frontend logic: `AI_MAX_REFERENCE_IMAGES` (studio upload limit), `INCUBATOR_ACCESS` (mock eligibility only).

## 4. `GET /membership/my-memberships` — auth

Account → Membership "Active memberships" badges; Benefits page service block.

```json
{
  "plans": [
    {
      "membershipId": 100, "planId": 2, "planCode": "MAKER", "planName": "Maker",
      "familyCode": "DIY", "familyName": "DIY Memberships",
      "membershipSource": "DirectPurchase", "status": "Active",
      "startDate": "2026-10-01", "endDate": null
    }
  ]
}
```

Multiple memberships per user. Statuses containing `cancel`, `expired` or `inactive` are hidden.

## 5. `GET /membership/my-entitlements` — auth

Effective (merged) entitlements across all the user's plans. Studio upload limit, Benefits page, "Your plan" flags.

```json
{
  "plans": ["MAKER", "SILVER"],
  "entitlements": [
    { "code": "AI_MONTHLY_CREDITS", "value": "20" },
    { "code": "AI_MAX_REFERENCE_IMAGES", "value": "8" },
    { "code": "COMMUNITY_ACCESS", "value": "true" }
  ]
}
```

Mock merge rule: numbers → highest, booleans → any true.

## 6. `GET /membership/my-benefits` — auth

```json
{ "entitlements": [ { "code": "COMMUNITY_ACCESS", "value": "true" } ] }
```

Service exists in `membershipService.myBenefits()`; the Benefits page currently uses `my-entitlements` (same data incl. AI codes).

## 7. `GET /membership/my-ai-credits` — auth

AI Design Credits card (account, benefits page, studio). Studio blocks submission when `remaining <= 0` **or** this call fails.

```json
{ "allocated": 21, "consumed": 0, "remaining": 21 }
```

Refreshed: on studio load, after each design finishes or fails, after an admin grant, when the tab becomes visible.
Mock: `allocated = AI_MONTHLY_CREDITS + AI_WELCOME_CREDITS + bonus`.
`/membership/my-credits` (alias) is not called.

## 8. `GET /user/onboarding-status` — auth

First-login "Welcome To Weekend-Live Design Studio" modal (shown once per browser session while `false`).

```json
{ "hasReceivedWelcomeBenefit": false, "availableWelcomeCredits": 1 }
```

Backend should flip `hasReceivedWelcomeBenefit` to `true` once the welcome credit is used (mock does this on the first successful submit). "Maybe Later" is client-side only.

## 9. `GET /design-categories` — public

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

## 10. `GET /incubator/eligibility` — auth

Account dashboard incubator widget (shown only when `true`).

```json
{ "eligible": true }
```

## 11. `POST /admin/membership/grant-bonus-credits` — auth, admin only

Admin dashboard → "Grant bonus AI credits". Return 403 for non-admins.

Request:
```json
{ "userId": 123, "credits": 5, "reason": "Promotion" }
```
Response: `{ "Success": true, "Message": "Granted 5 bonus credits to user 123." }`. 400 with `{ "error": "…" }` for invalid input.

---

## Live endpoints the new screens also use (no mock)

| Endpoint | Screen |
|---|---|
| `POST /auth/logincheck` | Login (`Success:false` → shows `Message`) |
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

- **Status 2026-10-21:** returns **500** for both a correctly encrypted body and garbage, so the endpoint fails before checking credentials.
- Frontend (`VITE_AUTH_ENCRYPTION`, default `auto`): tries `/auth/login` first. Only if it fails with 5xx / 404 / network does it fall back to plain `/auth/logincheck`. A `Success:false` answer ("wrong password") is shown and never falls back.
- Set `VITE_AUTH_ENCRYPTION=strict` once `/auth/login` works, so passwords are never sent in plain JSON. `off` = plain `/auth/logincheck` only.

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
