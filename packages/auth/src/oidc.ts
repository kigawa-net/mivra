/**
 * Keycloak OpenID Connect (OIDC) client utility.
 */

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface OidcDiscoveryDoc {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface OidcTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface OidcUserInfo {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  email_verified?: boolean;
}

/**
 * Fetches and caches the OpenID Connect discovery document (.well-known/openid-configuration).
 */
export async function discoverOidcEndpoints(issuerUrl: string): Promise<OidcDiscoveryDoc> {
  const normalizedIssuer = issuerUrl.replace(/\/+$/, '');
  const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;

  const res = await fetch(discoveryUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch OIDC discovery document from ${discoveryUrl}: ${res.statusText}`);
  }

  return (await res.json()) as OidcDiscoveryDoc;
}

/**
 * Builds the Authorization URL for starting the OIDC Authorization Code Flow with PKCE.
 */
export function buildAuthorizationUrl(
  authorizationEndpoint: string,
  config: OidcConfig,
  state: string,
  codeChallenge: string,
  scope = 'openid profile email'
): string {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
}

/**
 * Exchanges the authorization code for tokens at the token endpoint with PKCE code_verifier.
 */
export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  config: OidcConfig,
  code: string,
  codeVerifier: string
): Promise<OidcTokens> {
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', config.clientId);
  params.set('redirect_uri', config.redirectUri);
  params.set('code', code);
  params.set('code_verifier', codeVerifier);

  if (config.clientSecret) {
    params.set('client_secret', config.clientSecret);
  }

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OIDC token exchange failed (${res.status}): ${errorBody}`);
  }

  return (await res.json()) as OidcTokens;
}

/**
 * Fetches user profile from the UserInfo endpoint.
 */
export async function fetchUserInfo(
  userinfoEndpoint: string,
  accessToken: string
): Promise<OidcUserInfo> {
  const res = await fetch(userinfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch userinfo (${res.status}): ${res.statusText}`);
  }

  return (await res.json()) as OidcUserInfo;
}

/**
 * Extracts payload claims from a JWT token without external dependencies.
 */
export function parseJwtClaims<T = Record<string, unknown>>(token: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  const jsonStr = atob(base64);
  return JSON.parse(jsonStr) as T;
}

/**
 * Generates PKCE code_verifier and code_challenge (S256).
 */
export async function generatePkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const codeVerifier = uint8ArrayToBase64Url(randomBytes);

  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(codeVerifier));
  const codeChallenge = uint8ArrayToBase64Url(new Uint8Array(digest));

  return { codeVerifier, codeChallenge };
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
