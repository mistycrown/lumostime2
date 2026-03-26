/**
 * @file LumosNfcPlugin.java
 * @input NFC Tag Scans
 * @output JS Events
 * @pos Native Plugin
 * @description Capacitor plugin for handling retained NFC tag scan events, read fallbacks, and write session cleanup.
 */
package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Build;
import android.os.Parcelable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LumosNfc")
public class LumosNfcPlugin extends Plugin {

    private static final String EVENT_TAG_SCANNED = "nfcTagScanned";

    private boolean isWriting = false;
    private PluginCall activeCall = null;

    @PluginMethod
    public void startWriteSession(PluginCall call) {
        NfcAdapter nfcAdapter = getActivity() == null ? null : NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter == null) {
            call.reject("NFC is not supported on this device");
            return;
        }

        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled");
            return;
        }

        isWriting = true;
        activeCall = call;
        call.setKeepAlive(true);
        enableForegroundDispatch();
    }

    @PluginMethod
    public void stopWriteSession(PluginCall call) {
        if (activeCall != null) {
            activeCall.reject("Session stopped by user");
        }
        resetWriteSession();
        disableForegroundDispatch();
        call.resolve();
    }

    private void enableForegroundDispatch() {
        if (getActivity() == null) {
            return;
        }

        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter != null && nfcAdapter.isEnabled()) {
            Intent intent = new Intent(getActivity(), getActivity().getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(getActivity(), 0, intent, flags);
            IntentFilter[] intentFilters = new IntentFilter[] {};

            nfcAdapter.enableForegroundDispatch(getActivity(), pendingIntent, intentFilters, null);
        }
    }

    private void disableForegroundDispatch() {
        if (getActivity() == null) {
            return;
        }

        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(getActivity());
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (!isNfcIntent(intent)) {
            return;
        }

        Tag tag = getTagFromIntent(intent);
        if (isWriting) {
            writeTag(tag);
        } else {
            readTag(intent, tag);
        }
    }

    private boolean isNfcIntent(Intent intent) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        return NfcAdapter.ACTION_TAG_DISCOVERED.equals(action)
            || NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)
            || NfcAdapter.ACTION_TECH_DISCOVERED.equals(action);
    }

    private Tag getTagFromIntent(Intent intent) {
        if (intent == null) {
            return null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag.class);
        }

        return intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
    }

    private void readTag(Intent intent, Tag tag) {
        try {
            NdefMessage[] messages = extractMessagesFromIntent(intent);
            if (messages == null || messages.length == 0) {
                messages = readMessagesFromTag(tag);
            }

            Uri uri = extractUri(messages);
            if (uri != null) {
                emitScanPayload("uri", uri.toString(), null);
                return;
            }

            emitScanPayload("unknown", null, "No URI record found on tag");
        } catch (Exception e) {
            emitScanPayload("error", null, e.getMessage() != null ? e.getMessage() : "Unknown NFC read error");
        }
    }

    private NdefMessage[] extractMessagesFromIntent(Intent intent) {
        if (intent == null) {
            return null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES, NdefMessage.class);
        }

        Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (rawMessages == null || rawMessages.length == 0) {
            return null;
        }

        NdefMessage[] messages = new NdefMessage[rawMessages.length];
        for (int i = 0; i < rawMessages.length; i++) {
            messages[i] = (NdefMessage) rawMessages[i];
        }
        return messages;
    }

    private NdefMessage[] readMessagesFromTag(Tag tag) throws Exception {
        if (tag == null) {
            return null;
        }

        Ndef ndef = Ndef.get(tag);
        if (ndef == null) {
            return null;
        }

        boolean connectedHere = false;
        try {
            if (!ndef.isConnected()) {
                ndef.connect();
                connectedHere = true;
            }

            NdefMessage cachedMessage = ndef.getCachedNdefMessage();
            if (cachedMessage != null) {
                return new NdefMessage[] { cachedMessage };
            }

            NdefMessage liveMessage = ndef.getNdefMessage();
            if (liveMessage != null) {
                return new NdefMessage[] { liveMessage };
            }

            return null;
        } finally {
            if (connectedHere && ndef.isConnected()) {
                ndef.close();
            }
        }
    }

    private Uri extractUri(NdefMessage[] messages) {
        if (messages == null) {
            return null;
        }

        for (NdefMessage message : messages) {
            if (message == null) {
                continue;
            }

            for (NdefRecord record : message.getRecords()) {
                Uri uri = record.toUri();
                if (uri != null) {
                    return uri;
                }
            }
        }

        return null;
    }

    private void emitScanPayload(String type, String value, String message) {
        JSObject payload = new JSObject();
        payload.put("type", type);
        if (value != null) {
            payload.put("value", value);
        }
        if (message != null) {
            payload.put("message", message);
        }
        notifyListeners(EVENT_TAG_SCANNED, payload, true);
    }

    private void writeTag(Tag tag) {
        if (activeCall == null) {
            return;
        }

        if (tag == null) {
            rejectActiveCall("No NFC tag detected");
            return;
        }

        String uriStr = activeCall.getString("uri");
        if (uriStr == null) {
            rejectActiveCall("URI is required");
            return;
        }

        try {
            if ("lumostime://clear".equals(uriStr)) {
                NdefMessage message = new NdefMessage(new NdefRecord(NdefRecord.TNF_EMPTY, null, null, null));
                writeNdefMessageToTag(tag, message);
                return;
            }

            NdefRecord uriRecord = NdefRecord.createUri(Uri.parse(uriStr));
            NdefRecord aarRecord = NdefRecord.createApplicationRecord("com.mistycrown.lumostime");
            NdefMessage message = new NdefMessage(new NdefRecord[] { uriRecord, aarRecord });
            writeNdefMessageToTag(tag, message);
        } catch (Exception e) {
            rejectActiveCall("Write failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    private void writeNdefMessageToTag(Tag tag, NdefMessage message) {
        Ndef ndef = null;
        NdefFormatable formatable = null;

        try {
            ndef = Ndef.get(tag);
            if (ndef != null) {
                ndef.connect();
                if (ndef.getMaxSize() < message.toByteArray().length) {
                    rejectActiveCall("Tag capacity is too small");
                    return;
                }

                if (!ndef.isWritable()) {
                    rejectActiveCall("Tag is read-only");
                    return;
                }

                ndef.writeNdefMessage(message);
                resolveActiveCall();
                return;
            }

            formatable = NdefFormatable.get(tag);
            if (formatable != null) {
                formatable.connect();
                formatable.format(message);
                resolveActiveCall();
                return;
            }

            rejectActiveCall("Tag is not NDEF formatted or formatable");
        } catch (Exception e) {
            rejectActiveCall("Write failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
        } finally {
            try {
                if (ndef != null && ndef.isConnected()) {
                    ndef.close();
                }
            } catch (Exception ignored) {
            }

            try {
                if (formatable != null) {
                    formatable.close();
                }
            } catch (Exception ignored) {
            }
        }
    }

    private void resolveActiveCall() {
        if (activeCall != null) {
            JSObject payload = new JSObject();
            payload.put("status", "success");
            activeCall.resolve(payload);
        }
        resetWriteSession();
    }

    private void rejectActiveCall(String message) {
        if (activeCall != null) {
            activeCall.reject(message);
        }
        resetWriteSession();
    }

    private void resetWriteSession() {
        isWriting = false;
        activeCall = null;
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        disableForegroundDispatch();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        enableForegroundDispatch();
    }
}
