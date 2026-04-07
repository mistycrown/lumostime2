# Achievement Bottle Ledger Design

## Context

The achievement bottle system currently mixes two different balances into one running total:

- `liveStars`: stars earned and spent inside the current active period
- `carryoverStars`: stars returned by shattering archived bottles

This creates incorrect balance recovery when a redemption record funded by carryover is later moved out of the active ledger during sealing. The visible symptom is:

1. Shatter a bottle and receive returned stars
2. Spend some of those returned stars
3. Seal a new period
4. The spent amount disappears from the active redemption ledger and the available balance incorrectly rebounds

The design below separates these sources into explicit ledger rules so sealing only archives current-period activity and never reintroduces already spent carryover.

## Goals

- Keep the current active balance correct across shatter, redeem, delete, and seal flows
- Support mixed redemptions that use both carryover and live-period stars
- Ensure sealing archives only live-period activity
- Preserve a clear audit trail for both active and archived redemption records
- Migrate legacy records without forcing users to clear local data

## Non-Goals

- Redesign the achievement UI in this phase
- Change the redemption priority rule away from carryover-first
- Introduce a brand-new double-entry ledger subsystem with separate payment tables

## Recommended Approach

Use a dual-balance model with split payment attribution on each redemption record.

Why this approach:

- It matches the agreed business rules directly
- It requires smaller changes than introducing a separate payment-entry table
- It makes sealing deterministic because the system can archive only the live-funded portion of a redemption
- It keeps deletion logic reversible because refunds can follow the original funding path

## Core Model

The current account state is composed of two independent balances:

- `liveStars`
  - Represents current active-period earned stars minus the portion of redemption spending paid from live stars
  - Can be sealed into a new archived bottle
- `carryoverStars`
  - Represents current returned stars from shattered bottles that have not yet been spent
  - Cannot be sealed into a new archived bottle

The visible available balance is:

`availableStars = liveStars + carryoverStars`

Operational rules:

- Daily rule computation only affects `liveStars`
- Shattering an archived bottle only increases `carryoverStars`
- Redemptions always spend `carryoverStars` first, then `liveStars`
- Sealing only archives `liveStars` activity
- Deleting a redemption refunds along the original payment path

## Redemption Rules

Each redemption record must explicitly store both funding sources:

- `paidFromCarryover`
- `paidFromLiveStars`

Invariant:

`paidFromCarryover + paidFromLiveStars = cost`

Examples:

- Pure carryover redemption
  - `cost = 2000`
  - `paidFromCarryover = 2000`
  - `paidFromLiveStars = 0`
- Mixed redemption
  - `cost = 1000`
  - `paidFromCarryover = 300`
  - `paidFromLiveStars = 700`

Deletion rule:

- Deleting a redemption adds `paidFromCarryover` back to `meta.activeBottleCarryoverStars`
- Deleting a redemption also removes the live-funded spend by removing that record from live spend calculations

## Seal Rules

Sealing only affects the current active period and only archives live-funded activity.

Redemption handling during sealing:

- Pure live-funded redemption
  - Move the full record into the archived bottle
  - Remove it from the active redemption ledger
- Pure carryover-funded redemption
  - Keep the full record in the active redemption ledger
  - Do not archive it into the bottle
- Mixed redemption
  - Split it into two records
  - Archived record:
    - `cost = paidFromLiveStars`
    - `paidFromCarryover = 0`
    - `paidFromLiveStars = original paidFromLiveStars`
  - Remaining active record:
    - `cost = paidFromCarryover`
    - `paidFromCarryover = original paidFromCarryover`
    - `paidFromLiveStars = 0`

Seal invariants:

- `carryoverStars` is unchanged by sealing
- Archived bottles never contain carryover-funded spending
- Active ledger retains any carryover-funded spending history still relevant to the current account

## Data Contract Changes

### `AchievementRedemptionRecord`

Required fields after migration:

- `cost: number`
- `paidFromCarryover?: number`
- `paidFromLiveStars?: number`

Normalized interpretation:

