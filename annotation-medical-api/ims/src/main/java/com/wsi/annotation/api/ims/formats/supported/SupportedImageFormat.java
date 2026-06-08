package com.wsi.annotation.api.ims.formats.supported;

/*
 * Copyright (c) 2009-2020. Authors: see NOTICE file.
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
import com.wsi.annotation.api.common.constant.Constants;
import com.wsi.annotation.api.common.utils.AbstractTypeConvertingMap;
import com.wsi.annotation.api.ims.formats.Format;
import org.apache.commons.collections4.KeyValue;
import org.apache.commons.collections4.keyvalue.DefaultKeyValue;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public abstract class SupportedImageFormat extends Format {

    public String[] extensions = null;
    public String mimeType = null;
    public String widthProperty = "width";
    public String heightProperty = "height";
    public String resolutionProperty = "resolution";
    public String magnificiationProperty = "magnificiation";
    public List<String> iipURL = ProjectConfig.getIipServers();

    public abstract BufferedImage associated(String label) throws IOException, InterruptedException;

    public abstract BufferedImage thumb(int maxSize) throws IOException;

    public String[] associated() {
        return new String[]{"macro"};
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    public Map<String, Object> properties() throws IOException {
        BufferedImage bufferedImage = ImageIO.read(new File(this.absoluteFilePath));
        Map<String, Object> properties = new HashMap<>();
        properties.put("mimeType", this.mimeType);
        properties.put("cytomine.width", bufferedImage.getWidth());
        properties.put("cytomine.height", bufferedImage.getHeight());
        properties.put("cytomine.resolution", null);
        properties.put("cytomine.magnification", null);
        return properties;
    }

    public String cropURL(Map<String, Object> params) throws UnsupportedEncodingException {
        AbstractTypeConvertingMap map = new AbstractTypeConvertingMap(params);
        String fif = map.get("fif").toString();
        fif = URLEncoder.encode(fif, "UTF-8");
        int topLeftX = map.getInt("topLeftX");
        int topLeftY = map.getInt("topLeftY");
        double width = map.getDouble("width");
        double height = map.getDouble("height");
        double imageWidth = map.getDouble("imageWidth");
        double imageHeight = map.getDouble("imageHeight");

        double x = topLeftX / imageWidth;
        double y = (imageHeight - topLeftY) / imageHeight;
        double w = width / imageWidth;
        double h = height / imageHeight;

        if (x > 1 || y > 1)
            return null;

        int maxWidthOrHeight = ProjectConfig.getMaxCropSize();
        int maxSize = 0;
        if (params.containsKey("maxSize")) {
            maxSize = map.getInt("maxSize", 256);
            if (maxWidthOrHeight > maxSize) {
                maxWidthOrHeight = maxSize;
            }
        }

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
            return ProjectConfig.getIipServer() + "?FIF=" + fif + "&RGN=" + x + "," + y + "," + w + "," + h
                    + "&HEI=" + maxWidthOrHeight + "&WID=" + maxWidthOrHeight + "&CVT=jpeg";
        } else if (maxSize > 0) {
            // TODO here maxSize is the "wanted size". Create a param wantedSize when all iip wiil be unified
            return ProjectConfig.getIipServer() + "?FIF=" + fif + "&RGN=" + x + "," + y + "," + w + "," + h
                    + "&HEI=" + maxSize + "&WID=" + maxSize + "&CVT=jpeg";

        }
        return ProjectConfig.getIipServer() + "?FIF=" + fif + "&RGN=" + x + "," + y + "," + w + "," + h
                + "&HEI=" + height + "&WID=" + width + "&CVT=jpeg";
    }

    public String tileURL(String fif, HashMap<String, Object> params) throws UnsupportedEncodingException {

        return ProjectConfig.getIipServer() + "?zoomify=" + URLEncoder.encode(fif, "UTF-8")
                + "/TileGroup" + params.get("tileGroup") + "/" + params.get("z") + "-" + params.get("x") + "-" + params.get("y") + ".jpg";
    }

    // TODO do it with OpenSlide or IIP ?
    protected BufferedImage rotate90ToRight(BufferedImage inputImage) {
        int width = inputImage.getWidth();
        int height = inputImage.getHeight();
        BufferedImage returnImage = new BufferedImage(height, width, inputImage.getType());

        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                returnImage.setRGB(height - y - 1, x, inputImage.getRGB(x, y));
            }
        }
        return returnImage;
    }
}
