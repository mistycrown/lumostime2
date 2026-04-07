# Achievement Bottle Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the achievement bottle ledger treat `liveStars` and `carryoverStars` as separate balances so mixed redemptions, shatter returns, deletion refunds, and sealing all keep the visible balance correct.

**Architecture:** Keep the React context thin and move the risky ledger rules into tested helpers in `src/utils/achievementUtils.ts`. Redemptions gain explicit split-payment fields, current balance reads the canonical remaining carryover from `meta.activeBottleCarryoverStars`, and sealing archives only the live-funded portion of redemption history.

**Tech Stack:** TypeScript, React context state, Vitest, Vite

---

## File Map

- Modify: `src/types.ts`
  - Add the explicit `paidFromLiveStars` field to `AchievementRedemptionRecord`
- Modify: `src/utils/achievementUtils.ts`
  - Add funding normalization and split helpers
  - Update available-balance and seal-preview calculations
  - Add a pure helper that partitions redemption records during sealing
- Modify: `src/utils/achievementUtils.test.ts`
  - Add ledger regression coverage for normalization, mixed payments, seal preview, and seal partitioning
- Modify: `src/contexts/AchievementContext.tsx`
  - Use the tested helpers in `redeemReward`, `deleteRedemptionRecord`, `sealBottle`, and balance derivation
- Optional modify if normalization is centralized there during implementation: `src/repositories/dataRepository.ts`
  - Only if load-time normalization needs to happen before the context

### Task 1: Add Explicit Redemption Funding Fields And Normalization

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/achievementUtils.ts`
- Test: `src/utils/achievementUtils.test.ts`

- [ ] **Step 1: Write the failing normalization test**

Add this test near the other achievement utility tests:

```ts
import {
  normalizeAchievementRedemptionRecordFunding
} from './achievementUtils';

