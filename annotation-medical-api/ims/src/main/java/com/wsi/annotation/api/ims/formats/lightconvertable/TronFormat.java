package com.wsi.annotation.api.ims.formats.lightconvertable;

import com.wsi.annotation.api.ims.formats.supported.digitalpathology.IntemedicFormat;

public class TronFormat extends IntemedicFormat {

    public TronFormat() {
        extensions = new String[]{"tron"};
        mimeType = "intemedic/tron";
    }
}
