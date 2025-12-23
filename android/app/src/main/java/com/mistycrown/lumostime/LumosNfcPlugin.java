/**
 * @file LumosNfcPlugin.java
 * @input NFC Tag Scans
 * @output JS Events
 * @pos Native Plugin
 * @description Capacitor plugin for handling NFC tag reading and writing operations.
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

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LumosNfc")
public class LumosNfcPlugin extends Plugin {

    private boolean isWriting = false;
    private PluginCall activeCall = null;

    @PluginMethod
    public void startWriteSession(PluginCall call) {
        isWriting = true;
        activeCall = call;
        // Keep the call to resolve later when tag is found
        call.setKeepAlive(true);

        enableForegroundDispatch();
    }

    @PluginMethod
    public void stopWriteSession(PluginCall call) {
        isWriting = false;
        disableForegroundDispatch();
        if (activeCall != null) {
            activeCall.reject("Session stopped by user");
            activeCall = null;
        }
        call.resolve();
    }

    private void enableForegroundDispatch() {
        if (getActivity() == null)
            return;
        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter != null && nfcAdapter.isEnabled()) {
            Intent intent = new Intent(getActivity(), getActivity().getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) { // Android 12+
                flags |= PendingIntent.FLAG_MUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(getActivity(), 0, intent, flags);
            IntentFilter[] intentFilters = new IntentFilter[] {};

            nfcAdapter.enableForegroundDispatch(getActivity(), pendingIntent, intentFilters, null);
        }
    }

    private void disableForegroundDispatch() {
        if (getActivity() == null)
            return;
        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(getActivity());
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String action = intent.getAction();
        if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)) {

            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);

            if (isWriting) {
                writeTag(tag);
            } else {
                readTag(intent);
            }
        }
    }

    private void readTag(Intent intent) {
        try {
            NdefMessage[] messages = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                messages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES, NdefMessage.class);
            } else {
                android.os.Parcelable[] rawMsgs = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
                if (rawMsgs != null) {
                    messages = new NdefMessage[rawMsgs.length];
                    for (int i = 0; i < rawMsgs.length; i++) {
                        messages[i] = (NdefMessage) rawMsgs[i];
                    }
                }
            }

            if (messages != null && messages.length > 0) {
                NdefRecord[] records = messages[0].getRecords();
                for (NdefRecord record : records) {
                    Uri uri = record.toUri();
                    if (uri != null) {
                        JSObject ret = new JSObject();
                        ret.put("type", "uri");
                        ret.put("value", uri.toString());
                        notifyListeners("nfcTagScanned", ret);
                        return; // Found a URI, notify and exit
                    }
                }
            }

            // Fallback if no URI or empty
            JSObject ret = new JSObject();
            ret.put("type", "unknown");
            notifyListeners("nfcTagScanned", ret);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void writeTag(Tag tag) {
        if (activeCall == null)
            return;

        String uriStr = activeCall.getString("uri");
        if (uriStr == null) {
            activeCall.reject("URI is required");
            activeCall = null;
            return;
        }

        try {
            // Check for CLEAR command
            if ("lumostime://clear".equals(uriStr)) {
                // Write empty message
                NdefMessage message = new NdefMessage(new NdefRecord(NdefRecord.TNF_EMPTY, null, null, null));
                writeNdefMessageToTag(tag, message);
                return;
            }

            NdefRecord uriRecord = NdefRecord.createUri(Uri.parse(uriStr));
            // Force AAR to ensuring Xiaomi/other Custom ROMs open THIS app
            NdefRecord aarRecord = NdefRecord.createApplicationRecord("com.mistycrown.lumostime");
            // Important: URI record must be first for some dispatchers, but AAR ensures app
            // selection
            NdefMessage message = new NdefMessage(new NdefRecord[] { uriRecord, aarRecord });

            writeNdefMessageToTag(tag, message);

        } catch (Exception e) {
            activeCall.reject("Write failed: " + e.getMessage());
        }
    }

    private void writeNdefMessageToTag(Tag tag, NdefMessage message) {
        try {
            Ndef ndef = Ndef.get(tag);
            if (ndef != null) {
                ndef.connect();
                if (ndef.getMaxSize() < message.toByteArray().length) {
                    activeCall.reject("Tag capacity is too small");
                } else if (!ndef.isWritable()) {
                    activeCall.reject("Tag is read-only");
                } else {
                    ndef.writeNdefMessage(message);

                    JSObject ret = new JSObject();
                    ret.put("status", "success");
                    activeCall.resolve(ret);

                    // Cleanup
                    isWriting = false;
                    activeCall = null;
                    // disableForegroundDispatch(); // Don't disable global dispatch
                }
                ndef.close();
            } else {
                NdefFormatable formatable = NdefFormatable.get(tag);
                if (formatable != null) {
                    formatable.connect();
                    formatable.format(message);
                    formatable.close();

                    JSObject ret = new JSObject();
                    ret.put("status", "success");
                    activeCall.resolve(ret);

                    isWriting = false;
                    activeCall = null;
                    // disableForegroundDispatch();
                } else {
                    activeCall.reject("Tag is not NDEF formatted or formatable");
                }
            }
        } catch (Exception e) {
            if (activeCall != null) {
                activeCall.reject("Write failed: " + e.getMessage());
            }
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        disableForegroundDispatch();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        // Always enable foreground dispatch to capture tags when app is open
        enableForegroundDispatch();
    }
}
