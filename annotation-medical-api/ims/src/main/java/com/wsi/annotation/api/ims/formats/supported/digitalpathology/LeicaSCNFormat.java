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

import java.awt.image.BufferedImage;
import java.io.IOException;

/**
 * Created by stevben on 22/04/14.
 */
public class LeicaSCNFormat  extends OpenSlideSingleFileFormat {

    public LeicaSCNFormat() {
        extensions = new String[]{"scn"};
        vendor = "leica";
        mimeType = "openslide/scn";
        widthProperty = "openslide.level[0].width";
        heightProperty = "openslide.level[0].height";
        resolutionProperty = "openslide.mpp-x";
        magnificiationProperty = "leica.objective";
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
        }
        else {
            return bufferedImage;
        }
    }
}
