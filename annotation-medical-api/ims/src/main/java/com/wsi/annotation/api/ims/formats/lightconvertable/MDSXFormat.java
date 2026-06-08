package com.wsi.annotation.api.ims.formats.lightconvertable;

import com.wsi.annotation.api.ims.formats.supported.digitalpathology.MoticFormat;

public class MDSXFormat extends MoticFormat {

    public MDSXFormat(){
        extensions = new String[]{"mdsx"};
        mimeType = "motic/mdsx";
    }
}
