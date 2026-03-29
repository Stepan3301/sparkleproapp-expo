# 🧪 Testing Guide - SparklePro Mobile App

## ✅ What We Have Right Now

### Completed Features:

1. **✅ Core UI Components**
   - Button (all variants: primary, secondary, nav-back, nav-next, fab, selection, toggle)
   - TextInput (with label, error, helper text support)
   - LoadingScreen (with fade animations)
   - StepIndicator (multi-step progress indicator)

2. **✅ Authentication System**
   - AuthContext with Supabase integration
   - Login/Signup screens
   - Guest mode support
   - Session persistence with AsyncStorage

3. **✅ Navigation**
   - Stack Navigator setup
   - Protected routes (auth required)
   - Navigation between screens

4. **✅ Infrastructure**
   - Supabase configured for React Native
   - i18n (English/Russian translations)
   - TypeScript types
   - Project structure matching web app

5. **✅ Screens**
   - Auth Screen (Login/Signup)
   - Home Screen (with quick actions)
   - Test Screen (component showcase)
   - Placeholder screens (Booking, History, Profile)

---

## 🚀 How to Test the App

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the `mobile` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important:** Replace with your actual Supabase credentials from the web app.

### Step 3: Start the Development Server

```bash
npm start
```

This will:
- Start the Metro bundler
- Show a QR code in the terminal
- Open Expo DevTools in your browser

### Step 4: Run on Your Device/Simulator

#### Option A: Using Expo Go (Easiest - Recommended)

1. **Install Expo Go:**
   - iOS: Download from App Store
   - Android: Download from Play Store

2. **Scan QR Code:**
   - iOS: Open Camera app → Scan QR code
   - Android: Open Expo Go app → Tap "Scan QR code"

3. **Wait for app to load** (first time may take a minute)

#### Option B: Using iOS Simulator (macOS only)

```bash
npm run ios
```

#### Option C: Using Android Emulator

```bash
npm run android
```

**Note:** Make sure you have:
- Xcode installed (for iOS)
- Android Studio with emulator set up (for Android)

---

## 🧪 Testing Checklist

### 1. Test UI Components

Navigate to **Test Screen** (accessible from Home screen):

- ✅ **Buttons**: Tap all button variants
  - Primary, Secondary, Nav-back, Nav-next
  - FAB, Selection, Toggle buttons
  - Disabled and loading states

- ✅ **TextInputs**: Test form inputs
  - Email input with validation
  - Password input (secure text entry)
  - Error states
  - Helper text

- ✅ **StepIndicator**: View all step states
  - Step 1, 2, 3, 4 indicators
  - Completed, current, pending states

- ✅ **LoadingScreen**: Test loading overlay
  - Tap "Test Loading" button
  - See fade in/out animation

### 2. Test Authentication

#### Login Flow:
1. App opens → Should show **Auth Screen**
2. Enter email and password
3. Tap "Login" button
4. Should navigate to **Home Screen** on success
5. Should show error alert on failure

#### Signup Flow:
1. On Auth Screen, tap "Sign Up"
2. Fill in: Full Name, Email, Password
3. Tap "Sign Up" button
4. Should show success message
5. Should switch back to login

#### Guest Mode:
1. On Auth Screen, tap "Continue as Guest"
2. Should navigate to Home Screen
3. Should show "You're browsing as a guest"

#### Sign Out:
1. From Home Screen, tap "Logout" button
2. Should return to Auth Screen
3. Session should be cleared

### 3. Test Navigation

From **Home Screen**, test navigation:

- ✅ Tap "Book" → Navigate to Booking Screen
- ✅ Tap "History" → Navigate to History Screen  
- ✅ Tap "Profile" → Navigate to Profile Screen
- ✅ Tap back button → Return to previous screen

### 4. Test App State

- ✅ **Close and reopen app** → Should maintain login state
- ✅ **Kill app completely** → Should remember session
- ✅ **Switch between screens** → Should maintain state

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Metro bundler"

**Solution:**
```bash
# Stop the server (Ctrl+C)
npm start -- --reset-cache
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Supabase connection failed"

**Check:**
1. `.env` file exists in `mobile` directory
2. Environment variables are correct
3. Supabase URL and key are valid
4. Restart the app after adding `.env`

### Issue: "Navigation not working"

**Check:**
1. All screen components are imported correctly
2. Screen names match in navigation
3. Navigation props are passed correctly

### Issue: "App crashes on startup"

**Check:**
1. All dependencies are installed
2. TypeScript compilation passes
3. Check Metro bundler logs for errors
4. Try: `npm start -- --reset-cache`

---

## 📱 Current App Flow

```
App Start
  ↓
Auth Screen (if not logged in)
  ↓
Home Screen (if logged in or guest)
  ├──→ Booking Screen (placeholder)
  ├──→ History Screen (placeholder)
  ├──→ Profile Screen (placeholder)
  └──→ Test Screen (component showcase)
```

---

## ✅ What's Working

- ✅ Authentication (login/signup/guest)
- ✅ Navigation between screens
- ✅ UI components rendering
- ✅ Form validation
- ✅ Session persistence
- ✅ Loading states
- ✅ Error handling

## ⏳ Coming Next

- ⏳ Booking Page (4-step flow)
- ⏳ Service cards on Home
- ⏳ Google Maps integration
- ⏳ Profile management
- ⏳ Address management
- ⏳ Payment methods

---

## 📝 Notes

- **Test Screen** is accessible from Home for component testing
- **Guest mode** allows browsing without account
- **All navigation** is functional but some screens are placeholders
- **Supabase** connection required for auth to work

---

## 🎯 Quick Test Commands

```bash
# Start app
cd mobile && npm start

# Run on iOS (macOS)
npm run ios

# Run on Android
npm run android

# Clear cache and restart
npm start -- --reset-cache
```

---

**Happy Testing! 🚀**

If you encounter any issues, check the Metro bundler logs in the terminal for detailed error messages.
