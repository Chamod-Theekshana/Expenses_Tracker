# Expense Tracker — Improvement Summary

## Critical Issues Fixed

### 🔴 Security Fixes

1. **Committed Firebase service account key** (`backend/expense-tracker-e234c-firebase-adminsdk-fbsvc-6c615d456c.json`)
   - **Impact**: Full access to Firebase project by anyone with repo access
   - **Fix**: File removed, added to `.gitignore`

2. **OTP generated with `Math.random()`** (non-cryptographic)
   - **Files**: `backend/src/config/otp.ts`, `backend/src/config/signupAuth.ts`
   - **Fix**: Replaced with `crypto.randomInt()` (cryptographically secure)

3. **`verifyOTPAndSignUp` issued random bytes instead of a JWT**
   - **File**: `backend/src/controllers/otpController.ts`
   - **Impact**: OTP-verified users couldn't use the API (invalid token format)
   - **Fix**: Issues proper `signAccessToken()` JWT

4. **Hardcoded demo credentials in SignInScreen**
   - **File**: `mobile/src/views/auth/SignInScreen.tsx`
   - **Impact**: All users' default state shows demo email/password
   - **Fix**: Empty inputs by default

5. **Password minimum length inconsistency** (6 chars mobile vs not enforced on change)
   - **Files**: Mobile auth screens, profile screen, backend controllers
   - **Fix**: Standardized to 8 characters minimum everywhere

6. **bcrypt cost factor 10** (low for modern hardware)
   - **Files**: `backend/src/controllers/authController.ts`, `profileController.ts`, `signupController.ts`
   - **Fix**: Upgraded to cost factor 12

7. **`CORS_ORIGIN=*`** in production default
   - **File**: `backend/.env.example`
   - **Fix**: Updated example to use specific origins with clear warning

---

### 🔴 Build-Breaking Bugs

8. **TypeScript error: `sql<T>` type arguments not supported by neon client**
   - **File**: `backend/src/models/CategoryModel.ts`
   - **Fix**: Removed generic type arguments, used proper casts

9. **TypeScript error: JWT `expiresIn` option type mismatch**
   - **File**: `backend/src/utils/jwt.ts`
   - **Fix**: Correct `SignOptions` typing for `jwt.sign()`

10. **`Icon` component `size` prop didn't allow `48`**
    - **File**: `mobile/src/components/Icon.tsx`
    - **Build error**: GoalsScreen used `size={48}`, not in allowed `IconSize` union
    - **Fix**: Added `36 | 40 | 48` to `IconSize` type

---

### 🟠 Logic Bugs

11. **Recurring scheduler ran at 1:26 AM despite comments saying 9:00 AM**
    - **File**: `backend/src/services/recurringScheduler.ts`
    - **Fix**: Corrected to `scheduleDailyAt(9, 0)`

12. **Recurring scheduler had no startup catch-up run**
    - If the server was down when recurrences were due, they'd be skipped until next day
    - **Fix**: Calls `processRecurringTransactions()` immediately on startup

13. **Recurring transactions created without the recurrence's currency**
    - **File**: `backend/src/services/recurringScheduler.ts`
    - **Fix**: Passes `item.currency` to `TransactionModel.create()`

14. **Goal reminder cron: comment said 9:00 AM, code ran at 3:00 PM (15:00)**
    - **File**: `backend/src/services/GoalReminderService.ts`
    - **Fix**: Corrected to `'0 9 * * *'`

15. **`BudgetModel` date filter: `<= endDate + interval '1 day'`** included next day's transactions
    - **File**: `backend/src/models/BudgetModel.ts`
    - **Fix**: Removed incorrect `+ interval '1 day'`

16. **`removeTx()` didn't accept `userId` for rollback on failure**
    - **File**: `mobile/src/store/transactions.tsx`
    - **Fix**: Added `userId` parameter; optimistic delete with rollback on API error

17. **OTP for new user creates account with raw `Math.random()` hex password**
    - **File**: `backend/src/controllers/otpController.ts`
    - **Fix**: Uses `bcrypt.hash()` on random bytes for the unusable password

18. **`convertAmount` in HomeScreen used inverse exchange rate** (divided instead of multiplied)
    - The `rates` object from `ExchangeRateService.getRates(preferredCurrency)` returns rates *from* the preferred currency, not to it
    - The conversion `amount / rateToTx` is incorrect in that context
    - **Note**: The server-side conversion in `exchangeRateService.ts` is correct; the mobile-side rates object interpretation needs to match the backend's `getAllRates(base)` response structure

---

### 🟡 Performance Issues

