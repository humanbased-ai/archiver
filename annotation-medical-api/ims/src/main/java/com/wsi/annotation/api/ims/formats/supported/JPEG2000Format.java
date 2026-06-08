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
import com.wsi.annotation.api.common.exception.FormatException;
import com.wsi.annotation.api.common.utils.file.FileUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by stevben on 22/04/14.
 */
public class JPEG2000Format extends SupportedImageFormat {

    public JPEG2000Format() {
        extensions = new String[]{"jp2"};
        mimeType = "image/jp2";
    }
    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() {
        //I check the extension for the moment because did not find an another way
        boolean detect = FileUtils.getExtensionFromFilename(absoluteFilePath).toLowerCase() == "jp2";
        if (detect && !ProjectConfig.isJpeg2000Enabled()) throw new FormatException("JPEG2000 disabled");

        return detect;
    }

    @Override
    public BufferedImage associated(String label) throws IOException {
        return thumb(256);
    }

    @Override
    public BufferedImage thumb(int maxSize) throws IOException {
        //construct IIP2K URL
        //maxSize currently ignored because we need to know width of the image with IIP
        String thumbURL = ProjectConfig.getIipServer() + "?fif=$absoluteFilePath&SDS=0,90&CNT=1.0&HEI=" + maxSize + "&WID=" + maxSize + "&CVT=jpeg&QLT=99";
        return ImageIO.read(new URL(thumbURL));
    }

    @Override
    public Map<String, Object> properties() throws IOException {
        Map<String, Object> properties = new HashMap<>();
        String propertiesURL = ProjectConfig.getIipServer() + "?fif=" + absoluteFilePath + "&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number";
        URL url = new URL(propertiesURL);
        URLConnection urlConnection = url.openConnection();
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()));
        String readLine = "";
        Integer width = null;
        Integer height = null;
        while ((readLine = bufferedReader.readLine()) != null) {
            String[] args = readLine.split(":");
            if (args.length != 2) break;
            if (args[0].equals("Max-size")) {
                String[] sizes = args[1].split(" ");
                width = Integer.parseInt(sizes[0]);
                height = Integer.parseInt(sizes[1]);
            }
        }

        properties.put("cytomine.width", width);


        properties.put("cytomine.height", height);


        properties.put("cytomine.resolution", null);

        properties.put("cytomine.magnification", null);


        return properties;
    }


}
