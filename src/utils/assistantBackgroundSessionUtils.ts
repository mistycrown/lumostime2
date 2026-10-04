/**
 * @file assistantBackgroundSessionUtils.ts
 * @input Persisted or live AI chat sessions with lightweight message metadata
 * @output Shared helpers for selecting the one ordinary session that background assistant work may target
 * @pos Utils (Assistant Background Sessions)
 * @description Prioritizes the latest real user activity, excludes template sessions, and reuses a background conversation when no user-active conversation survives.
 *
 * @updated 2026-05-12: Added shared background-session selectors that ignore template chats and rank ordinary conversations by the timestamp of their latest user message.
 * @updated 2026-10-04: Reuses conversations containing persisted background replies when no user-active conversation remains.
 */

export interface AssistantBackgroundSessionMessageLike {
  role: 'user' | 'assistant';
  createdAt: number;
  backgroundDebugHistoryId?: string;
}

export interface AssistantBackgroundSessionLike {
  id: string;
  updatedAt: number;
  messages: AssistantBackgroundSessionMessageLike[];
  templateMeta?: unknown;
}

export const isOrdinaryAssistantBackgroundSession = <T extends AssistantBackgroundSessionLike>(
  session: T
): boolean => !session.templateMeta;

export const getLatestAssistantBackgroundUserMessageAt = <T extends AssistantBackgroundSessionLike>(
  session: T
): number | null => {
  let latestUserMessageAt = Number.NEGATIVE_INFINITY;

  session.messages.forEach((message) => {
    if (message.role !== 'user' || !Number.isFinite(message.createdAt)) {
      return;
    }

    latestUserMessageAt = Math.max(latestUserMessageAt, message.createdAt);
  });

  return Number.isFinite(latestUserMessageAt) ? latestUserMessageAt : null;
};

export const resolveLatestOrdinaryAssistantBackgroundSession = <T extends AssistantBackgroundSessionLike>(
  sessions: T[]
): T | undefined => {
  const rankedSessions = sessions.flatMap((session) => {
    if (!isOrdinaryAssistantBackgroundSession(session)) {
      return [];
    }

    const latestUserMessageAt = getLatestAssistantBackgroundUserMessageAt(session);
    if (!Number.isFinite(latestUserMessageAt)) {
      return [];
    }

    return [{
      session,
      latestUserMessageAt
    }];
  });

  rankedSessions.sort((left, right) => (
    right.latestUserMessageAt - left.latestUserMessageAt
    || right.session.updatedAt - left.session.updatedAt
  ));

  return rankedSessions[0]?.session;
};

export const resolveAssistantBackgroundSession = <T extends AssistantBackgroundSessionLike>(
  sessions: T[]
): T | undefined => (
  resolveLatestOrdinaryAssistantBackgroundSession(sessions)
  || sessions
    .filter((session) => (
      isOrdinaryAssistantBackgroundSession(session)
      && session.messages.some((message) => message.role === 'assistant' && Boolean(message.backgroundDebugHistoryId))
    ))
    .sort((left, right) => right.updatedAt - left.updatedAt)[0]
);
