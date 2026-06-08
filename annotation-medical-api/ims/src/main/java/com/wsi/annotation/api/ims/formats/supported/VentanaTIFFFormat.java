package com.wsi.annotation.api.ims.formats.supported;

import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.OpenSlideSingleFileFormat;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;


/*
 * Copyright (c) 2009-2018. Authors: see NOTICE file.
 *
 * Licensed under the GNU Lesser General Public License, Version 2.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.gnu.org/licenses/lgpl-2.1.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Created by stevben on 28/04/14.
 */
public class VentanaTIFFFormat extends OpenSlideSingleFileFormat {

    public VentanaTIFFFormat() {
        extensions = new String[]{"tif", "vtif"};
        vendor = "ventana";
        mimeType = "openslide/ventana";
        widthProperty = "openslide.level[0].width";
        heightProperty = "openslide.level[0].height";
        resolutionProperty = "openslide.mpp-x";
        magnificiationProperty = "openslide.objective-power";
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public BufferedImage associated(String label) throws IOException, InterruptedException {
        BufferedImage bufferedImage = super.associated(label);
        if (label.equals("macro")) {
            return rotate90ToRight(bufferedImage);
        } else {
            return bufferedImage;
        }
    }

    @Override
    public boolean detect() throws IOException, InterruptedException {
        if (super.detect()) {
            String filename = "";
            if (absoluteFilePath.lastIndexOf('.') > -1)
                filename = absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('.')) + ".vtif";
            else
                filename = absoluteFilePath + ".vtif";

            filename = filename.replace(";", "\\;");
            filename = filename.replace("&", "\\&");
            String originalFilePath = absoluteFilePath.replace(";", "\\;").replace("&", "\\&");
            File renamed = new File(filename);
            if (!renamed.exists())
                ProcUtils.executeOnShell("ln -s ${originalFilePath} ${renamed.absolutePath}");
            return renamed.exists();
        }
        return false;
    }

    @Override
    public String cropURL(Map<String, Object> params) throws UnsupportedEncodingException {
        String fif = params.get("fif").toString();
        if (fif.lastIndexOf('.') > -1)
            fif = fif.substring(0, fif.lastIndexOf('.')) + ".vtif";
        else
            fif = fif + ".vtif";

        params.put("fif", fif);
        return super.cropURL(params);
    }

    @Override
    public String tileURL(String fif, HashMap<String, Object> params) throws UnsupportedEncodingException {

        if (fif.lastIndexOf('.') > -1)
            fif = fif.substring(0, fif.lastIndexOf('.')) + ".vtif";
        else
            fif = fif + ".vtif";

        return super.tileURL(fif, params);
    }
}
