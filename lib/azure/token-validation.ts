import { jwtVerify, createRemoteJWKSet } from 'jose';

const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID || '';
const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || '';
const JWKS_URL = `https://<your-tenant-name>.b2clogin.com/<your-tenant-name>.onmicrosoft.com/<your-signin-signup-policy>/discovery/v2.0/keys`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export function getToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme === 'Bearer' && token) {
    return token;
  }
  return null;
}

export async function validateToken(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://<your-tenant-name>.b2clogin.com/${AZURE_AD_TENANT_ID}/v2.0/`,
      audience: AZURE_AD_CLIENT_ID,
      algorithms: ['RS256'],
    });
    return payload;
  } catch (error) {
    logger.error('Token validation error:', error);
    return null;
  }
}
