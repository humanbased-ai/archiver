package com.wsi.annotation.api.ims.formats.heavyconvertable;



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

import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.ims.formats.Format;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Created by hoyoux on 28.04.15.
 */
public class DotSlideFormat extends Format implements IHeavyConvertableImageFormat {

    public DotSlideFormat() {
        this.mimeType = "olympus/.slide";
    }

    @Override
    public String getMimeType() {
        return this.mimeType;
    }

    @Override
    public boolean detect() throws IOException {
        String mainFile = "ExtendedProps.xml";
        File folder = new File(this.absoluteFilePath);
        if (folder.isDirectory()) {
            List<File> target = Arrays.stream(folder.listFiles()).filter(x -> x.getName().endsWith(mainFile)).collect(Collectors.toList());
            if (target == null || target.size() == 0) return false;
            String command = "cat  " + target.get(0).getAbsolutePath();
            String stdout = ProcUtils.executeCommand(command);
            return stdout.contains("dotSlide");
        }
        return false;
    }

    @Override
    public String[] convert() throws Exception {
        //println "Conversion DotSlide : begin"
        String name = new File(absoluteFilePath).getName();

        // call the dotslide lib
        dotslide.Main.main("-fi", absoluteFilePath + "/fi", "-fp", absoluteFilePath + "/fp", "-p", absoluteFilePath + "/");
        dotslidebuild.Main.main(new String[]{"-f", absoluteFilePath + "/fp.txt", "-io", absoluteFilePath + "/" + name});

        // println "Conversion DotSlide : end"
        return new String[]{absoluteFilePath + "/" + name + ".tif"};
    }
}
