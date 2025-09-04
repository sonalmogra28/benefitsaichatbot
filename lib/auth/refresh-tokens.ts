import crypto from 'node:crypto';

interface TokenRecord {
  userId: string;
  expiresAt: number; // timestamp in ms
}

interface TokenStore {
  save: (hash: string, record: TokenRecord) => Promise<void>;
  find: (hash: string) => Promise<TokenRecord | null>;
  delete: (hash: string) => Promise<void>;
  findByUserId: (userId: string) => Promise<string[]>;
  clear: () => Promise<void>;
}

class MemoryTokenStore implements TokenStore {
  private store = new Map<string, TokenRecord>();

  async save(hash: string, record: TokenRecord) {
    this.store.set(hash, record);
  }

  async find(hash: string) {
    return this.store.get(hash) || null;
  }

  async delete(hash: string) {
    this.store.delete(hash);
  }

  async findByUserId(userId: string) {
    const hashes: string[] = [];
    for (const [hash, record] of this.store.entries()) {
      if (record.userId === userId) hashes.push(hash);
    }
    return hashes;
  }

  async clear() {
    this.store.clear();
  }
}

let tokenStore: TokenStore;

if (process.env.NODE_ENV === 'test') {
  tokenStore = new MemoryTokenStore();
} else {
  const { adminDb, FieldValue } = await import('../firebase/admin');
  class FirestoreTokenStore implements TokenStore {
    private collection = adminDb.collection('refreshTokens');

    async save(hash: string, record: TokenRecord) {
      await this.collection
        .doc(hash)
        .set({ ...record, createdAt: FieldValue.serverTimestamp() });
    }

    async find(hash: string) {
      const doc = await this.collection.doc(hash).get();
      return doc.exists ? (doc.data() as TokenRecord) : null;
    }

    async delete(hash: string) {
      await this.collection.doc(hash).delete();
    }

    async findByUserId(userId: string) {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .get();
      return snapshot.docs.map((d) => d.id);
    }

    async clear() {
      const snapshot = await this.collection.get();
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
  tokenStore = new FirestoreTokenStore();
}

const DEFAULT_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(
  token: string,
  userId: string,
  ttl: number = DEFAULT_TTL,
) {
  const tokenHash = hashToken(token);
  await tokenStore.save(tokenHash, {
    userId,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function verifyRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await tokenStore.find(tokenHash);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    await tokenStore.delete(tokenHash);
    return null;
  }
  return { ...record, tokenHash };
}

export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string,
  ttl: number = DEFAULT_TTL,
) {
  const existing = await verifyRefreshToken(oldToken);
  if (!existing || existing.userId !== userId) return false;
  await tokenStore.delete(existing.tokenHash);
  await storeRefreshToken(newToken, userId, ttl);
  return true;
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await tokenStore.delete(tokenHash);
}

export async function revokeTokensForUser(userId: string) {
  const hashes = await tokenStore.findByUserId(userId);
  for (const hash of hashes) {
    await tokenStore.delete(hash);
  }
}

export async function clearAllTokens() {
  await tokenStore.clear();
}
