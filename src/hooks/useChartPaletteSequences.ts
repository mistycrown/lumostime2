/**
 * @file useChartPaletteSequences.ts
 * @input Local custom chart palette sequence storage.
 * @output Reactive custom sequence list for palette selectors and editors.
 * @pos Hook
 */
import { useEffect, useState } from 'react';
import type { CustomChartPaletteSequence } from '../types';
import { CHART_PALETTE_SEQUENCES_UPDATED_EVENT, chartPaletteSequenceService } from '../services/chartPaletteSequenceService';

export const useChartPaletteSequences = (): CustomChartPaletteSequence[] => {
  const [sequences, setSequences] = useState(() => chartPaletteSequenceService.getAll());

  useEffect(() => {
    const sync = () => setSequences(chartPaletteSequenceService.getAll());
    window.addEventListener(CHART_PALETTE_SEQUENCES_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    sync();
    return () => {
      window.removeEventListener(CHART_PALETTE_SEQUENCES_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return sequences;
};
