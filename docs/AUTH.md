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
   - `exp://**` — required while testing in Expo Go
   - `lifestyle-os://**` — used only by an installed build of the app

   `lifestyle-os://auth/callback` is the app's own link. Expo Go does not own that link, so sending Google back there leaves the browser spinning. Expo Go must be sent to `exp://<your-computer-ip>:8081/--/auth/callback`. The `exp://**` wildcard covers that address when the IP changes.

   **Site URL** must not be `http://localhost:3000` while you test on a phone. If the Expo Go redirect is missing, Supabase sends the phone to the Site URL and the browser keeps spinning after you pick a Google account.

## 3. Test

```bash
pnpm mobile
```

Tap **Continue with Google** on the login screen.

## Notes

- **Continue with Google** signs in an existing Google account or creates one the first time. Supabase keys the user by that Google identity, so the same Google account on another phone opens the same Lifestyle OS account.
- A new account has no profile name yet, so the app opens profile setup. After that name is saved, later sign-ins go to the dashboard.
- Sign-in is Google only. The same Google account is the same Lifestyle OS user on every device.
- New Google users get a `profiles` row automatically via the database trigger
- For an installed build, `lifestyle-os://auth/callback` is covered by `lifestyle-os://**`
