package com.mistycrown.lumostime;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.LinearLayout;

import androidx.appcompat.app.AlertDialog;

/** Lightweight input surface launched from the quick-todo widget. */
public class QuickTodoAddActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("Add a quick todo");

        int horizontalPadding = (int) (20 * getResources().getDisplayMetrics().density);
        LinearLayout container = new LinearLayout(this);
        container.setPadding(horizontalPadding, 0, horizontalPadding, 0);
        container.addView(input, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Quick Todo")
                .setView(container)
                .setNegativeButton(android.R.string.cancel, (ignored, which) -> finish())
                .setPositiveButton(android.R.string.ok, (ignored, which) -> {
                    WidgetQuickTodoProviderSupport.addQuickTodo(this, input.getText().toString());
                    finish();
                })
                .create();
        dialog.setOnDismissListener(ignored -> finish());
        dialog.setOnShowListener(ignored -> {
            input.requestFocus();
            dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
            ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                    .showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
        });
        dialog.show();
    }
}
