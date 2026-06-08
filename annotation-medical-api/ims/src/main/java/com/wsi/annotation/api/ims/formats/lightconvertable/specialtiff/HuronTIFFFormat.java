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

import java.io.IOException;

public class HuronTIFFFormat extends ConvertableTIFFFormat implements ITIFFFormat {
    public HuronTIFFFormat() {
        extensions = new String[]{"tif", "tiff"};
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    public boolean detect() throws IOException {
        String tiffinfo = getTiffInfo();
        return this.detect(tiffinfo);
    }

    public boolean detect(String tiffinfo) {
        return !tiffinfo.contains("Compression Scheme: JPEG") && !tiffinfo.contains("Photometric Interpretation: YCbCr") &&
                tiffinfo.contains("Compression Scheme: None") && tiffinfo.contains("Photometric Interpretation: RGB color") &&
                tiffinfo.contains("Source = Bright Field");
    }
}
