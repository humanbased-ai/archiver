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

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

/**
 * Created by stevben on 22/04/14.
 */
public class HamamatsuVMSFormat extends OpenSlideMultipleFileFormat {

    public HamamatsuVMSFormat() {
        extensions = new String[]{"vms"};
        vendor = "hamamatsu";
        mimeType = "openslide/vms";
        widthProperty = "openslide.level[0].width";
        heightProperty = "openslide.level[0].height";
        resolutionProperty = null; //to compute
        magnificiationProperty = "hamamatsu.SourceLens";
    }


    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() throws IOException, InterruptedException {
        File uploadedFile = new File(absoluteFilePath);
        if (uploadedFile.isFile()) {
            if (uploadedFile.getName().endsWith(".vms")) {
                uploadedFile = uploadedFile.getParentFile();
            } else {
                return false;
            }
        }
        File vms = getRootFile(uploadedFile);

        if (vms != null) {
            absoluteFilePath = vms.getAbsolutePath();
            return super.detect();
        }
        return false;
    }

    @Override
    public Map<String, Object> properties() throws IOException {
        Map<String, Object> properties = super.properties();

        float physicalWidthProperty = Float.parseFloat(properties.get("hamamatsu.PhysicalWidth").toString());
        float widthProperty = Float.parseFloat(properties.get("cytomine.width").toString());
        if (physicalWidthProperty != 0 && widthProperty != 0) {
            float resolution = physicalWidthProperty / widthProperty / 1000;
            properties.put("cytomine.resolution", resolution);
        }
        return properties;
    }

    @Override
    public File getRootFile(File folder) {
        Optional<File> vms = Arrays.stream(folder.listFiles()).filter(x -> x.getName().endsWith(".vms")).findFirst();

        if (vms.isPresent()) {
            return vms.get();
        }
        return null;
    }
}
