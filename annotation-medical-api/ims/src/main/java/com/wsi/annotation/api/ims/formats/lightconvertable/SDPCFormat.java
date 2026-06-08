package com.wsi.annotation.api.ims.formats.lightconvertable;

import com.wsi.annotation.api.ims.formats.ICommonFormat;
import com.wsi.annotation.api.ims.formats.supported.SupportedImageFormat;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.ShengQiangFormat;

import java.awt.image.BufferedImage;
import java.io.IOException;

public class SDPCFormat extends ShengQiangFormat {

    public SDPCFormat() {
        extensions = new String[]{"sdpc"};
        mimeType = "shengqiang/sdpc";
    }

}
