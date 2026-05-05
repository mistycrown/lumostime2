/**
 * @file statusBarTransitions.ts
 * @input Platform names, immersive phase, Android EdgeToEdge plugin handles
 * @output Testable status bar transition decisions and Android background application
 * @pos Utility
 * @description Centralizes immersive status bar transitions so enter/exit behavior stays consistent across components and services.
 */

export interface ImmersiveStatusBarTransition {
  hide: boolean;
  show: boolean;
  restoreManagedStatusBar: boolean;
  backgroundColor?: string;
  hideSystemBars?: boolean;
  restoreSystemBars?: boolean;
}

interface EdgeToEdgeBackgroundPlugin {
  setBackgroundColor?: (options: { color: string }) => Promise<void>;
}

export function getImmersiveStatusBarTransition(
  platform: string,
  phase: 'enter' | 'exit'
): ImmersiveStatusBarTransition {
  const isMobile = platform === 'android' || platform === 'ios';
  const isAndroid = platform === 'android';

  if (!isMobile) {
    return {
      hide: false,
      show: false,
      restoreManagedStatusBar: false,
      hideSystemBars: false,
      restoreSystemBars: false,
    };
  }

  if (phase === 'enter') {
    return {
      hide: false,
      show: !isAndroid,
      restoreManagedStatusBar: false,
      backgroundColor: '#000000',
      hideSystemBars: true,
      restoreSystemBars: false,
    };
  }

  return {
    hide: false,
    show: !isAndroid,
    restoreManagedStatusBar: true,
    hideSystemBars: false,
    restoreSystemBars: true,
  };
}

export async function applyAndroidEdgeToEdgeBackgroundColor(
  edgeToEdge: EdgeToEdgeBackgroundPlugin | null | undefined,
  color: string
): Promise<boolean> {
  if (!edgeToEdge?.setBackgroundColor) {
    return false;
  }

  await edgeToEdge.setBackgroundColor({ color });
  return true;
}
