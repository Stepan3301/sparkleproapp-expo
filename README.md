# SparklePro Mobile App

React Native mobile application for SparklePro cleaning services, built with Expo and TypeScript.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your phone (iOS/Android)
- Or iOS Simulator / Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS (requires macOS)
npm run ios

# Run on Android
npm run android

# Run on web (for testing)
npm run web
```

## 📱 Testing the App

### Option 1: Using Expo Go (Recommended for quick testing)
1. Install Expo Go on your phone from App Store (iOS) or Play Store (Android)
2. Run `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Option 2: Using Simulator/Emulator
- **iOS**: `npm run ios` (requires macOS and Xcode)
- **Android**: `npm run android` (requires Android Studio)

## 📁 Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   └── ui/           # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── TextInput.tsx
│   │       ├── LoadingScreen.tsx
│   │       └── StepIndicator.tsx
│   ├── screens/          # Screen components
│   │   └── TestScreen.tsx
│   ├── lib/              # Libraries and configurations
│   │   └── supabase.ts
│   ├── types/            # TypeScript type definitions
│   │   └── booking.ts
│   ├── utils/            # Utility functions
│   │   └── i18n.ts
│   └── i18n/             # Translation files
│       └── locales/
│           ├── en.json
│           └── ru.json
├── App.tsx               # Main app component
└── package.json
```

## ✅ Completed Components

- ✅ **Button** - Full-featured button with variants (primary, secondary, nav-back, nav-next, fab, etc.)
- ✅ **TextInput** - Form input with label, error, and helper text support
- ✅ **LoadingScreen** - Loading overlay with fade animations
- ✅ **StepIndicator** - Multi-step progress indicator for booking flow
- ✅ **Supabase Config** - Configured for React Native with AsyncStorage
- ✅ **i18n** - Internationalization setup (English/Russian)

## 🔄 Conversion Progress

### Phase 1: Foundation ✅
- [x] Project setup with Expo
- [x] Core dependencies installed
- [x] Folder structure created
- [x] TypeScript configuration
- [x] Basic UI components converted

### Phase 2: Navigation & Auth (In Progress)
- [ ] Navigation setup (Stack Navigator)
- [ ] AuthContext conversion
- [ ] Auth pages (Login/Signup)
- [ ] Protected routes

### Phase 3: Core Features (Pending)
- [ ] HomePage
- [ ] BookingPage (4-step flow)
- [ ] Profile pages
- [ ] Address management
- [ ] Google Maps integration

## 🧪 Testing Components

The app includes a test screen (`TestScreen.tsx`) where you can see all converted components in action:

- Button variants and states
- TextInput with different configurations
- StepIndicator showing all steps
- LoadingScreen overlay

## 📝 Environment Variables

Create a `.env` file in the `mobile` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 🔧 Development Notes

### Converting Web Components to React Native

Key differences:
- `<div>` → `<View>`
- `<span>`, `<p>` → `<Text>`
- `<button>` → `<TouchableOpacity>` or `<Pressable>`
- `<input>` → `<TextInput>`
- CSS classes → `StyleSheet.create()`
- `localStorage` → `AsyncStorage`
- `react-router-dom` → `@react-navigation/native`

### Styling
- Using React Native `StyleSheet` API
- Can optionally use NativeWind (Tailwind for RN) - installed but not configured yet
- Linear gradients via `expo-linear-gradient`

## 📚 Next Steps

1. **Complete Navigation Setup**
   - Set up Stack Navigator
   - Create bottom tab navigation
   - Implement protected routes

2. **Convert Authentication**
   - Convert AuthContext
   - Convert AuthPage
   - Set up deep linking for OAuth

3. **Convert Core Pages**
   - HomePage with service cards
   - BookingPage with 4-step flow
   - Profile pages

4. **Integrate Native Features**
   - Google Maps (react-native-maps)
   - Push notifications (expo-notifications)
   - Image picker (expo-image-picker)

## 🐛 Troubleshooting

### Common Issues

**Metro bundler cache issues:**
```bash
npm start -- --reset-cache
```

**Dependencies not installing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**iOS build issues:**
- Make sure Xcode is installed
- Run `pod install` in `ios` directory (if using bare workflow)

## 📄 License

Same as main project.
