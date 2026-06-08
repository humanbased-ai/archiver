package com.wsi.annotation.api.ims.formats.lightconvertable.specialtiff;



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

import com.wsi.annotation.api.ims.formats.ITIFFFormat;
import org.springframework.util.StringUtils;

import java.io.IOException;

/**
 * Created by stevben on 28/04/14.
 */
public class PlanarTIFFFormat extends ConvertableTIFFFormat implements ITIFFFormat {

    private String[] excludeDescription = new String[]{
            "Not a TIFF",
            "<iScan",
            "Make: Hamamatsu",
            "Leica",
            "ImageDescription: Aperio Image Library",
            "PHILIPS"
    };

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() throws IOException {
        return this.detect(getTiffInfo());
    }

    @Override
    public boolean detect(String tiffinfo) {
        boolean notTiff = false;
        for (String it : excludeDescription) {
            notTiff |= tiffinfo.contains(it);
        }
        if (notTiff) return false;

        int nbTiffDirectory = StringUtils.countOccurrencesOf(tiffinfo, "TIFF Directory");

        return (nbTiffDirectory == 1 && !tiffinfo.contains("Tile")) ;//single layer tiff, we ne need to create a pyramid version
    }
}
