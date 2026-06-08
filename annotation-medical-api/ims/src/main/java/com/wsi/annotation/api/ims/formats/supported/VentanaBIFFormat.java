package com.wsi.annotation.api.ims.formats.supported;

import com.wsi.annotation.api.common.utils.file.FileUtils;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.OpenSlideSingleFileFormat;

import java.io.IOException;
import java.util.Arrays;


/**
 * Created by stevben on 19/06/14.
 */
public class VentanaBIFFormat extends OpenSlideSingleFileFormat {

    public VentanaBIFFormat() {
        extensions = new String[]{"bif"};
        vendor = "ventana";
        mimeType = "openslide/bif";
        widthProperty = "openslide.level[0].width";
        heightProperty = "openslide.level[0].height";
        resolutionProperty = "ventana.ScanRes";
        magnificiationProperty = "ventana.Magnification";
    }


    @Override
    public boolean detect() throws IOException, InterruptedException {
        String extension = FileUtils.getExtensionFromFilename(absoluteFilePath);
        return super.detect() && Arrays.asList(extensions).contains(extension);
    }
    @Override
    public String getMimeType() {
        return this.mimeType;
    }
}
