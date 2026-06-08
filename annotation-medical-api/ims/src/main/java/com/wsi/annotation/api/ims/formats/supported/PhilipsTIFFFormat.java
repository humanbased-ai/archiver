package com.wsi.annotation.api.ims.formats.supported;

import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.AbstractTypeConvertingMap;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.OpenSlideSingleFileFormat;
import lombok.extern.slf4j.Slf4j;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
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
 * Created by stevben on 12/07/14.
 */
@Slf4j
public class PhilipsTIFFFormat extends OpenSlideSingleFileFormat {

    public PhilipsTIFFFormat() {
        this.extensions = new String[]{"tiff"};
        this.vendor = "philips";
        this.mimeType = "philips/tif";
        this.widthProperty = "openslide.level[0].width";
        this.heightProperty = "openslide.level[0].height";
        this.resolutionProperty = "openslide.mpp-x";
        this.magnificiationProperty = null;
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public BufferedImage associated(String label) throws IOException, InterruptedException {
        String tiffinfoExecutable = ProjectConfig.getTiffinfo();
        log.info("命令:" + tiffinfoExecutable + " " + this.absoluteFilePath);
        Process process = Runtime.getRuntime().exec(tiffinfoExecutable + " " + this.absoluteFilePath);
        String tiffinfo = ProcUtils.getText(new BufferedReader(new InputStreamReader(process.getInputStream())));
        log.info("tiffinfo:" + tiffinfo);
        ProcUtils.closeStreams(process);
        int numberOfTIFFDirectories = StringUtils.countMatches(tiffinfo, "TIFF Directory");
        if (label.equals("label")) {
            //last directory
            return getTIFFSubImage(numberOfTIFFDirectories - 1);
        } else if (label.equals("macro")) {
            //next to last directory
            return getTIFFSubImage(numberOfTIFFDirectories - 2);
        } else {
            return thumb(512);
        }
    }

    private BufferedImage getTIFFSubImage(int index) throws IOException, InterruptedException {
        boolean convertSuccessfull = true;

        String source = absoluteFilePath;
        File target = File.createTempFile("label", ".jpg");
        String targetPath = target.getAbsolutePath();

        String vipsExecutable = ProjectConfig.getVips();
        String command = vipsExecutable + " im_copy " + source + ":" + index + " " + targetPath;
        log.info("vips:" + command);
        convertSuccessfull &= ProcUtils.executeOnShell(command) == 0;
        log.info("vipsStatus:" + convertSuccessfull);
        BufferedImage labelImage = null;
        if (convertSuccessfull) {
            labelImage = ImageIO.read(target);
        }
        target.delete();
        return labelImage;
    }

    @Override
    public boolean detect() throws IOException, InterruptedException {
        if (super.detect()) {
            String filename = "";
            if (absoluteFilePath.lastIndexOf('.') > -1)
                filename = absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('.')) + ".ptiff";
            else
                filename = absoluteFilePath + ".ptiff";

            filename = filename.replace(";", "\\;");
            filename = filename.replace("&", "\\&");
            String originalFilePath = absoluteFilePath.replace(";", "\\;").replace("&", "\\&");
            File renamed = new File(filename);
            if (!renamed.exists())
                ProcUtils.executeOnShell("ln -s " + originalFilePath + " " + renamed.getAbsolutePath());
            return true;
        }
        return false;
    }

    @Override
    public String cropURL(Map<String, Object> params) throws UnsupportedEncodingException {
        AbstractTypeConvertingMap map = new AbstractTypeConvertingMap(params);
        String fif = map.get("fif").toString();
        if (fif.lastIndexOf('.') > -1)
            fif = fif.substring(0, fif.lastIndexOf('.')) + ".ptiff";
        else
            fif = fif + ".ptiff";

        params.put("fif", fif);
        return super.cropURL(params);
    }

    @Override
    public String tileURL(String fif, HashMap<String, Object> params) throws UnsupportedEncodingException {

        if (fif.lastIndexOf('.') > -1)
            fif = fif.substring(0, fif.lastIndexOf('.')) + ".ptiff";
        else
            fif = fif + ".ptiff";

        return super.tileURL(fif, params);
    }
}
