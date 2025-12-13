package com.mistycrown.lumostime;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LumosNfcPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
