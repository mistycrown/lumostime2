/**
 * @file assistantBackgroundSessionUtils.ts
 * @input Persisted or live AI chat sessions with lightweight message metadata
 * @output Shared helpers for selecting the one ordinary session that background assistant work may target
 * @pos Utils (Assistant Background Sessions)
 * @description Keeps background assistant routing anchored to the latest real user activity by excluding template sessions and scanning only ordinary conversations with at least one user-authored message.
 *
 * @updated 2026-05-12: Added shared background-session selectors that ignore template chats and rank ordinary conversations by the timestamp of their latest user message.
 */

export interface AssistantBackgroundSessionMessageLike {
  role: 'user' | 'assistant';
  createdAt: number;
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
