/**
 * @file nativeStore.ts
 * @input Decrypted native snapshot in private execution memory.
 * @output Node-compatible session/ledger storage and versioned snapshots for encrypted persistence.
 * @pos Android Feishu store; never uses browser storage or writes plaintext files.
 */
import { SESSION_MAX_AGE, type ConnectionStore, type UserConnection } from './connectionStore.ts';
import { opaqueToken, tokenHash } from './crypto.ts';

interface Session { id: string; connection: UserConnection; expires: number }
interface State { id: string; session: string; verifier: string; expires: number }
interface Value { kind: string; id: string; owner: string; value: unknown }
interface Snapshot { version: 1; sessions: Session[]; states: State[]; values: Value[] }
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const key = (kind: string, id: string) => JSON.stringify([kind, id]);
const validString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export class NativeConnectionStore implements ConnectionStore {
  private sessions = new Map<string, Session>();
  private states = new Map<string, State>();
  private values = new Map<string, Value>();
  revision = 0;

  constructor(serialized: string | null) {
    if (serialized === null) return;
    let snapshot: Snapshot;
    try {
      snapshot = JSON.parse(serialized);
      if (snapshot?.version !== 1 || !Array.isArray(snapshot.sessions) || !Array.isArray(snapshot.states) || !Array.isArray(snapshot.values)) throw new Error();
      for (const session of snapshot.sessions) {
        if (!validString(session?.id) || this.sessions.has(session.id) || !Number.isSafeInteger(session.expires)
          || !session.connection || !['pending', 'connected', 'error', 'expired'].includes(session.connection.status)) throw new Error();
        this.sessions.set(session.id, session);
      }
      for (const state of snapshot.states) {
        if (!validString(state?.id) || this.states.has(state.id) || !validString(state.session)
          || !validString(state.verifier) || !Number.isSafeInteger(state.expires)) throw new Error();
        this.states.set(state.id, state);
      }
      for (const value of snapshot.values) {
        if (!validString(value?.kind) || !validString(value.id) || typeof value.owner !== 'string' || value.value === undefined
          || this.values.has(key(value.kind, value.id))) throw new Error();
        this.values.set(key(value.kind, value.id), value);
      }
    } catch { throw new Error('飞书本机连接数据无法读取，请检查手机安全存储后重试。'); }
  }

  serialize(): string {
    return JSON.stringify({ version: 1, sessions: [...this.sessions.values()], states: [...this.states.values()], values: [...this.values.values()] } satisfies Snapshot);
  }

  create(connection: UserConnection): string {
    this.cleanup();
    const token = opaqueToken();
    const id = tokenHash(token);
    this.sessions.set(id, { id, connection: copy(connection), expires: connection.status === 'pending'
      ? (connection.pendingUntil || Date.now()) + 5 * 60000 : Date.now() + SESSION_MAX_AGE * 1000 });
    this.revision++;
    return token;
  }

  get(id: string): UserConnection | null {
    const session = this.sessions.get(id);
    if (!session || session.expires < Date.now()) { this.delete(id); return null; }
    return copy(session.connection);
  }

  save(id: string, connection: UserConnection): boolean {
    const session = this.sessions.get(id);
    if (!session || session.expires < Date.now()) return false;
    session.connection = copy(connection);
    if (connection.status === 'connected') session.expires = Date.now() + SESSION_MAX_AGE * 1000;
    this.revision++;
    return true;
  }

  delete(id: string): void {
    if (!this.sessions.delete(id)) return;
    for (const state of this.states.values()) if (state.session === id) this.states.delete(state.id);
    this.revision++;
  }

  addState(session: string, verifier: string, expires: number): string {
    if (!this.sessions.has(session)) throw new Error('Invalid Feishu session');
    const token = opaqueToken();
    const id = tokenHash(token);
    this.states.set(id, { id, session, verifier, expires });
    this.revision++;
    return token;
  }

  claimState(token: string): { session: string; verifier: string } | null {
    const id = tokenHash(token);
    const state = this.states.get(id);
    if (!state) return null;
    this.states.delete(id);
    this.revision++;
    return state.expires < Date.now() ? null : { session: state.session, verifier: state.verifier };
  }

  getValue<T>(kind: string, id: string): T | null {
    const entry = this.values.get(key(kind, id));
    return entry ? copy(entry.value) as T : null;
  }

  setValue(kind: string, id: string, value: unknown, owner = ''): void {
    this.values.set(key(kind, id), { kind, id, owner, value: copy(value) });
    this.revision++;
  }

  removeValue(kind: string, id: string): void { if (this.values.delete(key(kind, id))) this.revision++; }

  listValues<T>(kind: string, owner: string): T[] {
    return [...this.values.values()].filter((entry) => entry.kind === kind && entry.owner === owner).map((entry) => copy(entry.value) as T);
  }

  listValueEntries<T>(kind: string, owner: string): { id: string; value: T }[] {
    return [...this.values.values()].filter((entry) => entry.kind === kind && (entry.owner === owner || entry.owner === ''))
      .map((entry) => ({ id: entry.id, value: copy(entry.value) as T }));
  }

  private cleanup(): void {
    for (const session of this.sessions.values()) if (session.expires < Date.now()) this.delete(session.id);
    for (const state of this.states.values()) if (state.expires < Date.now()) { this.states.delete(state.id); this.revision++; }
  }
}
