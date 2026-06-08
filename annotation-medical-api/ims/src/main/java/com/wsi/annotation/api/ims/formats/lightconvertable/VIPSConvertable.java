package com.wsi.annotation.api.ims.formats.lightconvertable;


import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.exception.MiddlewareException;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.file.FileUtils;
import com.wsi.annotation.api.ims.formats.Format;
import com.wsi.annotation.api.ims.formats.IConvertableImageFormat;

import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 * Created by hoyoux on 25.09.15.
 */
public abstract class VIPSConvertable extends Format implements IConvertableImageFormat {
    public String[] extensions = null;
    public List<String> iipURL = ProjectConfig.getIipServers();

    @Override
    public String[] convert() throws IOException, InterruptedException {
        String ext = FileUtils.getExtensionFromFilename(absoluteFilePath).toLowerCase();
        String source = absoluteFilePath;
        File current = new File(absoluteFilePath);
        String target = "";
        if (current.getName().lastIndexOf(".") > -1)
            target = current.getParent() + "/" + current.getName().substring(0, current.getName().lastIndexOf(".")) + "_pyr.tif";
        else
            target = current.getParent() + "/" + current.getName() + "_pyr.tif";

        target = target.replace(" ", "_");
//        println "ext : $ext"
//        println "source : $source"
//        println "target : $target"

        //1. Look for vips executable
        String vipsExecutable = ProjectConfig.getVips();

        //2. Pyramid command
        String pyramidCommand = vipsExecutable + " tiffsave " + source + " " + target + " --tile --pyramid --compression ";
        if (ProjectConfig.getImageConversionAlgorithm().equals("lzw")) pyramidCommand += "lzw";
        else pyramidCommand += "jpeg -Q 95";
        pyramidCommand += " --tile-width 256 --tile-height 256 --bigtiff";

        boolean success = true;

        success &= (ProcUtils.executeOnShell(pyramidCommand) == 0);

        if (!success) {
            throw new MiddlewareException("VIPS Exception");
        }
        return new String[]{target};
    }
}