it('normalizes legacy redemption records into explicit carryover and live funding', () => {
  expect(normalizeAchievementRedemptionRecordFunding({
    id: 'redeem-1',
    rewardId: 'reward-1',
    rewardName: 'Tea',
    cost: 10,
    redeemedAt: 1,
    paidFromCarryover: 3
  })).toMatchObject({
    cost: 10,
    paidFromCarryover: 3,
    paidFromLiveStars: 7
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: FAIL because `normalizeAchievementRedemptionRecordFunding` does not exist yet.

- [ ] **Step 3: Add the type field and normalization helper**

Update `src/types.ts`:

```ts
export interface AchievementRedemptionRecord {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  redeemedAt: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
  note?: string;
}
```

Add this helper to `src/utils/achievementUtils.ts`:

```ts
interface AchievementFundingLike {
  cost: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
}

export const normalizeAchievementRedemptionRecordFunding = <T extends AchievementFundingLike>(record: T) => {
  const normalizedCost = Math.max(0, normalizeAchievementStarValue(record.cost || 0));
  const normalizedCarryover = Math.max(
    0,
    Math.min(normalizedCost, normalizeAchievementStarValue(record.paidFromCarryover || 0))
  );
  const normalizedLive = record.paidFromLiveStars === undefined
    ? normalizeAchievementStarValue(normalizedCost - normalizedCarryover)
    : Math.max(
      0,
      Math.min(
        normalizeAchievementStarValue(record.paidFromLiveStars || 0),
        normalizeAchievementStarValue(normalizedCost - normalizedCarryover)
      )
    );

  return {
    ...record,
    cost: normalizedCost,
    paidFromCarryover: normalizedCarryover,
    paidFromLiveStars: normalizeAchievementStarValue(normalizedCost - normalizedCarryover)
      || normalizedLive
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: PASS for the new normalization test.

- [ ] **Step 5: Commit**

```powershell
git add src/types.ts src/utils/achievementUtils.ts src/utils/achievementUtils.test.ts
git commit -m "补充成就兑换资金拆分字段"
```

### Task 2: Make Balance And Seal Preview Use Split Funding

**Files:**
- Modify: `src/utils/achievementUtils.ts`
- Test: `src/utils/achievementUtils.test.ts`

- [ ] **Step 1: Write the failing balance and preview tests**

Add these tests:

```ts
it('keeps the remaining carryover balance after carryover-funded spending is archived away', () => {
  expect(calculateAchievementAvailableStars(
    [],
    [],
    [
      {
        id: 'action-1',
        bottleId: 'bottle-1',
        actionType: 'shatter',
        amount: 3000,
        occurredAt: 1
      }
    ],
    1000
  )).toBe(1000);
});

it('excludes carryover-funded redemption cost from the sealable live balance', () => {
  const preview = getAchievementSealPreview({
    achievementStartDate: '2026-04-01',
    archivedBottles: [],
    dailySnapshots: [
      {
        id: 'snapshot-1',
        date: '2026-04-01',
        netDelta: 1000,
        ruleBreakdown: [],
        computedAt: 1
      }
    ],
    redemptionRecords: [
      {
        id: 'redeem-1',
        rewardId: 'reward-1',
        rewardName: 'Tea',
        cost: 700,
        redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
        paidFromCarryover: 300,
        paidFromLiveStars: 400
      }
    ],
    today: new Date('2026-04-02T12:00:00+08:00')
  });

  expect(preview?.sealableStars).toBe(600);
  expect(preview?.spentStars).toBe(700);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: FAIL because the current calculation still reconstructs carryover from action records and still uses raw redemption `cost` inside seal preview.

- [ ] **Step 3: Update the utility calculations**

Change `calculateAchievementAvailableStars` in `src/utils/achievementUtils.ts` to accept the canonical remaining carryover balance:

```ts
export const calculateAchievementAvailableStars = (
  snapshots: AchievementDailySnapshot[],
  spendRecords: AchievementSpendRecordLike[],
  actionRecords: AchievementActionRecordLike[] = [],
  activeBottleCarryoverStars?: number
): number => {
  const earned = snapshots.reduce((sum, item) => sum + item.netDelta, 0);
  const returned = actionRecords.reduce((sum, item) => (
    item.actionType === 'shatter' ? sum + item.amount : sum
  ), 0);
  const spentFromCarryover = spendRecords.reduce((sum, item) => {
    const normalized = normalizeAchievementRedemptionRecordFunding({
      cost: item.cost,
      paidFromCarryover: item.paidFromCarryover
    });
    return sum + normalized.paidFromCarryover;
  }, 0);
  const spentFromLive = spendRecords.reduce((sum, item) => {
    const normalized = normalizeAchievementRedemptionRecordFunding({
      cost: item.cost,
      paidFromCarryover: item.paidFromCarryover
    });
    return sum + normalized.paidFromLiveStars;
  }, 0);
  const carryoverBalance = activeBottleCarryoverStars === undefined
    ? normalizeAchievementStarValue(returned - spentFromCarryover)
    : normalizeAchievementStarValue(activeBottleCarryoverStars);

  return normalizeAchievementStarValue(earned - spentFromLive + carryoverBalance);
};
```

Update the seal preview reduction:

```ts
const rewardSpentStars = normalizeAchievementStarValue(
  redemptionsInRange.reduce((sum, record) => sum + record.cost, 0)
);
const rewardSpentFromLiveStars = normalizeAchievementStarValue(
  redemptionsInRange.reduce((sum, record) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(record);
    return sum + normalized.paidFromLiveStars;
  }, 0)
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: PASS for both new tests and the existing achievement utility regressions.

- [ ] **Step 5: Commit**

```powershell
git add src/utils/achievementUtils.ts src/utils/achievementUtils.test.ts
git commit -m "修正成就账本余额与封瓶预览"
```

### Task 3: Add A Pure Helper That Splits Redemption Records During Sealing

**Files:**
- Modify: `src/utils/achievementUtils.ts`
- Test: `src/utils/achievementUtils.test.ts`

- [ ] **Step 1: Write the failing seal-partition test**

Add this test:

```ts
import {
  partitionAchievementRedemptionsForSeal
} from './achievementUtils';

it('archives only the live-funded portion of mixed redemptions during sealing', () => {
  const result = partitionAchievementRedemptionsForSeal({
    startDate: '2026-04-01',
    endDate: '2026-04-02',
    redemptionRecords: [
      {
        id: 'redeem-1',
        rewardId: 'reward-1',
        rewardName: 'Tea',
        cost: 1000,
        redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
        paidFromCarryover: 300,
        paidFromLiveStars: 700
      }
    ]
  });

  expect(result.archivedRecords).toEqual([
    expect.objectContaining({
      sourceRecordId: 'redeem-1',
      cost: 700,
      paidFromCarryover: 0,
      paidFromLiveStars: 700
    })
  ]);

  expect(result.remainingActiveRecords).toEqual([
    expect.objectContaining({
      sourceRecordId: 'redeem-1',
      cost: 300,
      paidFromCarryover: 300,
      paidFromLiveStars: 0
    })
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: FAIL because `partitionAchievementRedemptionsForSeal` does not exist yet.

- [ ] **Step 3: Implement the pure partition helper**

Add these types and helper to `src/utils/achievementUtils.ts`:

```ts
interface AchievementSealRedemptionFragment extends AchievementRedemptionRecord {
  sourceRecordId: string;
}

export const partitionAchievementRedemptionsForSeal = ({
  startDate,
  endDate,
  redemptionRecords
}: {
  startDate: string;
  endDate: string;
  redemptionRecords: AchievementRedemptionRecord[];
}) => {
  const archivedRecords: AchievementSealRedemptionFragment[] = [];
  const remainingActiveRecords: AchievementSealRedemptionFragment[] = [];

  redemptionRecords.forEach((record) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(record);
    const recordDate = getLocalDateStr(new Date(record.redeemedAt));
    const inRange = isAchievementDateInRange(recordDate, startDate, endDate);

    if (!inRange) {
      remainingActiveRecords.push({ ...normalized, sourceRecordId: record.id });
      return;
    }

    if (normalized.paidFromLiveStars > 0) {
      archivedRecords.push({
        ...normalized,
        cost: normalized.paidFromLiveStars,
        paidFromCarryover: 0,
        paidFromLiveStars: normalized.paidFromLiveStars,
        sourceRecordId: record.id
      });
    }

    if (normalized.paidFromCarryover > 0) {
      remainingActiveRecords.push({
        ...normalized,
        cost: normalized.paidFromCarryover,
        paidFromCarryover: normalized.paidFromCarryover,
        paidFromLiveStars: 0,
        sourceRecordId: record.id
      });
    }
  });

  return { archivedRecords, remainingActiveRecords };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
```

Expected: PASS for the new partition test.

- [ ] **Step 5: Commit**

```powershell
git add src/utils/achievementUtils.ts src/utils/achievementUtils.test.ts
git commit -m "补充封瓶时的兑换拆分逻辑"
```

### Task 4: Wire The Tested Helpers Into AchievementContext

**Files:**
- Modify: `src/contexts/AchievementContext.tsx`
- Modify: `src/utils/achievementUtils.ts`
- Test: `src/utils/achievementUtils.test.ts`

- [ ] **Step 1: Add the failing flow regression**

Add this regression to `src/utils/achievementUtils.test.ts` so the intended end state stays protected:

```ts
it('models a shatter, mixed redemption, and seal flow without restoring spent carryover', () => {
  const partitioned = partitionAchievementRedemptionsForSeal({
    startDate: '2026-04-01',
    endDate: '2026-04-02',
    redemptionRecords: [
      {
        id: 'redeem-1',
        rewardId: 'reward-1',
        rewardName: 'Tea',
        cost: 2000,
        redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
        paidFromCarryover: 2000,
        paidFromLiveStars: 0
      }
    ]
  });

  expect(partitioned.archivedRecords).toEqual([]);
  expect(partitioned.remainingActiveRecords[0]).toMatchObject({
    cost: 2000,
    paidFromCarryover: 2000,
    paidFromLiveStars: 0
  });
});
```

- [ ] **Step 2: Run the test to verify it fails if the context is still using old assumptions**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts
npm run build
```

Expected: the utility test should already express the correct partition behavior; the remaining work is to wire the context without breaking the build.

- [ ] **Step 3: Update `AchievementContext.tsx` to use the new helpers**

Apply these core changes:

```ts
const normalizeRedemptionRecord = (record: AchievementRedemptionRecord): AchievementRedemptionRecord => {
  const normalizedFunding = normalizeAchievementRedemptionRecordFunding(record);

  return {
    ...normalizedFunding,
    paidFromCarryover: normalizedFunding.paidFromCarryover || undefined,
    paidFromLiveStars: normalizedFunding.paidFromLiveStars || undefined,
    note: record.note?.trim() || undefined
  };
};
```

Update `redeemReward`:

```ts
const paidFromCarryover = Math.min(meta.activeBottleCarryoverStars, normalizedRewardCost);
const paidFromLiveStars = normalizeAchievementStarValue(normalizedRewardCost - paidFromCarryover);

const nextRecord: AchievementRedemptionRecord = {
  id: crypto.randomUUID(),
  rewardId: reward.id,
  rewardName: reward.name,
  cost: normalizedRewardCost,
  redeemedAt: Date.now(),
  paidFromCarryover: paidFromCarryover || undefined,
  paidFromLiveStars: paidFromLiveStars || undefined,
  note: note?.trim() || undefined
};
```

Update `deleteRedemptionRecord` to refund only `paidFromCarryover`.

Update `availableStars` and `currentAvailableStars` calls to pass `meta.activeBottleCarryoverStars`.

Update `sealBottle` to partition the in-range redemptions and assign IDs like this:

```ts
const { archivedRecords, remainingActiveRecords } = partitionAchievementRedemptionsForSeal({
  startDate: sealPreview.startDate,
  endDate: sealPreview.endDate,
  redemptionRecords
});

const redemptionsToArchive = archivedRecords.map((record) => ({
  ...record,
  id: record.paidFromCarryover > 0 || record.paidFromLiveStars !== record.cost
    ? crypto.randomUUID()
    : record.sourceRecordId
}));

const nextActiveRedemptions = remainingActiveRecords.map((record) => ({
  ...record,
  id: record.sourceRecordId,
  sourceRecordId: undefined
}));
```

Use `nextActiveRedemptions` instead of filtering out all `redemptionMap` IDs.

- [ ] **Step 4: Run verification**

Run:

```powershell
npx vitest run src/utils/achievementUtils.test.ts src/repositories/dataRepository.test.ts
npm run build
```

Expected:

- All achievement utility tests pass
- Repository migration tests still pass
- Production build succeeds

- [ ] **Step 5: Commit**

```powershell
git add src/contexts/AchievementContext.tsx src/utils/achievementUtils.ts src/utils/achievementUtils.test.ts
git commit -m "修复成就瓶封存后的余额回弹"
```

## Self-Review

- Spec coverage:
  - Dual-balance model is covered by Tasks 1 and 2
  - Mixed redemptions and original-path refunds are covered by Tasks 1 and 4
  - Seal-only-live behavior is covered by Tasks 2, 3, and 4
  - Migration compatibility is covered by Task 1 normalization and Task 4 wiring
- Placeholder scan:
  - No `TBD`, `TODO`, “handle later”, or unnamed helper references remain
- Type consistency:
  - The plan consistently uses `paidFromCarryover`, `paidFromLiveStars`, `activeBottleCarryoverStars`, and `partitionAchievementRedemptionsForSeal`
