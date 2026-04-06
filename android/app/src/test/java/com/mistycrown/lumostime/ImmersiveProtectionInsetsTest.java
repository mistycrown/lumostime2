package com.mistycrown.lumostime;

import static org.junit.Assert.assertEquals;

import androidx.core.graphics.Insets;

import org.junit.Test;

public class ImmersiveProtectionInsetsTest {

    @Test
    public void resolve_keepsTopProtectionInPortrait() {
        ImmersiveProtectionInsets protectionInsets = ImmersiveProtectionInsets.resolve(
            Insets.of(0, 32, 0, 16),
            Insets.of(0, 40, 0, 0),
            false
        );

        assertEquals(0, protectionInsets.left);
        assertEquals(40, protectionInsets.top);
        assertEquals(0, protectionInsets.right);
        assertEquals(16, protectionInsets.bottom);
    }

    @Test
    public void resolve_removesTopAndBottomProtectionInLandscape() {
        ImmersiveProtectionInsets protectionInsets = ImmersiveProtectionInsets.resolve(
            Insets.of(12, 32, 0, 16),
            Insets.of(24, 40, 18, 0),
            true
        );

        assertEquals(24, protectionInsets.left);
        assertEquals(0, protectionInsets.top);
        assertEquals(18, protectionInsets.right);
        assertEquals(0, protectionInsets.bottom);
    }
}
