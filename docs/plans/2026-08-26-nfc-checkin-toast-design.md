# NFC Check-in Wording and Completion Toast

## Scope

- Keep “快速打点” for the quick punch NFC action.
- Use “打卡” for daily-check NFC wording and feedback.
- Show a success Toast when a repeated activity-tag scan ends the matching activity.

## Behavior

Activity tags continue to start an activity on the first scan and stop only matching active sessions on a repeat scan. The repeat-scan branch will report `已结束：活动名` after issuing the stop requests. Daily-check NFC feedback will use “打卡” terminology without changing the underlying action or data model.

## Verification

Run the NFC decision regression test and the production build. The stop decision remains covered by the existing utility test; the user-visible completion message is asserted through a small pure helper test.
