/**
 * @file connectionStore.ts
 * @input Platform-owned connection persistence.
 * @output Shared connection types and a synchronous store contract for local execution.
 * @pos Feishu execution core; persistence is supplied by Electron or Android.
 */
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
  application?: { id: string; secret: string };
  device?: { code: string; stage: 'create' | 'authorize'; expires: number; nextPoll: number; interval: number; url: string };
}

export const SESSION_MAX_AGE = 30 * 86400;

export interface ConnectionStore {
  create(connection: UserConnection): string;
  get(id: string): UserConnection | null;
  save(id: string, connection: UserConnection): boolean;
  delete(id: string): void;
  addState(session: string, verifier: string, expires: number): string;
  claimState(state: string): { session: string; verifier: string } | null;
  getValue<T>(kind: string, id: string): T | null;
  setValue(kind: string, id: string, value: unknown, owner?: string): void;
  removeValue(kind: string, id: string): void;
  listValues<T>(kind: string, owner: string): T[];
  listValueEntries<T>(kind: string, owner: string): { id: string; value: T }[];
}
