/**
 * @file FeishuNativePlugin.java
 * @input Trusted local app snapshots and official Feishu authorization URLs.
 * @output Keystore-backed encrypted persistence and authorization in the system browser.
 * @pos Capacitor Android Feishu bridge; file paths and keys are never supplied by JavaScript.
 */
package com.mistycrown.lumostime;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "FeishuNative")
public class FeishuNativePlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private FeishuSecureStore store;

    @Override
    public void load() {
        store = new FeishuSecureStore(new File(getContext().getNoBackupFilesDir(), "feishu"), "lumostime.feishu.snapshot.v1");
    }

    private void trusted(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            if (!FeishuAuthorizationPolicy.sameOrigin(bridge.getWebView().getUrl(), bridge.getLocalUrl())) {
                call.reject("飞书本机连接只允许从 LumosTime 内操作。");
                return;
            }
            action.run();
        });
    }

    @PluginMethod
    public void read(PluginCall call) {
        trusted(call, () -> worker.execute(() -> {
            try {
                String snapshot = store.read();
                JSObject result = new JSObject();
                result.put("snapshot", snapshot == null ? JSONObject.NULL : snapshot);
                call.resolve(result);
            } catch (Exception exception) { call.reject("无法读取飞书本机安全存储，请检查手机状态后重试。"); }
        }));
    }

    @PluginMethod
    public void write(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) { call.reject("飞书连接数据无效。"); return; }
        trusted(call, () -> worker.execute(() -> {
            try { store.write(snapshot); call.resolve(); }
            catch (Exception exception) { call.reject("无法保存飞书本机连接，请检查手机安全存储后重试。"); }
        }));
    }

    @PluginMethod
    public void openAuthorization(PluginCall call) {
        String url = call.getString("url");
        if (!FeishuAuthorizationPolicy.allows(url)) { call.reject("飞书确认页面无效。"); return; }
        trusted(call, () -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception exception) { call.reject("无法打开飞书确认页，请检查手机是否安装浏览器。"); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdown();
    }
}