19. **`ProfileContext` value not memoized**
    - **File**: `mobile/src/store/profile.tsx`
    - **Fix**: Wrapped context value in `useMemo()`

20. **Summary API does N currency conversions sequentially per transaction**
    - **File**: `backend/src/controllers/transactionsController.ts`
    - The loop `for (const tx of transactions) { await convert(...) }` is O(N) sequential API calls
    - **Fix**: Added `try/catch` per conversion to prevent one failure killing the whole response; full batching deferred as a future optimization

21. **`addTx`/`updateTx` re-fetch all transactions after every mutation**
    - **File**: `mobile/src/store/transactions.tsx`
    - This is acceptable for correctness and consistency with server state. Kept as-is.

---

### 🟡 Error Handling Improvements

22. **`http.ts` had no request timeout** — network hangs would freeze UI indefinitely
    - **File**: `mobile/src/services/http.ts`
    - **Fix**: 15-second timeout with `AbortController`; surfaces timeout as user-friendly message

23. **Auth store didn't handle corrupted `AsyncStorage` data**
    - **File**: `mobile/src/store/auth.tsx`
    - **Fix**: Added `try/catch` around `JSON.parse`; clears corrupted storage

24. **`RateLimiter` returned 500 on Redis failure** (fail-closed)
    - **File**: `backend/src/middleware/RateLimiter.ts`
    - **Fix**: Fail-open on rate limiter errors (Redis down shouldn't 500 all requests)

25. **`errorHandler` always returned 500** regardless of error status
    - **File**: `backend/src/middleware/errorHandler.ts`
    - **Fix**: Checks `err.status` / `err.statusCode` to relay correct status code

26. **Exchange rate conversion failure crashes entire summary endpoint**
    - **File**: `backend/src/controllers/transactionsController.ts`
    - **Fix**: Per-transaction `try/catch` falls back to raw amount on conversion failure

---

### 🟡 Validation Improvements

27. **Transaction amount `0` was accepted**
    - **File**: `backend/src/middleware/validators.ts`
    - **Fix**: Rejects `amount === 0` with clear error

28. **No max length on title field** (could insert very long strings)
    - **Fix**: 200-character limit on title, 100 on name

29. **`profile_photo` URL not validated** (any string accepted)
    - **Fix**: Basic URL parsing to ensure it's a valid URL

30. **Email regex too weak** (`includes('@')` check only)
    - **Files**: Multiple controllers
    - **Fix**: Proper email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

31. **Date validation didn't verify actual calendar validity**
    - **Fix**: Parses date with `new Date()` after regex check

---

### 🟡 Code Quality / Maintainability

32. **`authController.ts` used `req: any, res: any`** — no type safety
    - **Fix**: Typed as `Request, Response` from express

33. **`otpController.ts` used `req: any, res: any`**
    - **Fix**: Typed properly

34. **Dead code: `AuthViewModel`, `ProfileViewModel`, `TransactionViewModel`**
    - All unused; context stores handle the same functionality
    - **Fix**: Marked as `@deprecated`, bodies removed

35. **`signupAuth.ts` duplicate `import crypto` after adding `randomInt`**
    - **Fix**: Single clean import

36. **`server.ts` missing security headers** (no helmet)
    - **Fix**: Added `helmet()` middleware

37. **`server.ts` missing 404 handler** (unmatched routes returned no response from Express 5)
    - **Fix**: Added `app.use(() => 404)` catch-all

38. **`server.ts` missing graceful shutdown** on SIGTERM
    - **Fix**: Added `process.on('SIGTERM', ...)` handler

39. **`server.ts` had `otpRoutes` not mounted** despite the controller and routes existing
    - **Fix**: Added `app.use('/api/auth', otpRoutes)`

40. **Cloudinary upload check was backwards** (`!== 'dkw8nqukp'` threw error when name matched)
    - **File**: `mobile/src/utils/cloudinary.ts`
    - **Fix**: Checks for empty/falsy value instead; unique filename per upload

41. **`money.ts` didn't handle `NaN` input to `formatMoney()`**
    - **Fix**: Returns `0.00` for non-finite inputs; added `parseAmount()` helper

42. **`money.ts` only had 11 currencies**
    - **Fix**: Extended to 22 common currencies

43. **`RateLimiter.ts` X-Forwarded-For parsing** could include proxy chain IPs
    - **Fix**: Uses first IP in the forwarded chain (closest client)

44. **`CategoryModel.seedDefaults` seeded only 6 categories** (missing Health, Entertainment, Salary, Groceries, Rent)
    - **Fix**: Seeded 9 defaults; uses `ON CONFLICT DO NOTHING` for safety

45. **Auto-starting periodic test notifications on every login** (RootNavigator)
    - Sent "Hi user! PulseSpend is tracking..." every 60 seconds during use
    - **Fix**: Removed entirely; real events (budget alerts, recurring, goals) replace this

46. **Socket events `tx:updated` and `budget:alert`/`goal:completed` not handled in RootNavigator**
    - **Fix**: Added handlers for all server-emitted socket events

---

## Files Changed

### Backend
| File | Change |
|------|--------|
| `src/config/otp.ts` | Crypto-secure OTP generation |
| `src/config/signupAuth.ts` | Crypto-secure OTP generation |
| `src/controllers/authController.ts` | Proper types, stronger bcrypt, email validation, 409 for duplicate |
| `src/controllers/transactionsController.ts` | Proper types, resilient currency conversion |
| `src/controllers/profileController.ts` | Proper types, password min 8 chars |
| `src/controllers/otpController.ts` | Proper JWT tokens, email validation, category seeding |
| `src/middleware/RateLimiter.ts` | Fail-open, safer IP extraction |
| `src/middleware/errorHandler.ts` | Respects `err.status` |
| `src/middleware/validators.ts` | Amount ≠ 0, max lengths, URL validation, email validator |
| `src/models/CategoryModel.ts` | TS fixes, more default categories, ON CONFLICT safety |
| `src/models/BudgetModel.ts` | Fix date filter bug |
| `src/services/GoalReminderService.ts` | Fix cron expression (3PM → 9AM), better messages |
| `src/services/recurringScheduler.ts` | Fix schedule time, startup run, pass currency |
| `src/utils/jwt.ts` | Fix TypeScript SignOptions type error |
| `src/server.ts` | Helmet, CORS, 404, graceful shutdown, health endpoint, otpRoutes mounted |
| `.env.example` | Clear documentation of all variables |

### Mobile
| File | Change |
|------|--------|
| `src/components/Icon.tsx` | Added `36 \| 40 \| 48` to `IconSize` type |
| `src/navigation/RootNavigator.tsx` | Remove test notifications, add all socket events |
| `src/services/http.ts` | Request timeout (15s), status on errors |
| `src/store/auth.tsx` | Handle corrupted storage, deduplicated `persistSession` |
| `src/store/profile.tsx` | Added `useMemo` to context value |
| `src/store/transactions.tsx` | `error` state, optimistic delete with rollback, `userId` param |
| `src/utils/cloudinary.ts` | Fix backwards check, unique filenames |
| `src/utils/money.ts` | Handle NaN, 22 currencies, compact large numbers, `parseAmount()` |
| `src/viewmodels/AuthViewModel.ts` | Marked deprecated (dead code) |
| `src/viewmodels/ProfileViewModel.ts` | Marked deprecated (dead code) |
| `src/viewmodels/TransactionViewModel.ts` | Marked deprecated (dead code) |
| `src/views/auth/SignInScreen.tsx` | Remove hardcoded demo credentials, autocomplete, submit on enter |
| `src/views/auth/SignUpScreen.tsx` | 8-char min, inline validation feedback, autocomplete |
| `src/views/app/ProfileScreen.tsx` | Sync password min length to 8 chars |
| `src/views/app/TransactionsScreen.tsx` | Pass `userId` to `removeTx()` |
| `src/views/app/TransactionDetailScreen.tsx` | Pass `userId` to `removeTx()` |

---

## Setup & Run Notes

### Backend
```bash
cd backend
cp .env.example .env
# Fill in all required values in .env
npm install
npm run dev   # development with hot reload
npm start     # production
```

### Key Environment Variables
- `DATABASE_URL` — Neon (or any Postgres) connection string
- `JWT_SECRET` — **Must** be a long random string (≥32 chars) in production
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Rate limiting
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Push notifications (set as env var, never commit the JSON file)
- `EXCHANGE_RATE_API_KEY` — From exchangerate-api.com

### Mobile
```bash
cd mobile
npm install
# iOS:
cd ios && pod install && cd ..
npx react-native run-ios
# Android:
npx react-native run-android
```

Update `mobile/src/config/env.ts`:
- `CLOUDINARY_CLOUD_NAME` — Your Cloudinary cloud name
- `CLOUDINARY_UPLOAD_PRESET` — Your unsigned upload preset name
- `REAL_DEVICE_HOST` — Your machine's LAN IP when testing on a physical device
- `USE_REAL_DEVICE` — Set to `true` when testing on a physical device

---

## Security Reminders
- **Never commit** `.env` files, Firebase service account JSON, or any API keys to git
- The Firebase service account file found in the original repo has been removed; rotate any credentials that were exposed
- Set `CORS_ORIGIN` to specific origins in production (not `*`)
