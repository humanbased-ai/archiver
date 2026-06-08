package com.wsi.annotation.api.ims.formats.supported.digitalpathology;

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


import com.wsi.annotation.api.ims.formats.supported.SupportedImageFormat;
import com.wsi.annotation.api.ims.oss.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.openslide.AssociatedImage;
import org.openslide.OpenSlide;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;


@Slf4j
public abstract class OpenSlideFormat extends SupportedImageFormat {

    protected String vendor = null;

    protected String widthProperty = "openslide.level[0].width";
    protected String heightProperty = "openslide.level[0].height";


    @Override
    public boolean detect() throws IOException, InterruptedException {
        File slideFile = new File(absoluteFilePath);
        log.info("OpenSlidePath:" + absoluteFilePath);
        log.info("vendor:" + vendor);
        if (slideFile.canRead()) {
            return vendor.equals(OpenSlide.detectVendor(slideFile));
        } else {
            return false;
        }
    }

    @Override
    public BufferedImage associated(String label) throws IOException, InterruptedException { //should be abstract
        File slideFile = new File(absoluteFilePath);
        log.info("absoluteFilePath:" + absoluteFilePath);
        AtomicReference<BufferedImage> associatedBufferedImage = new AtomicReference<>();
        if (slideFile.canRead()) {
            OpenSlide openSlide = new OpenSlide(slideFile);
            openSlide.getAssociatedImages().entrySet().forEach(it -> {
                log.info("opensile_label:" + it.getKey());

                //if (it.getKey().equals(label)) {
                log.info("opensile_label:" + it.getKey());
                AssociatedImage associatedImage = it.getValue();
                try {
                    log.info("opensile_label_value:" + it.getValue().toBufferedImage().toString());
                    associatedBufferedImage.set(associatedImage.toBufferedImage());
                    log.info("associatedimage" + associatedImage.toString());
                } catch (Exception e) {
                    log.info("AssociatedImage", e);
                }
                //}
            });
            openSlide.close();
        }
        return associatedBufferedImage.get();
    }

    @Override
    public Map<String, Object> properties() throws IOException {
        File slideFile = new File(absoluteFilePath);
        Map<String, Object> properties = new HashMap<>();
        properties.put("mimeType", mimeType);
//        try {
        if (slideFile.canRead()) {
            OpenSlide openSlide = new OpenSlide(slideFile);
            openSlide.getProperties().entrySet().forEach(it -> {
                properties.put(it.getKey(), it.getValue());
            });
            openSlide.close();
        }
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
        if (StringUtils.isNotEmpty(widthProperty) && properties.containsKey(widthProperty) && properties.get(widthProperty) != null)
            properties.put("cytomine.width", properties.get(widthProperty));

        if (StringUtils.isNotEmpty(heightProperty) && properties.containsKey(heightProperty) && properties.get(heightProperty) != null)
            properties.put("cytomine.height", properties.get(heightProperty));

        if (StringUtils.isNotEmpty(resolutionProperty) && properties.containsKey(resolutionProperty) && properties.get(resolutionProperty) != null)
            properties.put("cytomine.resolution", properties.get(resolutionProperty));

        if (StringUtils.isNotEmpty(magnificiationProperty) && properties.containsKey(magnificiationProperty) && properties.get(magnificiationProperty) != null)
            properties.put("cytomine.magnification", properties.get(magnificiationProperty));


        return properties;
    }

    @Override
    public BufferedImage thumb(int maxSize) throws IOException {
        log.info("absoluteFilePath:" + absoluteFilePath);
        OpenSlide openSlide = new OpenSlide(new File(absoluteFilePath));
        BufferedImage thumbnail = openSlide.createThumbnailImage(0, 0, openSlide.getLevel0Width(), openSlide.getLevel0Height(), maxSize, BufferedImage.TYPE_INT_BGR);
        openSlide.close();
        return thumbnail;

    }


}
