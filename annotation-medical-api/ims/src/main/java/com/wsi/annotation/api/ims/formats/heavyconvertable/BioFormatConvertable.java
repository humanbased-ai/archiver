package com.wsi.annotation.api.ims.formats.heavyconvertable;


import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.exception.MiddlewareException;
import com.wsi.annotation.api.common.utils.ProcUtils;
import com.wsi.annotation.api.ims.formats.Format;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.UnknownHostException;

/**
 * Created by hoyoux on 25.09.15.
 */
@Slf4j
public abstract class BioFormatConvertable extends Format implements IHeavyConvertableImageFormat {

    @Override
    public String[] convert() {
        if (!ProjectConfig.isBioformatEnabled())
            throw new MiddlewareException("Convertor BioFormat not enabled");

//        println "BIOFORMAT called !"
        String[] files = new String[]{};
        String error = null;

        String hostName = ProjectConfig.getBioformatLocation();
        int portNumber = Integer.parseInt(ProjectConfig.getBioformatPort());

        try {
            Socket echoSocket = new Socket(hostName, portNumber);
            PrintWriter out =
                    new PrintWriter(echoSocket.getOutputStream(), true);
            BufferedReader inp =
                    new BufferedReader(
                            new InputStreamReader(echoSocket.getInputStream()));

            // out.println('{path:"'+absoluteFilePath+'",group:'+this.group+',onlyBiggestSerie:'+this.onlyBiggestSerie+'}');
            String result = inp.readLine();
            JSONObject json = JSONObject.parseObject(result);
            files = (String[]) json.getJSONArray("files").stream().map(x -> x.toString()).toArray();
            error = json.getString("error");
        } catch (IOException e) {
            // System.err.println(e.toString());
        }

//        println "bioformat returns"
//        println files.size()
//        println files

        if (files.length == 0 || files == null) {
            if (error != null) {
                throw new MiddlewareException("BioFormat Exception : \n" + error);
            }
        }
        return files;
    }

    public abstract boolean getGroup();

    public abstract boolean getOnlyBiggestSerie();

    public String getTiffInfo() throws IOException {
        Process process = Runtime.getRuntime().exec(ProjectConfig.getTiffinfo() + " " + this.absoluteFilePath);
        String tiffinfo = ProcUtils.getText(new BufferedReader(new InputStreamReader(process.getInputStream())));
        log.info("tiffinfo:" + tiffinfo);
        ProcUtils.closeStreams(process);
        return tiffinfo;
    }

}
