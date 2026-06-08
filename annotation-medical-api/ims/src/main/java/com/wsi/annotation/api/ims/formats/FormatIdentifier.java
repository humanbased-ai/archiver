package com.wsi.annotation.api.ims.formats;

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


import com.wsi.annotation.api.common.exception.FormatException;
import com.wsi.annotation.api.ims.formats.archive.ZipFormat;
import com.wsi.annotation.api.ims.formats.heavyconvertable.CellSensVSIFormat;
import com.wsi.annotation.api.ims.formats.heavyconvertable.DotSlideFormat;
import com.wsi.annotation.api.ims.formats.heavyconvertable.OMETIFFFormat;
import com.wsi.annotation.api.ims.formats.heavyconvertable.ZeissCZIFormat;
import com.wsi.annotation.api.ims.formats.lightconvertable.*;
import com.wsi.annotation.api.ims.formats.lightconvertable.specialtiff.*;
import com.wsi.annotation.api.ims.formats.supported.*;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ArrayUtils;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Created by stevben on 22/04/14.
 */
@Slf4j
public class FormatIdentifier {

    //    static public getAvailableArchiveFormats() {
//        return [
//                new ZipFormat()
//        ]
//    }
//
    public static Format[] getAvailableMultipleImageFormats() {
        return new Format[]{
                //openslide compatibles formats
                new HamamatsuVMSFormat(),
                new MiraxMRXSFormat(),
                new SakuraSVSlideFormat()};

    }

    //
    public static Format[] getAvailableHierarchicalMultipleImageFormats() {
        return new Format[]{
                new DotSlideFormat(),
                new CellSensVSIFormat()
        };
    }

    //
    public static Format[] getAvailableSingleFileImageFormats() {
        //check the extension and or content in order to identify the right Format
        return new Format[]{//new PhilipsTIFFFormat(), new AperioSVSFormat()};
                new JPEG2000Format(),
                new ZeissCZIFormat(),
                //openslide compatibles formats
                new AperioSVSFormat(),
                new HamamatsuNDPIFormat(),
                new LeicaSCNFormat(),
                //new SakuraSVSlideFormat(),
                new SDPCFormat(),
                new KFBFormat(),
                new TronFormat(),
                new MDSXFormat(),

                new CZITIFFFormat(),
                new OMETIFFFormat(),
                //common formats
                new PhotoshopTIFFFormat(),
                new HuronTIFFFormat(),
                new PlanarTIFFFormat(),
                new BrokenTIFFFormat(),
                new PyramidalTIFFFormat(),
                new VentanaBIFFormat(),
                new VentanaTIFFFormat(),
                new DICOMFormat(),
                new JPEGFormat(),
                new PGMFormat(),
                new PNGFormat(),
                new BMPFormat()

        };
//        ]
    }

    //
//    static public def getImageFormats(String uploadedFilePath, def imageFormats = [], def parent = null) {
//
//        File uploadedFile = new File(uploadedFilePath);
//
//        if(uploadedFile.isDirectory()){
//            println "$uploadedFilePath is a directory"
//
//            if(uploadedFile.name == "__MACOSX") return;
//            // check if it is a folder containing one multipleFileImage
//            def multipleFileImageFormats = getAvailableHierarchicalMultipleImageFormats() + getAvailableMultipleImageFormats()
//
//            def format = multipleFileImageFormats.find { imageFormat ->
//                imageFormat.absoluteFilePath = uploadedFilePath
//                return imageFormat.detect()
//            }
//
//            if(format){
//                imageFormats << [
//                        absoluteFilePath : format.absoluteFilePath,
//                        imageFormat : format,
//                        parent : parent
//                ]
//            } else {
//                for(File child : uploadedFile.listFiles()) getImageFormats(child.absolutePath, imageFormats, parent);
//            }
//            return imageFormats
//        }
//
//        def archiveFormats = getAvailableArchiveFormats()
//
//        archiveFormats.each {
//            it.absoluteFilePath = uploadedFilePath
//        }
//
//        ArchiveFormat detectedArchiveFormat = archiveFormats.find {
//            it.detect()
//        }
//
//        if (detectedArchiveFormat) { //archive, we need to extract and analyze the content
//
//            String dest = uploadedFile.getParent()+ "/" + RandomStringUtils.random(13,  (('A'..'Z') + ('0'..'0')).join().toCharArray())
//            detectedArchiveFormat.extract(dest)
//
//            getImageFormats(dest,imageFormats, [absoluteFilePath : uploadedFilePath, imageFormat : detectedArchiveFormat])
//
//        } else {
//            imageFormats << [
//                    uploadedFilePath : uploadedFilePath,
//                    imageFormat : getImageFormat(uploadedFilePath),
//                    parent : parent
//            ]
//        }
//        return imageFormats
//    }
//
    public static SupportedImageFormat getImageFormatByMimeType(String fif, String mimeType) {
        //def imageFormats = getAvailableSingleFileImageFormats() + getAvailableMultipleImageFormats()
        SupportedImageFormat imageFormat = null;
        try {
            Format[] imageFormats = getAvailableSingleFileImageFormats();
            imageFormat = (SupportedImageFormat) Arrays.stream(imageFormats).filter(x ->
                {
                    Field field = null;
                    try {
                        field = x.getClass().getField("mimeType");
//                        log.info("field:",field.get(x));
                        return mimeType.equals(field.get(x).toString());
                    } catch (NoSuchFieldException | IllegalAccessException e) {
                        e.printStackTrace();
                    }
                    return false;
                }
            ).findFirst().get();
        }catch (Exception e){
            e.printStackTrace();
        }


        imageFormat.absoluteFilePath = fif;
        return imageFormat;

    }

