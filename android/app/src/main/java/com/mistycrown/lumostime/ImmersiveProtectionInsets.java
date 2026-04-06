/**
 * @file ImmersiveProtectionInsets.java
 * @input System bar insets and display cutout insets
 * @output A merged inset model for immersive protection overlays
 * @pos Android Helper
 * @description Computes the black protection area that must be painted by the app when Android draws system bars and cutout regions transparently.
 */
package com.mistycrown.lumostime;

import androidx.core.graphics.Insets;

final class ImmersiveProtectionInsets {
    final int left;
    final int top;
    final int right;
    final int bottom;

    private ImmersiveProtectionInsets(int left, int top, int right, int bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    static ImmersiveProtectionInsets resolve(
        Insets systemBarInsets,
        Insets displayCutoutInsets,
        boolean isLandscape
    ) {
        if (isLandscape) {
            return new ImmersiveProtectionInsets(
                Math.max(systemBarInsets.left, displayCutoutInsets.left),
                0,
                Math.max(systemBarInsets.right, displayCutoutInsets.right),
                0
            );
        }

        return new ImmersiveProtectionInsets(
            Math.max(systemBarInsets.left, displayCutoutInsets.left),
            Math.max(systemBarInsets.top, displayCutoutInsets.top),
            Math.max(systemBarInsets.right, displayCutoutInsets.right),
            Math.max(systemBarInsets.bottom, displayCutoutInsets.bottom)
        );
    }
}
