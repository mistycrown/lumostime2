/**
 * @file hardwareBackHandlerStack.ts
 * @input Overlay-level back handlers
 * @output Shared registration helpers for Android hardware-back consumers
 * @description Keeps the hardware-back handler stack free of React-context imports so overlays can participate without pulling in app-level hooks.
 */

export type HardwareBackHandler = () => boolean;

const hardwareBackHandlerStack: HardwareBackHandler[] = [];

export const registerHardwareBackHandler = (handler: HardwareBackHandler) => {
  hardwareBackHandlerStack.push(handler);

  return () => {
    const handlerIndex = hardwareBackHandlerStack.lastIndexOf(handler);
    if (handlerIndex >= 0) {
      hardwareBackHandlerStack.splice(handlerIndex, 1);
    }
  };
};

export const runRegisteredHardwareBackHandler = () => {
  for (let index = hardwareBackHandlerStack.length - 1; index >= 0; index -= 1) {
    const handler = hardwareBackHandlerStack[index];
    if (handler()) {
      return true;
    }
  }

  return false;
};
