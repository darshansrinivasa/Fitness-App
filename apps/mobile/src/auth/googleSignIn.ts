import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Redirect URI — add this in Supabase → Authentication → URL Configuration. */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'lifestyle-os',
    path: 'auth/callback',
  });
}

async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(params.error_description ?? errorCode);
  }

  const { access_token, refresh_token } = params;

  if (!access_token) {
    throw new Error('No access token returned from Google sign-in.');
  }

  const { error } = await getSupabase().auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = getOAuthRedirectUri();

  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in URL was not returned.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success') {
    await createSessionFromUrl(result.url);
    return;
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google sign-in was cancelled.');
  }

  throw new Error('Google sign-in failed. Try again.');
}

/** Handle deep links when the app is opened from the OAuth redirect. */
export async function handleAuthCallbackUrl(url: string): Promise<void> {
  if (!url.includes('access_token') && !url.includes('code=')) return;
  await createSessionFromUrl(url);
}
