/**
 * @file FeishuSecureStoreTest.java
 * @input Device Keystore and isolated encrypted snapshots under noBackupFilesDir.
 * @output On-device encryption, restart recovery and corruption/key-loss refusal checks.
 * @pos Android instrumentation tests; the production Feishu file/key are never used.
 */
package com.mistycrown.lumostime;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.fail;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import java.util.UUID;

@RunWith(AndroidJUnit4.class)
public class FeishuSecureStoreTest {
    private File directory;
    private String alias;

    @Before
    public void setUp() {
        Context context = ApplicationProvider.getApplicationContext();
        String id = UUID.randomUUID().toString();
        directory = new File(context.getNoBackupFilesDir(), "feishu-test-" + id);
        alias = "lumostime.feishu.test." + id;
    }

    @After
    public void tearDown() throws Exception {
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore");
        keys.load(null);
        if (keys.containsAlias(alias)) keys.deleteEntry(alias);
        File[] files = directory.listFiles();
        if (files != null) for (File file : files) file.delete();
        directory.delete();
    }

    @Test
    public void encryptsAndRestoresUtf8SnapshotsAfterRestart() throws Exception {
        String snapshot = "{\"secret\":\"private-token\",\"name\":\"飞书用户\"}";
        FeishuSecureStore store = new FeishuSecureStore(directory, alias);
        assertEquals(null, store.read());
        store.write(snapshot);
        byte[] encrypted = Files.readAllBytes(new File(directory, "connection.enc").toPath());
        assertFalse(new String(encrypted, StandardCharsets.UTF_8).contains("private-token"));
        assertEquals(snapshot, new FeishuSecureStore(directory, alias).read());
        store.write(snapshot + " ");
        assertEquals(snapshot + " ", new FeishuSecureStore(directory, alias).read());
    }

    @Test
    public void neverOverwritesDamagedCiphertextOrCreatesAReplacementKey() throws Exception {
        FeishuSecureStore store = new FeishuSecureStore(directory, alias);
        store.write("private-token");
        File file = new File(directory, "connection.enc");
        byte[] original = Files.readAllBytes(file.toPath());
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore");
        keys.load(null);
        keys.deleteEntry(alias);
        try { store.write("replacement"); fail("Missing key must reject overwrite"); }
        catch (Exception expected) { }
        assertFalse(keys.containsAlias(alias));
        org.junit.Assert.assertArrayEquals(original, Files.readAllBytes(file.toPath()));
        try (FileOutputStream output = new FileOutputStream(file)) { output.write(new byte[] { 1, 2, 3 }); }
        try { store.write("replacement"); fail("Corrupt ciphertext must reject overwrite"); }
        catch (Exception expected) { }
        org.junit.Assert.assertArrayEquals(new byte[] { 1, 2, 3 }, Files.readAllBytes(file.toPath()));
    }
}
