/**
 * @file useAIBackfillChatDreamSelection.ts
 * @input Dream snapshot and selected topic id
 * @output Active dream topic and its entries
 * @pos Component Support (AI Integration)
 * @description Keeps the selected Dream projection separate from the chat coordinator.
 */
import { useMemo } from 'react';
import type { DreamState, DreamTopic } from '../../types/assistant';

export const useAIBackfillChatDreamSelection = (
  dreamSnapshot: DreamState,
  selectedDreamTopicId: string
) => {
  const activeDreamTopic = useMemo<DreamTopic | null>(() => (
    dreamSnapshot.topics.find((topic) => topic.id === selectedDreamTopicId)
    || dreamSnapshot.topics[0]
    || null
  ), [dreamSnapshot.topics, selectedDreamTopicId]);

  const activeDreamEntries = useMemo(() => (
    activeDreamTopic
      ? dreamSnapshot.entries.filter((entry) => entry.topicId === activeDreamTopic.id)
      : []
  ), [activeDreamTopic, dreamSnapshot.entries]);

  return { activeDreamTopic, activeDreamEntries };
};
