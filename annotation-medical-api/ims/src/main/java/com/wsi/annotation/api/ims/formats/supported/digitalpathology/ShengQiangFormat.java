package com.wsi.annotation.api.ims.formats.supported.digitalpathology;

import com.wsi.annotation.api.ims.formats.supported.SupportedImageFormat;

import java.awt.image.BufferedImage;
import java.io.IOException;

public class ShengQiangFormat extends SupportedImageFormat {
    @Override
    public boolean detect() throws IOException, InterruptedException {
        return false;
    }

    @Override
    public BufferedImage associated(String label) throws IOException, InterruptedException {
        return null;
    }

    @Override
    public BufferedImage thumb(int maxSize) throws IOException {
        return null;
    }
}
