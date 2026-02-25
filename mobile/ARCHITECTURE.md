# Mobile App - MVVM Architecture

## Structure

```
src/
├── models/              # Data models (M)
│   ├── User.ts
│   └── Transaction.ts
├── viewmodels/          # Business logic (VM)
│   ├── AuthViewModel.ts
│   ├── TransactionViewModel.ts
│   └── ProfileViewModel.ts
├── views/               # UI screens (V)
│   ├── app/
│   │   ├── HomeScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── AddTransactionScreen.tsx
│   ├── auth/
│   │   ├── SignInScreen.tsx
│   │   ├── SignupEmailScreen.tsx
│   │   ├── PasskeyVerifyScreen.tsx
│   │   └── PasswordCreateScreen.tsx
│   └── SplashScreen.tsx
├── services/            # API communication
│   ├── AuthService.ts
│   ├── TransactionService.ts
│   └── ProfileService.ts
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── config/              # App configuration
├── theme/               # Styling
└── utils/               # Helper functions
```

## MVVM Pattern

### Model
- Defines data structures
- Located in `models/`
- Examples: User, Transaction

### ViewModel
- Contains business logic
- Manages state
- Communicates with Services
- Located in `viewmodels/`
- Uses React hooks (useState, useCallback, useMemo)

### View
- UI components
- Displays data from ViewModel
- Sends user actions to ViewModel
- Located in `views/`

### Services
- API communication layer
- Handles HTTP requests
- Located in `services/`
