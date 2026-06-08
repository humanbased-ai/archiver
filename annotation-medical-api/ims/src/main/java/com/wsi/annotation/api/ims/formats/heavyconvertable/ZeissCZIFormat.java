package com.wsi.annotation.api.ims.formats.heavyconvertable;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

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
public class ZeissCZIFormat extends BioFormatConvertable {
    final String CZI_MAGIC_STRING = "ZISRAWFILE";

    public ZeissCZIFormat() {
        this.mimeType = "zeiss/czi";
    }


    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() throws IOException {

        int blockLen = 10;

        File file = new File(absoluteFilePath);
        String magic;

        FileInputStream fin = null;
        try {
            fin = new FileInputStream(file);
            byte[] fileContent = new byte[blockLen];
            fin.read(fileContent);
            magic = new String(fileContent);
        } finally {
            if (fin != null) fin.close();
        }

        return magic.equals(CZI_MAGIC_STRING);
    }

    @Override
    public boolean getGroup() {
        return true;
    }

    @Override
    public boolean getOnlyBiggestSerie() {
        return true;
    }


}