    public static Format getImageFormat(String filePath) throws IOException, InterruptedException {

        Format format = null;

        format = getMultiFileFormat(filePath);
        if (format != null) return format;

        if (new File(filePath).isFile()) {
//            format = getMultiFileFormat(filePath);
//            if (format != null) return format;

            Format testedFormat = new TronFormat();
            testedFormat.absoluteFilePath = filePath;
            if(testedFormat.detect()){
                return testedFormat;
            }

            testedFormat = new IntemedicFormat();
            testedFormat.absoluteFilePath = filePath;
            if(testedFormat.detect()){
                return testedFormat;
            }

            testedFormat = new MDSXFormat();
            testedFormat.absoluteFilePath = filePath;
            if (testedFormat.detect())
                return testedFormat;

            testedFormat = new ZipFormat();
            testedFormat.absoluteFilePath = filePath;
            if (testedFormat.detect())
                return testedFormat;

            testedFormat = new JPEG2000Format();
            testedFormat.absoluteFilePath = filePath;
            if (testedFormat.detect())
                return testedFormat;

            testedFormat = new ZeissCZIFormat();
            testedFormat.absoluteFilePath = filePath;
            if (testedFormat.detect())
                return testedFormat;


            format = getOpenSlideFormat(filePath);
            if (format != null)
                return format;

            format = getJiangfengFormat(filePath);
            if (format != null){
                return format;
            }

//            format = getTIFFFormat(filePath)
//            if (format) return format
//
//            format = getImageMagikFormat(filePath)
//            if (format) return format

        }
        throw new FormatException("Undetected Format:" + filePath);
    }

    private static Format getOpenSlideFormat(String filePath) {

        //String vendor = OpenSlide.detectVendor(new File(filePath))

        Format[] formats = new Format[]{
                new AperioSVSFormat(),
                new PhilipsTIFFFormat(),
                new HamamatsuNDPIFormat(),
                new LeicaSCNFormat(),
                new SakuraSVSlideFormat(),
                new VentanaBIFFormat(),
                new VentanaTIFFFormat()
        };


        for (int i = 0; i < formats.length; i++) {
            formats[i].absoluteFilePath = filePath;
        }

        List<Format> result = Arrays.stream(formats).filter(x -> {
            // try {
            Method method = null;
            try {
                method = x.getClass().getMethod("detect");
                log.info(x.getClass().getName() + "(detect):" + method.invoke(x));
                return (Boolean) method.invoke(x);
                //return mimeType.equals(field.get(x).toString());
            } catch (NoSuchMethodException e) {
                e.printStackTrace();
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            } catch (InvocationTargetException e) {
                e.printStackTrace();
            }

            //return x.detect();
//            } catch (IOException e) {
//                log.info("format",e);
//                e.printStackTrace();
//            } catch (InterruptedException e) {
//                log.info("format",e);
//                e.printStackTrace();
//            }
            return false;
        }).collect(Collectors.toList());

        return result.size() > 0 ? result.get(0) : null;
    }

    private static Format getJiangfengFormat(String filePath) {

        //String vendor = OpenSlide.detectVendor(new File(filePath))

        Format[] formats = new Format[]{
                new KFBFormat()
        };


        for (int i = 0; i < formats.length; i++) {
            formats[i].absoluteFilePath = filePath;
        }

        List<Format> result = Arrays.stream(formats).filter(x -> {
            // try {
            Method method = null;
            try {
                method = x.getClass().getMethod("detect");
                log.info(x.getClass().getName() + "(detect):" + method.invoke(x));
                return (Boolean) method.invoke(x);
                //return mimeType.equals(field.get(x).toString());
            } catch (NoSuchMethodException e) {
                e.printStackTrace();
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            } catch (InvocationTargetException e) {
                e.printStackTrace();
            }
            return false;
        }).collect(Collectors.toList());

        return result.size() > 0 ? result.get(0) : null;
    }

