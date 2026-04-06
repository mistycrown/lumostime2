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
  disableEdgeToEdgeInsets?: boolean;
  enableEdgeToEdgeInsets?: boolean;
}

interface EdgeToEdgeBackgroundPlugin {
  setBackgroundColor?: (options: { color: string }) => Promise<void>;
}

export function getImmersiveStatusBarTransition(
  platform: string,
  phase: 'enter' | 'exit'
): ImmersiveStatusBarTransition {
  const isMobile = platform === 'android' || platform === 'ios';

  if (!isMobile) {
    return {
      hide: false,
      show: false,
      restoreManagedStatusBar: false,
      hideSystemBars: false,
      restoreSystemBars: false,
      disableEdgeToEdgeInsets: false,
      enableEdgeToEdgeInsets: false,
    };
  }

  if (phase === 'enter') {
    return {
      hide: false,
      show: true,
      restoreManagedStatusBar: false,
      backgroundColor: '#000000',
      hideSystemBars: true,
      restoreSystemBars: false,
      disableEdgeToEdgeInsets: true,
      enableEdgeToEdgeInsets: false,
    };
  }

  return {
    hide: false,
    show: true,
    restoreManagedStatusBar: true,
    hideSystemBars: false,
    restoreSystemBars: true,
    disableEdgeToEdgeInsets: false,
    enableEdgeToEdgeInsets: true,
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
