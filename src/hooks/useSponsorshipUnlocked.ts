/**
 * @file useSponsorshipUnlocked.ts
 * @input Persisted sponsorship verification state.
 * @output Reactive unlocked flag for premium settings.
 * @pos Hook
 */
import { useEffect, useState } from "react";
import {
  RedemptionService,
  SPONSORSHIP_STATUS_UPDATED_EVENT,
} from "../services/redemptionService";

export const useSponsorshipUnlocked = (): boolean => {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const result = await new RedemptionService().isVerified();
      if (active) setUnlocked(result.isVerified);
    };
    window.addEventListener(SPONSORSHIP_STATUS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    sync();
    return () => {
      active = false;
      window.removeEventListener(SPONSORSHIP_STATUS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return unlocked;
};