    //
//    static public Format getImageFormat(String filePath) {
//
//        def format;
//
//        format = getMultiFileFormat(filePath)
//        if (format) return format
//
//        if (new File(filePath).isFile()) {
//            format = getMultiFileFormat(filePath)
//            if (format) return format
//
//            Format testedFormat = new ZipFormat()
//            testedFormat.absoluteFilePath = filePath
//            if(testedFormat.detect())
//                return testedFormat
//
//            testedFormat = new JPEG2000Format()
//            testedFormat.absoluteFilePath = filePath
//            if(testedFormat.detect())
//                return testedFormat
//
//            testedFormat = new ZeissCZIFormat()
//            testedFormat.absoluteFilePath = filePath
//            if(testedFormat.detect())
//                return testedFormat
//
//            format = getOpenSlideFormat(filePath)
//            if (format) return format
//
//            format = getTIFFFormat(filePath)
//            if (format) return format
//
//            format = getImageMagikFormat(filePath)
//            if (format) return format
//
//        }
//
//        throw new FormatException("Undetected Format");
//    }
//
//    private static Format getTIFFFormat(String filePath) {
//
//        def tiffinfoExecutable = Holders.config.cytomine.tiffinfo
//        String tiffinfo = new ProcessBuilder("$tiffinfoExecutable", filePath).redirectErrorStream(true).start().text
//
//        def formats = [new CZITIFFFormat(),
//                       new OMETIFFFormat(),
//                       new PhotoshopTIFFFormat(),
//                       new HuronTIFFFormat(),
//                       new PlanarTIFFFormat(),
//                       new BrokenTIFFFormat(),
//                       new PyramidalTIFFFormat()
//        ]
//
//
//        formats.each {
//            it.absoluteFilePath = filePath
//        }
//
//        def result = formats.find {
//            it.detect(tiffinfo)
//        }
//
//        return result
//    }
//    private static Format getOpenSlideFormat(String filePath) {
//
//        //String vendor = OpenSlide.detectVendor(new File(filePath))
//
//        def formats = [
//                               new AperioSVSFormat(),
//                               new HamamatsuNDPIFormat(),
//                               new LeicaSCNFormat(),
//                               //new SakuraSVSlideFormat(),
//                               new PhilipsTIFFFormat(),
//                               //common formats
//                               new VentanaBIFFormat(),
//                               new VentanaTIFFFormat()
//        ]
//
//
//        formats.each {
//            it.absoluteFilePath = filePath
//        }
//
//        def result = formats.find {
//            it.detect()
//        }
//
//        return result
//    }
//    private static Format getImageMagikFormat(String filePath) {
//
//        def identifyExecutable = Holders.config.cytomine.identify
//        def command = ["$identifyExecutable", filePath]
//        def proc = command.execute()
//        proc.waitFor()
//        String identifyInfo = proc.in.text
//
//        def formats = [        new DICOMFormat(),
//                               new JPEGFormat(),
//                               new PGMFormat(),
//                               new PNGFormat(),
//                               new BMPFormat()
//        ]
//
//
//        formats.each {
//            it.absoluteFilePath = filePath
//        }
//
//        def result = formats.find {
//            it.detect(identifyInfo)
//        }
//
//        return result
//    }
//
    private static Format getMultiFileFormat(String filePath) {

        Format[] formats = ArrayUtils.addAll(getAvailableMultipleImageFormats(), getAvailableHierarchicalMultipleImageFormats());

        for (Format format : formats) {
            format.absoluteFilePath = filePath;
        }

        List<Format> formatResults = Arrays.stream(formats).filter(x -> {
            try {
                log.info("formatDetect:" + x.getMimeType() + ";" + x.detect());
                return x.detect();
            } catch (IOException e) {
                e.printStackTrace();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            return false;
        }).collect(Collectors.toList());

        log.info("formatResults:" + formatResults.size());

        if (formatResults.size() > 0) {
            log.info("formatResults:" + formatResults.size() + ";Format:" + formatResults.get(0).getMimeType());
            return formatResults.get(0);
        } else {
            return null;
        }
    }

    public static boolean isClassicFolder(String filePath) {
        if (!new File(filePath).isDirectory()) return false;
        return getMultiFileFormat(filePath) == null;
    }
}