/**
 * @file FeishuAuthorizationPolicy.java
 * @input An authorization URL from the trusted app.
 * @output Whether it is an official Feishu HTTPS confirmation page.
 * @pos Android external-browser URL policy.
 */
package com.mistycrown.lumostime;

import java.net.URI;

final class FeishuAuthorizationPolicy {
    static boolean allows(String value) {
        try {
            URI url = new URI(value);
            if (!"https".equals(url.getScheme()) || url.getUserInfo() != null || url.getPort() != -1 && url.getPort() != 443) return false;
            String path = url.getPath();
            return "open.feishu.cn".equals(url.getHost()) && ("/page/launcher".equals(path) || "/page/cli".equals(path))
                || "accounts.feishu.cn".equals(url.getHost()) && ("/open-apis/authen/v1/authorize".equals(path) || path.startsWith("/oauth/"));
        } catch (Exception exception) { return false; }
    }

    static boolean sameOrigin(String current, String trusted) {
        try {
            URI source = new URI(current);
            URI origin = new URI(trusted);
            return source.getUserInfo() == null && origin.getScheme().equals(source.getScheme())
                && origin.getHost().equals(source.getHost()) && origin.getPort() == source.getPort();
        } catch (Exception exception) { return false; }
    }
}
