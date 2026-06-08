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

import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.ims.formats.lightconvertable.VIPSConvertable;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * Created by stevben on 22/04/14.
 */

@Slf4j
public abstract class ConvertableTIFFFormat extends VIPSConvertable {

    public ConvertableTIFFFormat() {
        extensions = new String[]{"tif", "tiff"};
        mimeType = "image/tiff";
    }


    public String getTiffInfo() throws IOException {
        Process process = Runtime.getRuntime().exec(ProjectConfig.getTiffinfo() + " " + this.absoluteFilePath);
        String tiffinfo = ProcUtils.getText(new BufferedReader(new InputStreamReader(process.getInputStream())));
        log.info("tiffinfo:" + tiffinfo);
        ProcUtils.closeStreams(process);
        return tiffinfo;
    }


}
