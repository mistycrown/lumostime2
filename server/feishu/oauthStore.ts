/**
 * @file oauthStore.ts
 * @input Persistent SQLite path and a server-only 32-byte encryption key.
 * @output Encrypted connections, single-use OAuth states, category mappings and import ledger.
 * @pos Feishu service persistence; never imported by the app.
 */
import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export interface UserConnection {
  status: 'pending' | 'connected' | 'error' | 'expired';
  pendingUntil?: number;
  error?: string;
  accountId?: string;
  userName?: string;
  calendars?: { id: string; name: string }[];
  calendarId?: string;
  accessToken?: string;
  refreshToken?: string;
  accessExpiresAt?: number;
  refreshExpiresAt?: number;
}

export const SESSION_MAX_AGE = 30 * 86400;
export const opaqueToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');

export class OAuthStore {
  private db: DatabaseSync;
  private key: Buffer;

  constructor(path: string, key: string) {
    this.key = Buffer.from(key, 'base64');
    if (this.key.length !== 32) throw new Error('Invalid Feishu encryption key');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS states (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, verifier TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS integration_values (kind TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind, id));`);
    this.cleanup();
  }

  private encrypt(value: unknown, id: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(id));
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }

  private decrypt<T>(value: string, id: string): T {
    const data = Buffer.from(value, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
    decipher.setAAD(Buffer.from(id));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
  }

  create(connection: UserConnection): string {
    this.cleanup();
    const token = opaqueToken();
    const id = tokenHash(token);
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)')
      .run(id, this.encrypt(connection, id), connection.status === 'pending'
        ? (connection.pendingUntil || Date.now()) + 5 * 60000 : Date.now() + SESSION_MAX_AGE * 1000);
    return token;
  }

  get(id: string): UserConnection | null {
    const row = this.db.prepare('SELECT payload, expires FROM sessions WHERE id = ?').get(id);
    if (!row || Number(row.expires) < Date.now()) {
      this.delete(id);
      return null;
    }
    return this.decrypt<UserConnection>(String(row.payload), id);
  }

  save(id: string, connection: UserConnection): boolean {
    return this.db.prepare('UPDATE sessions SET payload = ?, expires = CASE WHEN ? THEN ? ELSE expires END WHERE id = ? AND expires >= ?')
      .run(this.encrypt(connection, id), connection.status === 'connected' ? 1 : 0,
        Date.now() + SESSION_MAX_AGE * 1000, id, Date.now()).changes > 0;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  addState(session: string, verifier: string, expires: number): string {
    const state = opaqueToken();
    const id = tokenHash(state);
    this.db.prepare('INSERT INTO states VALUES (?, ?, ?, ?)').run(id, session, this.encrypt(verifier, id), expires);
    return state;
  }

  claimState(state: string): { session: string; verifier: string } | null {
    const id = tokenHash(state);
    const row = this.db.prepare('DELETE FROM states WHERE id = ? RETURNING *').get(id);
    if (!row || Number(row.expires) < Date.now()) return null;
    return { session: String(row.session), verifier: this.decrypt<string>(String(row.verifier), id) };
  }

  close(): void { this.db.close(); }

  getValue<T>(kind: string, id: string): T | null {
    const row = this.db.prepare('SELECT payload FROM integration_values WHERE kind = ? AND id = ?').get(kind, id);
    return row ? this.decrypt<T>(String(row.payload), `${kind}:${id}`) : null;
  }

  setValue(kind: string, id: string, value: unknown, owner = ''): void {
    this.db.prepare('INSERT INTO integration_values VALUES (?, ?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET payload = excluded.payload, owner = excluded.owner')
      .run(kind, id, owner, this.encrypt(value, `${kind}:${id}`));
  }

  removeValue(kind: string, id: string): void { this.db.prepare('DELETE FROM integration_values WHERE kind = ? AND id = ?').run(kind, id); }

  listValues<T>(kind: string, owner: string): T[] {
    return this.db.prepare('SELECT id, payload FROM integration_values WHERE kind = ? AND owner = ?').all(kind, owner)
      .map((row) => this.decrypt<T>(String(row.payload), `${kind}:${row.id}`));
  }

  private cleanup(): void {
    this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    this.db.prepare('DELETE FROM states WHERE expires < ?').run(Date.now());
  }
}
