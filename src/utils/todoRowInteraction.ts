/**
 * @file todoRowInteraction.ts
 * @input Pointer deltas plus todo-row swipe capability flags
 * @output Gesture intent classification and release actions for todo-row interactions
 * @pos Utility
 * @description Helps TodoView distinguish taps, scrolls, and deliberate horizontal swipes so list rows do not accidentally swallow taps or toggle completion during scrolling.
 * @updated 2026-05-05: Converted leftward drags into a quick-actions fallback so list-row touches no longer mutate completion state directly when the user only meant to tap near the bottom edge.
 * @updated 2026-05-05: Removed the tap-vs-swipe dead zone and only allows the remaining explicit right-swipe shortcuts after a clear horizontal intent.
 * @updated 2026-05-05: Added conservative axis-locking helpers for todo-row quick actions.
 */

export type TodoRowGestureIntent = 'pending' | 'scroll' | 'swipe';
export type TodoRowReleaseAction = 'none' | 'openQuickActions' | 'openDetail' | 'duplicate' | 'toggleComplete';

interface TodoRowGestureSnapshot {
  diffX: number;
  diffY: number;
  canQuickToggle: boolean;
}

interface TodoRowReleaseSnapshot extends TodoRowGestureSnapshot {
  gestureIntent: TodoRowGestureIntent;
  detailSwipeDistance: number;
  duplicateSwipeDistance: number;
  completeSwipeDistance: number;
}

const TAP_MAX_HORIZONTAL_DRIFT_PX = 22;
const TAP_MAX_VERTICAL_DRIFT_PX = 26;
const AXIS_LOCK_DISTANCE_PX = 12;
const SWIPE_START_DISTANCE_PX = 20;
const SWIPE_HORIZONTAL_DOMINANCE_PX = 8;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 28;

const isTapLikeRelease = ({ diffX, diffY }: Pick<TodoRowGestureSnapshot, 'diffX' | 'diffY'>): boolean => (
  Math.abs(diffX) <= TAP_MAX_HORIZONTAL_DRIFT_PX
  && Math.abs(diffY) <= TAP_MAX_VERTICAL_DRIFT_PX
);

const isHorizontalSwipeCandidate = ({
  diffX,
  diffY,
  canQuickToggle
}: TodoRowGestureSnapshot): boolean => {
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  if (absX < SWIPE_START_DISTANCE_PX) {
    return false;
  }

  if (absX < absY + SWIPE_HORIZONTAL_DOMINANCE_PX) {
    return false;
  }

  if (absY > SWIPE_MAX_VERTICAL_DRIFT_PX) {
    return false;
  }

  if (diffX < 0 && !canQuickToggle) {
    return false;
  }

  return true;
};

export const getTodoRowGestureIntent = (snapshot: TodoRowGestureSnapshot): TodoRowGestureIntent => {
  const { diffX, diffY, canQuickToggle } = snapshot;
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  if (absX < AXIS_LOCK_DISTANCE_PX && absY < AXIS_LOCK_DISTANCE_PX) {
    return 'pending';
  }

  if (absY >= absX + SWIPE_HORIZONTAL_DOMINANCE_PX) {
    return 'scroll';
  }

  if (isHorizontalSwipeCandidate({ diffX, diffY, canQuickToggle })) {
    return 'swipe';
  }

  return 'pending';
};

export const getTodoRowReleaseAction = ({
  diffX,
  diffY,
  canQuickToggle,
  gestureIntent,
  detailSwipeDistance,
  duplicateSwipeDistance,
  completeSwipeDistance
}: TodoRowReleaseSnapshot): TodoRowReleaseAction => {
  if (gestureIntent === 'scroll') {
    return 'none';
  }

  if (gestureIntent !== 'swipe' && isTapLikeRelease({ diffX, diffY })) {
    return 'openQuickActions';
  }

  if (gestureIntent === 'swipe' && isHorizontalSwipeCandidate({ diffX, diffY, canQuickToggle })) {
    if (diffX > duplicateSwipeDistance) {
      return 'duplicate';
    }

    if (diffX > detailSwipeDistance) {
      return 'openDetail';
    }
  }

  return 'openQuickActions';
};
