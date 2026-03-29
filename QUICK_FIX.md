# 🚨 Quick Fix for Connection Error

## The Problem
Error: "Could not connect to the server" - `exp://127.0.0.1:8081`

This means your phone can't reach the development server.

## ✅ IMMEDIATE FIX - Use Tunnel Mode

**This is the easiest solution that works across any network:**

```bash
cd mobile
npx expo start --tunnel --clear
```

**What this does:**
- Uses Expo's tunnel service (works even if devices are on different networks)
- Clears cache
- Creates a public URL your phone can access

**Note:** First time using tunnel, you'll be asked to log in to Expo (free account).

---

## Alternative: Use LAN Mode (Same WiFi Required)

If tunnel doesn't work, use LAN mode (phone and computer must be on same WiFi):

```bash
cd mobile
npx expo start --lan --clear
```

This will show your computer's IP address instead of 127.0.0.1

---

## 🔍 Verify Compatibility

**Expo SDK 51** is compatible with:
- Expo Go 2.28.0+ (iOS)
- Expo Go 2.28.0+ (Android)

**To check your Expo Go version:**
1. Open Expo Go on iPhone
2. Go to Settings (gear icon)
3. Check version number

**If your Expo Go is older:**
- Update from App Store
- Or we can downgrade to SDK 50 (more compatible)

---

## 📋 Step-by-Step Fix

1. **Stop current server** (Ctrl+C in terminal)

2. **Start with tunnel:**
   ```bash
   cd mobile
   npx expo start --tunnel --clear
   ```

3. **Wait for QR code** to appear

4. **Scan with Expo Go** - should work now!

5. **If still fails:**
   - Make sure Expo Go is updated (App Store)
   - Try: `npx expo start --lan --clear`
   - Check firewall settings

---

## 🎯 Most Likely Solution

**Just run this:**
```bash
cd mobile
npx expo start --tunnel --clear
```

Then scan the new QR code. Tunnel mode bypasses all network issues!
