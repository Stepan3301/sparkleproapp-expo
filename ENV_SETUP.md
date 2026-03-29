# 🔧 Environment Variables Setup

## Problem
Error: `supabaseUrl is required`

This happens because the `.env` file is missing or doesn't have the Supabase credentials.

## ✅ Solution

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long JWT token starting with `eyJ...`)

### Step 2: Create `.env` File

1. Open `mobile/.env` file (I just created it)
2. Replace the placeholder values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Restart Expo Server

**Important:** After creating/updating `.env`, you MUST restart Expo:

```bash
# Stop current server (Ctrl+C)
cd mobile
npm start -- --clear
```

### Step 4: Reload App

In Expo Go on your phone:
- Shake device → Tap "Reload"
- Or close and reopen Expo Go

---

## 📝 Important Notes

1. **`.env` file location:** Must be in `mobile/` directory (root of mobile project)

2. **Variable naming:** Must use `EXPO_PUBLIC_` prefix for Expo to expose them

3. **Never commit `.env`:** It's already in `.gitignore` - keep your keys secret!

4. **Restart required:** Expo only reads `.env` on startup - restart after changes

---

## 🔍 Verify It's Working

After setting up `.env` and restarting, the error should disappear and the app should load.

If you still see the error:
1. Check `.env` file exists in `mobile/` directory
2. Check variable names are exactly: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Check no extra spaces or quotes around values
4. Restart Expo server with `--clear` flag

---

## 🎯 Quick Fix

1. Edit `mobile/.env` file
2. Add your Supabase URL and key
3. Run: `npm start -- --clear`
4. Reload app in Expo Go

That's it! 🚀
