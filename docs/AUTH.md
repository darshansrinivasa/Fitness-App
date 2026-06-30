# Google sign-in setup

Mobile uses **Supabase Auth + Google OAuth** (browser flow — works in Expo Go).

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** → type **Web application**
3. Under **Authorized redirect URIs**, add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (Find your project ref in Supabase → Project Settings → General)
4. Copy the **Client ID** and **Client Secret**

## 2. Supabase Dashboard

1. **Authentication** → **Providers** → **Google** → Enable
2. Paste Google **Client ID** and **Client Secret**
3. **Authentication** → **URL Configuration** → **Redirect URLs**, add:
   - `lifestyle-os://auth/callback`
   - Your Expo Go redirect (shown on the login screen in dev mode), e.g. `exp://192.168.x.x:8081/--/auth/callback`

## 3. Test

```bash
pnpm mobile
```

Tap **Continue with Google** on the login screen.

## Notes

- Email/password sign-in remains available under **Sign in with email instead**
- New Google users get a `profiles` row automatically via the database trigger
- For production builds, use `lifestyle-os://auth/callback` as the redirect URI
