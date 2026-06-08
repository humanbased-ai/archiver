package com.wsi.annotation.api.ims.formats.supported.digitalpathology;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.ims.formats.supported.SupportedImageFormat;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.HashMap;
import java.util.Map;

@Slf4j
public class MoticFormat extends SupportedImageFormat {

    @Override
    public boolean detect() throws IOException, InterruptedException {
        String result = runCmd(1,absoluteFilePath);
        Integer ret = Integer.parseInt(result);
        if(ret==0){
            return false;
        }else {
            return true;
        }
    }

    @Override
    public BufferedImage associated(String label) throws IOException, InterruptedException {
        try {
            if(this.detect()){
                String result = runCmd(4,absoluteFilePath);
                return base64ToBufferedImage(result);
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public BufferedImage thumb(int maxSize) throws IOException {
        try {
            if(this.detect()){
                String result = runCmd(3,absoluteFilePath);
                return base64ToBufferedImage(result);
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public Map<String, Object> properties() throws IOException {
        Map<String, Object> properties = new HashMap<>();
        try {
            if(this.detect()){
                properties.put("mimeType", mimeType);
                String result = runCmd(2,absoluteFilePath);
                JSONObject obj = JSONObject.parseObject(result);
                properties.put("cytomine.width", obj.getInteger("width"));
                properties.put("cytomine.height", obj.getInteger("height"));
                properties.put("cytomine.resolution", obj.getDouble("resolution"));
                properties.put("cytomine.magnification", obj.getInteger("magnification"));
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }


        return properties;
    }



    private static BufferedImage base64ToBufferedImage(String base64) throws IOException {
        Base64 base = new Base64();
        byte[] image = base.decode(base64.replace("data:image/jpeg;base64,", ""));
        InputStream stream = new ByteArrayInputStream(image);
        BufferedImage bufferedImage = ImageIO.read(stream);
        return bufferedImage;
    }

    private String runCmd(Integer type,String path){
        Runtime runtime = Runtime.getRuntime();  //获取Runtime实例
        String result = null;
        try {
            String[] command = {"./motic/main", type.toString(), path};
//            String[] command = {"ipconfig","/all"};
            Process process = runtime.exec(command);
            // 标准输入流（必须写在 waitFor 之前）
            result = consumeInputStream(process.getInputStream());
            // 标准错误流（必须写在 waitFor 之前）
//            result = consumeInputStream(process.getErrorStream()); //若有错误信息则输出
            int proc = process.waitFor();
            if (proc == 0) {
                log.info("执行成功:{}", result);
            } else {
                log.info("执行失败:{}",result);
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
        return result;
    }

    public String consumeInputStream(InputStream is) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(is,"GBK"));
        String s;
        StringBuilder sb = new StringBuilder();
        while ((s = br.readLine()) != null) {
            sb.append(s);
        }
        return sb.toString();
    }
}
