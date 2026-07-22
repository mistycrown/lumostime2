package com.mistycrown.lumostime;

import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

/** Lightweight input surface launched from the quick-todo widget. */
public class QuickTodoAddActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_quick_todo_add);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getWindow().setBackgroundBlurRadius(dp(28));
        }

        EditText input = findViewById(R.id.quick_todo_input);
        TextView cancel = findViewById(R.id.quick_todo_cancel);
        TextView add = findViewById(R.id.quick_todo_add);

        cancel.setOnClickListener(view -> finish());
        add.setOnClickListener(view -> submit(input));
        input.setOnEditorActionListener((view, actionId, event) -> {
            submit(input);
            return true;
        });

        input.requestFocus();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
        input.postDelayed(() -> ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE))
                .showSoftInput(input, InputMethodManager.SHOW_IMPLICIT), 180);
    }

    private void submit(EditText input) {
        String title = input.getText().toString().trim();
        if (title.isEmpty()) {
            input.setError("写下一件小事");
            return;
        }
        WidgetQuickTodoProviderSupport.addQuickTodo(this, title);
        finish();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
