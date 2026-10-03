/**
 * @file FeishuSecureStore.java
 * @input Private execution snapshots and the Android Keystore.
 * @output Atomic AES-GCM ciphertext in the application's no-backup directory.
 * @pos Android Feishu persistence; missing keys or damaged ciphertext never trigger plaintext fallback.
 */
package com.mistycrown.lumostime;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class FeishuSecureStore {
    private static final int MAX_BYTES = 64 * 1024 * 1024;
    private static final byte[] AAD = "lumostime.feishu.snapshot.v1".getBytes(StandardCharsets.UTF_8);
    private final AtomicFile file;
    private final String keyAlias;

    FeishuSecureStore(File directory, String keyAlias) {
        this.file = new AtomicFile(new File(directory, "connection.enc"));
        this.keyAlias = keyAlias;
    }

    private boolean hasCiphertext() {
        return file.getBaseFile().exists() || new File(file.getBaseFile().getPath() + ".bak").exists();
    }

    private SecretKey key(boolean mayCreate) throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(keyAlias)) return (SecretKey) store.getKey(keyAlias, null);
        if (!mayCreate) throw new IllegalStateException("Feishu encryption key unavailable");
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(keyAlias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    synchronized String read() throws Exception {
        if (file.getBaseFile().length() > MAX_BYTES || new File(file.getBaseFile().getPath() + ".bak").length() > MAX_BYTES) {
            throw new IllegalStateException("Feishu snapshot too large");
        }
        byte[] encrypted;
        try { encrypted = file.readFully(); }
        catch (FileNotFoundException exception) {
            if (hasCiphertext()) throw exception;
            return null;
        }
        if (encrypted.length < 29 || encrypted.length > MAX_BYTES || encrypted[0] != 1) {
            throw new IllegalStateException("Invalid Feishu ciphertext");
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(false), new GCMParameterSpec(128, Arrays.copyOfRange(encrypted, 1, 13)));
        cipher.updateAAD(AAD);
        byte[] plaintext = cipher.doFinal(encrypted, 13, encrypted.length - 13);
        try { return new String(plaintext, StandardCharsets.UTF_8); }
        finally { Arrays.fill(plaintext, (byte) 0); }
    }

    synchronized void write(String snapshot) throws Exception {
        byte[] plaintext = snapshot.getBytes(StandardCharsets.UTF_8);
        try {
            if (plaintext.length > MAX_BYTES - 29) throw new IllegalStateException("Feishu snapshot too large");
            // Validate an existing file before any overwrite; a missing key or corruption must be recoverable.
            if (hasCiphertext()) read();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(!hasCiphertext()));
            cipher.updateAAD(AAD);
            byte[] ciphertext = cipher.doFinal(plaintext);
            byte[] iv = cipher.getIV();
            if (iv.length != 12) throw new IllegalStateException("Invalid Feishu encryption IV");
            File directory = file.getBaseFile().getParentFile();
            if (!directory.isDirectory() && !directory.mkdirs()) throw new IllegalStateException("Feishu storage unavailable");
            FileOutputStream output = null;
            try {
                output = file.startWrite();
                output.write(1);
                output.write(iv);
                output.write(ciphertext);
                file.finishWrite(output);
                // AtomicFile can log a failed rename without throwing; confirm the committed version.
                if (!snapshot.equals(read())) throw new IllegalStateException("Feishu snapshot commit failed");
            } catch (Exception exception) {
                if (output != null) file.failWrite(output);
                throw exception;
            }
        } finally { Arrays.fill(plaintext, (byte) 0); }
    }
}