- `paidFromCarryover = clamp(record.paidFromCarryover, 0, cost)`
- `paidFromLiveStars = cost - paidFromCarryover` when missing

This keeps old records compatible while moving all new logic to explicit split attribution.

### `AchievementMeta`

Keep:

- `activeBottleCarryoverStars`

Meaning:

- The canonical remaining carryover balance for the current account
- Should be read directly for current balance calculations instead of being reverse-derived from historical action records

## Logic Changes By Module

### `src/contexts/AchievementContext.tsx`

- `redeemReward`
  - Calculate carryover-first payment split
  - Write both `paidFromCarryover` and `paidFromLiveStars`
  - Decrease `meta.activeBottleCarryoverStars` only by `paidFromCarryover`
- `deleteRedemptionRecord`
  - Refund `paidFromCarryover` back into `meta.activeBottleCarryoverStars`
  - Remove the record so the live-funded portion stops counting as spend
- `sealBottle`
  - Split in-range redemption records by funding source
  - Archive only live-funded portions
  - Keep carryover-funded portions in the active ledger
- `shatterBottle`
  - Continue increasing `meta.activeBottleCarryoverStars` by the shattered bottle amount

### `src/utils/achievementUtils.ts`

- `calculateAchievementAvailableStars`
  - Calculate current total as live-period net plus the canonical remaining carryover balance
  - Stop relying on active redemption presence to reconstruct already spent carryover
- `getAchievementSealPreview`
  - Count only `paidFromLiveStars` as seal-relevant redemption spend
  - Ignore carryover-funded portions for sealable balance calculations

### `src/repositories/dataRepository.ts`

- Normalize migrated redemption records so old data gains stable split fields
- Preserve compatibility with records that only contain `paidFromCarryover`

## Full Scenario Table

### Earning stars

- Result: increases `liveStars`
- No effect on `carryoverStars`

### Shattering a bottle

- Result: increases `carryoverStars`
- No effect on `liveStars`
- Archived bottle status changes to `shattered`

### Redeeming with enough carryover

- Spend only from `carryoverStars`
- Record remains carryover-only

### Redeeming with partial carryover and partial live balance

- Spend from `carryoverStars` first
- Spend the remainder from `liveStars`
- Record is mixed and stores both amounts

### Deleting a mixed redemption

- Refund carryover portion back to `carryoverStars`
- Refund live portion by removing that spend from the live ledger

### Sealing after pure carryover redemption

- Carryover redemption stays active
- Sealed bottle does not include it

### Sealing after mixed redemption

- Live-funded part is archived
- Carryover-funded part stays active

## Invariants

- `paidFromCarryover + paidFromLiveStars = cost`
- `carryoverStars` can be spent or retained, but never sealed
- Archived bottle redemption records must always have `paidFromCarryover = 0`
- Current balance must never increase simply because a redemption record moved from active to archived storage

## Testing Strategy

- Add utility tests for:
  - pure carryover redemption balance
  - mixed redemption balance
  - post-seal balance stability after carryover-funded spending
  - seal preview excluding carryover-funded spend
- Add context-level tests for:
  - carryover-first redemption attribution
  - deletion refund path
  - mixed redemption splitting during seal
- Keep repository migration tests for default bottle metadata and extend normalization coverage if redemption migration is updated there

## Migration Strategy

- Existing records without explicit `paidFromLiveStars` are normalized at load time
- For legacy records:
  - `paidFromCarryover = normalized existing paidFromCarryover or 0`
  - `paidFromLiveStars = cost - paidFromCarryover`
- No destructive migration is required
- Persisted data becomes explicit again after the next normal save cycle

## Risks

- If mixed redemption splitting reuses the same record IDs incorrectly, delete behavior may become ambiguous
- If archived and active split records are not clearly distinguished, the UI may show confusing duplicate entries
- If seal preview continues to read raw `cost` instead of `paidFromLiveStars`, the sealable balance will still be understated

## Decision Summary

- Use dual balances: `liveStars` plus `carryoverStars`
- Spend carryover first
- Allow mixed redemptions
- Refund along the original payment path
- Seal only live-funded activity
- Split mixed redemption records during sealing
