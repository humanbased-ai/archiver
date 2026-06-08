package com.wsi.annotation.api.ims.formats.lightconvertable;

import com.wsi.annotation.api.ims.formats.supported.digitalpathology.JiangfengFormat;

public class KFBFormat extends JiangfengFormat {

    public KFBFormat() {
        extensions = new String[]{"kfb"};
        mimeType = "jiangfeng/kfb";
    }
}
