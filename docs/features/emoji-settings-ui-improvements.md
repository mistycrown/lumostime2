# Emoji Settings UI Improvements

## Date
2026-02-15

## Overview
Fixed multiple UI issues in the Emoji Settings page and added important constraints to improve visual consistency and user experience.

## Changes Made

### 1. Navigation Bar Visibility
**Problem**: The bottom navigation bar was showing when the Emoji Settings page was open.

**Solution**: Added `!isSettingsOpen` condition to the `BottomNavigation` visibility check in `App.tsx`.

**File**: `src/App.tsx`
```typescript
isVisible={
  !focusDetailSessionId &&
  !isDailyReviewOpen &&
  !isWeeklyReviewOpen &&
  !isMonthlyReviewOpen &&
  !selectedTagId &&
  !selectedCategoryId &&
  !selectedScopeId &&
  currentView !== 'STATS' &&
  !isTodoManaging &&
  !isTagsManaging &&
  !isScopeManaging &&
  !isSettingsOpen  // Added this line
}
```

### 2. Emoji and Text Alignment
**Problem**: Emoji and label text were not properly aligned in the emoji cards.

**Solution**: Added `flex items-center` to the label span to ensure vertical alignment with the emoji.

**File**: `src/views/settings/EmojiSettingsView.tsx`
```typescript
<span className="text-xs text-stone-600 leading-none flex items-center">{item.label}</span>
```

### 3. Selected Emoji Ring Color
**Problem**: Selected emoji in edit mode showed a bright blue border that didn't match the design.

**Solution**: Changed the selected state styling from `bg-stone-200 ring-1 ring-stone-400` to `bg-stone-100 ring-1 ring-stone-300` for a more subtle appearance.

### 4. Input Field Alignment
**Problem**: Input fields had inconsistent heights causing misalignment.

**Solution**: Changed the flex container from `items-center` to `items-stretch` to ensure all elements (inputs and buttons) have the same height (h-9).

### 5. Focus Ring Color
**Problem**: Focus rings were using default blue color.

**Solution**: Already implemented - using `focus:ring-stone-400` for stone-colored focus rings that match the design system.

### 6. Delete Confirmation Modal
**Problem**: Delete action used browser's default `window.confirm` instead of the app's custom modal.

**Solution**: Replaced `window.confirm` with the app's `ConfirmModal` component for consistent UI.

**Implementation**:
- Added `deleteConfirmGroupId` state to track which group is being deleted
- Created `confirmDeleteGroup` function to handle the actual deletion
- Added `ConfirmModal` component at the bottom of the view with proper props

### 7. Preset Emoji Groups Reduction
**Problem**: Too many preset groups (4 groups: moods, weather, nature, activities).

**Solution**: Removed "天气符号" (weather) and "自然元素" (nature) groups, keeping only:
- 心情表情 (Mood Emojis) - 15 emojis
- 活动符号 (Activity Symbols) - 15 emojis

**Files Updated**:
- `src/views/settings/EmojiSettingsView.tsx` - Removed weather and nature from PRESET_EMOJI_GROUPS
- `src/components/MoodPicker.tsx` - Removed weather and nature from presetGroups

### 8. Maximum Emoji Limit Per Group
**Problem**: No limit on the number of emojis per group, could lead to UI issues.

**Solution**: Implemented a maximum limit of 15 emojis per group.

**Implementation**:
- Added `MAX_EMOJIS_PER_GROUP = 15` constant
- Added emoji count display showing "X/15" in the add/edit section
- Disabled input fields and add button when limit is reached
- Added validation in `handleAddOrUpdateEmoji` to prevent adding beyond limit
- Shows warning message "已达到最大数量限制（15个）" when limit is reached
- Edit mode still works even at limit (allows updating existing emojis)

## Technical Details

### Files Modified
1. `src/App.tsx` - Added navigation bar visibility condition
2. `src/views/settings/EmojiSettingsView.tsx` - Fixed UI alignment, added ConfirmModal, removed preset groups, added emoji limit
3. `src/components/MoodPicker.tsx` - Removed weather and nature preset groups

### Design Principles Applied
- Consistent use of stone color palette
- Proper vertical alignment using flexbox
- Subtle visual feedback for selected states
- Uniform component heights for better visual harmony
- Use of app's custom modal for all confirmations
- Reasonable limits to prevent UI degradation

## Testing Checklist
- [x] Navigation bar hidden when Emoji Settings page is open
- [x] Emoji and text properly aligned in emoji cards
- [x] Selected emoji shows subtle ring instead of bright border
- [x] Input fields and buttons have consistent heights
- [x] Focus rings use stone color instead of blue
- [x] Delete confirmation uses app's ConfirmModal
- [x] Only 2 preset groups remain (moods and activities)
- [x] Cannot add more than 15 emojis per group
- [x] Warning message shows when limit is reached
- [x] Can still edit existing emojis when at limit
- [x] All functionality works as expected (add, edit, delete emojis)

## Related Features
- Mood Calendar (uses emoji groups from this settings page)
- Mood Picker Modal (dynamically loads selected emoji group)
- Twemoji Integration (renders emojis in settings page)
- ConfirmModal (used for delete confirmations)
