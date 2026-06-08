package com.wsi.annotation.api.ims.formats.archive;



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

import com.wsi.annotation.api.common.exception.FormatException;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.file.FileUtils;
import com.wsi.annotation.api.ims.formats.ArchiveFormat;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
public class ZipFormat extends ArchiveFormat {

    public ZipFormat() {
        this.mimeType = "application/zip";
    }


    @Override
    public boolean detect() throws IOException, InterruptedException {
        return ProcUtils.executeOnShell("unzip -t " + absoluteFilePath, false) == 0;
    }

    public String[] extract(String destPath) throws IOException, InterruptedException {

        /* Create and temporary directory which will contains the archive content */
        //println "Create path=$destPath"
        ProcUtils.executeOnShell("mkdir -p " + destPath);
        //println "Create right=$destPath"
        ProcUtils.executeOnShell("chmod -R 777 " + destPath);

        /* Get extension of filename in order to choose the uncompressor */
        String ext = FileUtils.getExtensionFromFilename(absoluteFilePath).toLowerCase();
        /* Unzip */
        if (ext.equals("zip")) {
            /*def ant = new AntBuilder()
            ant.unzip(src : absoluteFilePath,
                    dest : destPath,
                    overwrite : false)*/
            String command = "unzip " + absoluteFilePath + " -d " + destPath;
            //println command
            ProcUtils.executeOnShell(command);
//            def proc = command.execute()
//
//            def sout = new StringBuilder(), serr = new StringBuilder()
//            proc.consumeProcessOutput(sout, serr)
//            proc.waitFor()
        } else {
            throw new FormatException("Zip has no zip extension");
        }

        List<String> pathsAndExtensions = new ArrayList<>();
        for (File file : new File(destPath).listFiles()) {
            if (!file.isDirectory()) {
                pathsAndExtensions.add(file.getAbsolutePath());
            }
        }

        return (String[]) pathsAndExtensions.toArray();
    }

    @Override
    public String[] convert() throws IOException, InterruptedException {

//        println "in convert"
//        println absoluteFilePath

        File current = new File(absoluteFilePath);
        String destPath = current.getParent() + "/" + current.getName().substring(0, current.getName().lastIndexOf("."));
        log.info("destPath:" + destPath);

//        println current.parentFile.list()
//        println destPath


        String finalDestPath =  current.getName().substring(0, current.getName().lastIndexOf("."));
        log.info("parentFile:"+ StringUtils.join(current.getParentFile().list(),","));
        while (Arrays.asList(current.getParentFile().list()).contains(finalDestPath)) {
            // println current.parentFile.list()
            //println destPath
            destPath += "_converted";
            log.info("destPathConvert:" + destPath);
        }

        /*        long timestamp = new Date().getTime()
String parentPath = new File(absoluteFilePath).getParent()
String destPath = ["/tmp", timestamp].join(File.separator)*/

        /* Create and temporary directory which will contains the archive content */
        //println "Create path=$destPath"
        ProcUtils.executeOnShell("mkdir -p " + destPath);
        //println "Create right=$destPath"
        ProcUtils.executeOnShell("chmod -R 777 " + destPath);

        /* Get extension of filename in order to choose the uncompressor */
        String ext = FileUtils.getExtensionFromFilename(absoluteFilePath).toLowerCase();
        /* Unzip */
        if (ext.equals("zip")) {
            /*def ant = new AntBuilder()
            ant.unzip(src : absoluteFilePath,
                    dest : destPath,
                    overwrite : false)*/
            String command = "unzip " + absoluteFilePath + " -d " + destPath;

            log.info("unzip_command:" + command);
            //println command
            ProcUtils.executeOnShell(command);
//            def command = "unzip " + absoluteFilePath + " -d " + destPath
//            println command
//            def proc = command.execute()
//
//            def sout = new StringBuilder(), serr = new StringBuilder()
//            proc.consumeProcessOutput(sout, serr)
//            proc.waitFor()
        } else {
            throw new FormatException("Zip has no zip extension");
        }

        return new String[]{destPath};
    }
}
