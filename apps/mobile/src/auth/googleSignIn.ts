import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function runningInExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}

/**
 * Address Google sends the phone back to.
 * Expo Go can only reopen exp://… URLs. lifestyle-os:// is for an installed build
 * and leaves the browser spinning when the app is opened from Expo Go.
 */
export function getOAuthRedirectUri(): string {
  if (runningInExpoGo()) {
    return Linking.createURL('auth/callback', { scheme: 'exp' });
  }
  return Linking.createURL('auth/callback', { scheme: 'lifestyle-os' });
}

function readAuthParams(url: string): { params: Record<string, string>; errorCode: string | null } {
  const params: Record<string, string> = {};
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  if (queryIndex >= 0) {
    const query = url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
    for (const [key, value] of new URLSearchParams(query)) {
      params[key] = value;
    }
  }
  if (hashIndex >= 0) {
    for (const [key, value] of new URLSearchParams(url.slice(hashIndex + 1))) {
      params[key] = value;
    }
  }

  return { params, errorCode: params.error ?? params.error_code ?? null };
}

async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = readAuthParams(url);

  if (errorCode) {
    throw new Error(params.error_description ?? errorCode);
  }

  if (params.code) {
    const { error } = await getSupabase().auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    throw new Error(
      `Google did not return a session. In Supabase → Authentication → URL Configuration, add this redirect URL:\n${getOAuthRedirectUri()}`,
    );
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
  if (!url.includes('code=') && !url.includes('access_token')) return;
  await createSessionFromUrl(url);
}
