import { registerPlugin } from '@capacitor/core';

interface LumosNfcPlugin {
    /**
     * Starts a write session. The promise resolves when a tag is successfully written,
     * or rejects if the session is cancelled or fails.
     */
    startWriteSession(options: { uri: string }): Promise<{ status: string }>;

    /**
     * Stops the current write session.
     */
    stopWriteSession(): Promise<void>;

    /**
     * Listen for NFC tag scans (read events)
     */
    addListener(eventName: 'nfcTagScanned', listenerFunc: (data: { type: string, value?: string }) => void): Promise<any>;
}

const LumosNfc = registerPlugin<LumosNfcPlugin>('LumosNfc');

export const NfcService = {
    /**
     * Starts the NFC writing process.
     * The user should see a "Ready to scan" UI.
     * When a tag is tapped, the native layer writes the URI and AAR.
     */
    writeTag: async (uri: string): Promise<boolean> => {
        try {
            const result = await LumosNfc.startWriteSession({ uri });
            return result.status === 'success';
        } catch (e) {
            console.error('NFC Write Error:', e);
            throw e;
        }
    },

    cancelWrite: async () => {
        try {
            await LumosNfc.stopWriteSession();
        } catch (e) {
            // Ignore errors on cancel
        }
    },

    addListener: (eventName: 'nfcTagScanned', listenerFunc: (data: { type: string, value?: string }) => void) => {
        return LumosNfc.addListener(eventName, listenerFunc);
    }
};
