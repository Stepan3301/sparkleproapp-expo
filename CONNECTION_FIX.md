# 🔧 Connection Error Fix

## Problem
Error: "Could not connect to the server" with `exp://127.0.0.1:8081`

This happens when:
1. Phone and computer are not on the same WiFi network
2. Firewall is blocking the connection
3. Using localhost (127.0.0.1) which doesn't work on physical devices

## ✅ Solutions

### Solution 1: Use Tunnel Mode (Recommended)

Start Expo with tunnel mode - this works even if devices are on different networks:

```bash
cd mobile
npx expo start --tunnel
```

**Note:** Tunnel mode requires an Expo account (free). You'll be prompted to log in.

### Solution 2: Use LAN Mode (Same Network)

1. **Make sure phone and computer are on the same WiFi network**

2. **Start Expo with LAN:**
   ```bash
   cd mobile
   npx expo start --lan
   ```

3. **Scan the QR code** - it should show your computer's IP address instead of 127.0.0.1

### Solution 3: Check Firewall

**Windows:**
1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall to test

**Mac:**
1. System Preferences → Security & Privacy → Firewall
2. Allow Node.js/Expo through firewall

### Solution 4: Manual IP Connection

1. **Find your computer's IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Start Expo:**
   ```bash
   npx expo start
   ```

3. **In Expo Go app:**
   - Tap "Enter URL manually"
   - Enter: `exp://YOUR_IP_ADDRESS:8081`
   - Replace YOUR_IP_ADDRESS with your computer's IP

---

## 🎯 Recommended Steps

1. **Try tunnel mode first:**
   ```bash
   cd mobile
   npx expo start --tunnel
   ```

2. **If tunnel doesn't work, use LAN:**
   ```bash
   npx expo start --lan
   ```

3. **Make sure both devices are on same WiFi**

4. **Check firewall settings**

---

## 📱 Expo Go Version Check

To verify your Expo Go version supports SDK 51:

1. Open Expo Go on your phone
2. Check version in app settings
3. **Minimum required:** Expo Go 2.28.0 or later
4. **Update if needed:** App Store → Search "Expo Go" → Update

---

## 🔍 Debug Steps

1. **Check if Metro bundler is running:**
   - You should see "Metro waiting on..." in terminal
   - If not, restart: `npm start`

2. **Check network:**
   - Phone and computer must be on same WiFi
   - Try disconnecting and reconnecting WiFi

3. **Clear Expo Go cache:**
   - Shake device → "Reload"
   - Or: Settings → Clear cache

4. **Try different connection mode:**
   ```bash
   # Try tunnel
   npx expo start --tunnel
   
   # Or try LAN
   npx expo start --lan
   
   # Or default
   npx expo start
   ```

---

## ✅ Quick Fix Command

```bash
cd mobile
npx expo start --tunnel --clear
```

This will:
- Use tunnel mode (works across networks)
- Clear cache
- Show new QR code

Then scan the QR code with Expo Go!
