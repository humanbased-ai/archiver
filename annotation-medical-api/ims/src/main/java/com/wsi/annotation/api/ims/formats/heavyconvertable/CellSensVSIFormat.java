package com.wsi.annotation.api.ims.formats.heavyconvertable;


import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

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
public class CellSensVSIFormat extends BioFormatConvertable {

    public CellSensVSIFormat() {
        this.mimeType = "olympus/vsi";
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() {
        File folder = new File(this.absoluteFilePath);

        if (folder.isDirectory()) {
            List<File> target = Arrays.stream(folder.listFiles()).filter(x -> x.isFile() && x.getAbsolutePath().endsWith(".vsi")).collect(Collectors.toList());

            if (target != null && target.size() > 0) this.absoluteFilePath = target.get(0).getAbsolutePath();

            return target != null && target.size() > 0;
        }
        return false;
    }

    @Override
    public boolean getGroup() {
        return false;
    }

    @Override
    public boolean getOnlyBiggestSerie() {
        return true;
    }

    @Override
    public String[] convert() {
        return new String[0];
    }
}
