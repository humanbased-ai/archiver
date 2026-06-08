package com.wsi.annotation.api.ims.formats.supported;



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


import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.common.utils.file.FileUtils;
import com.wsi.annotation.api.ims.formats.ITIFFFormat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;

/**
 * Created by stevben on 28/04/14.
 */
@Slf4j
public class PyramidalTIFFFormat extends SupportedImageFormat implements ITIFFFormat {

    public PyramidalTIFFFormat() {
        extensions = new String[]{"tif", "tiff"};
        mimeType = "image/pyrtiff";
    }

    private final String[] excludeDescription = new String[]{
            "Not a TIFF",
            "<iScan",
            //"Hamamatsu",
            "Aperio",
            "Leica",
            "PHILIPS",
            "OME-XML",
            "Software: Adobe Photoshop"
    };

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() throws IOException {
        //we have a TIFF, but what kind ? flat, pyramid, multi-page, ventana ?
        return this.detect(getTiffinfo());
    }

    private String getTiffinfo() throws IOException {
        String tiffinfoExecutable = ProjectConfig.getTiffinfo();
        Process process = Runtime.getRuntime().exec(tiffinfoExecutable + " " + this.absoluteFilePath);
        String tiffinfo = ProcUtils.getText(new BufferedReader(new InputStreamReader(process.getInputStream())));
        log.info("tiffinfo:" + tiffinfo);
        ProcUtils.closeStreams(process);
        return tiffinfo;
    }

    @Override
    public Map<String, Object> properties() throws IOException {
        String tiffinfo = getTiffinfo();
        Map<String, Object> properties = new HashMap<>();
        properties.put("mimeType", mimeType);
        Map<String, Object> wh = getMaxWidthAndHeight(tiffinfo);

//        Double resolution;
//        String unit;
//        def resolutions = infos.findAll {
//            it.contains 'Resolution:'
//        }.unique();
//        if (resolutions.size() == 1) {
//            def tokens = resolutions[0].tokenize(" ,/")
//
//            tokens.each {
//                println it
//            }
//
//            resolution = Double.parseDouble(tokens.get(1))
//            if (tokens.size() >= 5 && !tokens.get(3).contains("unitless")) {
//                unit = tokens.get(4)
//            }
//        }

        properties.put("cytomine.width", wh.get("maxWidth"));
        properties.put("cytomine.height", wh.get("maxHeight"));
        /*unitConverter(resolution, unit)*/
        properties.put("cytomine.resolution", null);
        properties.put("cytomine.magnification", null);
        return properties;

    }
    @Override
    public BufferedImage associated(String label) throws IOException { //should be abstract
        if (label.equals("macro")) {
            return thumb(256);
        }
        return null;
    }

    @Override
    public BufferedImage thumb(int maxSize) throws IOException {
        String thumbURL = ProjectConfig.getIipServer() + "?fif=" + absoluteFilePath + "&SDS=0,90&CNT=1.0&HEI=" + maxSize + "&WID=" + maxSize + "&CVT=jpeg&QLT=99";

        return ImageIO.read(new URL(thumbURL));

    }

    //convert from pixel/unit to µm/pixel
    private Double unitConverter(Double res, String unit) {
        if (res == null) return null;
        Double resOutput = res;
        if (unit == "inch") {
            resOutput /= 2.54;
            unit = "cm";
        }
        if (unit == "cm") {
            resOutput = 1 / resOutput;
            resOutput *= 10000;
        } else {
            return null;
        }
        return resOutput;
    }


    @Override
    public boolean detect(String tiffinfo) {
        boolean notTiff = false;
        for (String s : excludeDescription) {
            notTiff |= tiffinfo.contains(s);
        }

        if (tiffinfo.contains("Hamamatsu") && !FileUtils.getExtensionFromFilename(absoluteFilePath).toLowerCase().equals("tif")) {
            return false; //otherwise its a tiff file converted from ndpi
        }
        if (notTiff) return false;

        int nbTiffDirectory = StringUtils.countOccurrencesOf(tiffinfo, "TIFF Directory");

        //pyramid or multi-page, sufficient ?
        if (nbTiffDirectory > 1) return true;
        else if (nbTiffDirectory == 1) { //check if very small tiff
            //get width & height from tiffinfo...
            Map<String, Object> wh = getMaxWidthAndHeight(tiffinfo);
            int maxWidth = Integer.parseInt(wh.get("maxWidth").toString());
            int maxHeight = Integer.parseInt(wh.get("maxHeight").toString());
            return (maxWidth <= 256 && maxHeight <= 256);
        }
        return false;
    }

    public Map<String, Object> getMaxWidthAndHeight(String tiffinfo) {
        int maxWidth = 0;
        int maxHeight = 0;
        Map<String, Object> wh = new HashMap<>();
        StringTokenizer st = new StringTokenizer(tiffinfo, "\n");
        while (st.hasMoreTokens()) {
            String token = st.nextToken();
            if (token.contains("Image Width:")) {
                String[] tokens = token.split(" ");
                int width = Integer.parseInt(tokens[2]);
                int height = Integer.parseInt(tokens[5]);
                maxWidth = Math.max(maxWidth, width);
                maxHeight = Math.max(maxHeight, height);
            }
        }
        wh.put("maxWidth", maxWidth);
        wh.put("maxHeight", maxHeight);
        return wh;
    }
}
