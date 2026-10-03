/**
 * @file FeishuAuthorizationPolicyTest.java
 * @input Official, foreign and credential-bearing URLs.
 * @output Regression checks for native browser allowlisting and app-origin isolation.
 * @pos Android JVM unit tests; no platform objects are required.
 */
package com.mistycrown.lumostime;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class FeishuAuthorizationPolicyTest {
    @Test
    public void permitsOnlyOfficialHttpsConsentPages() {
        assertTrue(FeishuAuthorizationPolicy.allows("https://open.feishu.cn/page/launcher?user_code=CODE"));
        assertTrue(FeishuAuthorizationPolicy.allows("https://open.feishu.cn/page/cli?user_code=CODE"));
        assertTrue(FeishuAuthorizationPolicy.allows("https://accounts.feishu.cn/oauth/v1/device?user_code=CODE"));
        for (String url : new String[] { null, "bad", "http://open.feishu.cn/page/cli", "https://open.feishu.cn:444/page/cli",
            "https://open.feishu.cn.evil.example/page/cli", "https://user:secret@open.feishu.cn/page/cli",
            "https://open.feishu.cn/open-apis/calendar", "https://evil.example/oauth/v1/device" }) {
            assertFalse(FeishuAuthorizationPolicy.allows(url));
        }
    }

    @Test
    public void restrictsSecureStorageToTheLocalAppOrigin() {
        assertTrue(FeishuAuthorizationPolicy.sameOrigin("https://localhost/index.html", "https://localhost"));
        assertFalse(FeishuAuthorizationPolicy.sameOrigin("https://open.feishu.cn/page/cli", "https://localhost"));
        assertFalse(FeishuAuthorizationPolicy.sameOrigin("https://localhost.evil.example", "https://localhost"));
        assertFalse(FeishuAuthorizationPolicy.sameOrigin("http://localhost", "https://localhost"));
        assertFalse(FeishuAuthorizationPolicy.sameOrigin("https://secret@localhost", "https://localhost"));
    }
}
