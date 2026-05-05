/**
 * @file todoRowInteraction.ts
 * @input Pointer deltas plus todo-row swipe capability flags
 * @output Gesture intent classification and release actions for todo-row interactions
 * @pos Utility
 * @description Helps TodoView distinguish taps, scrolls, and deliberate horizontal swipes so list rows do not accidentally swallow taps or toggle completion during scrolling.
 * @updated 2026-05-05: Keeps completion toggles on left swipes for both complete and incomplete rows, while preserving right-swipe detail and deeper duplicate swipes.
 * @updated 2026-05-05: Removed the tap-vs-swipe dead zone and only allows directional quick-toggle swipes after a clear horizontal intent.
 * @updated 2026-05-05: Added conservative axis-locking helpers for todo-row quick actions.
 */

export type TodoRowGestureIntent = 'pending' | 'scroll' | 'swipe';
export type TodoRowReleaseAction = 'none' | 'openQuickActions' | 'openDetail' | 'duplicate' | 'toggleComplete';

interface TodoRowGestureSnapshot {
  diffX: number;
  diffY: number;
  canQuickToggle: boolean;
  quickToggleDirection?: 'left' | 'right' | 'none';
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

const getQuickToggleDirection = ({
  canQuickToggle,
  quickToggleDirection
}: Pick<TodoRowGestureSnapshot, 'canQuickToggle' | 'quickToggleDirection'>): 'left' | 'right' | 'none' => {
  if (quickToggleDirection) {
    return quickToggleDirection;
  }

  return canQuickToggle ? 'left' : 'none';
};

const isTapLikeRelease = ({ diffX, diffY }: Pick<TodoRowGestureSnapshot, 'diffX' | 'diffY'>): boolean => (
  Math.abs(diffX) <= TAP_MAX_HORIZONTAL_DRIFT_PX
  && Math.abs(diffY) <= TAP_MAX_VERTICAL_DRIFT_PX
);

const isHorizontalSwipeCandidate = ({
  diffX,
  diffY,
  canQuickToggle,
  quickToggleDirection
}: TodoRowGestureSnapshot): boolean => {
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);
  const toggleDirection = getQuickToggleDirection({ canQuickToggle, quickToggleDirection });

  if (absX < SWIPE_START_DISTANCE_PX) {
    return false;
  }

  if (absX < absY + SWIPE_HORIZONTAL_DOMINANCE_PX) {
    return false;
  }

  if (absY > SWIPE_MAX_VERTICAL_DRIFT_PX) {
    return false;
  }

  if (diffX < 0 && toggleDirection !== 'left') {
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
  quickToggleDirection,
  gestureIntent,
  detailSwipeDistance,
  duplicateSwipeDistance,
  completeSwipeDistance
}: TodoRowReleaseSnapshot): TodoRowReleaseAction => {
  const toggleDirection = getQuickToggleDirection({ canQuickToggle, quickToggleDirection });

  if (gestureIntent === 'scroll') {
    return 'none';
  }

  if (gestureIntent !== 'swipe' && isTapLikeRelease({ diffX, diffY })) {
    return 'openQuickActions';
  }

  if (gestureIntent !== 'swipe') {
    return 'none';
  }

  if (!isHorizontalSwipeCandidate({ diffX, diffY, canQuickToggle, quickToggleDirection })) {
    return 'none';
  }

  if (diffX > duplicateSwipeDistance) {
    return 'duplicate';
  }

  if (diffX > detailSwipeDistance) {
    if (toggleDirection === 'right') {
      return 'toggleComplete';
    }
    return 'openDetail';
  }

  if (toggleDirection === 'left' && diffX < -completeSwipeDistance) {
    return 'toggleComplete';
  }

  return 'none';
};
