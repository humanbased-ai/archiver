package com.wsi.annotation.api.ims.oss.service;

import com.alibaba.druid.util.Base64;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.ims.oss.utils.DatePattern;
import com.wsi.annotation.api.ims.oss.utils.DateUtils;
import com.wsi.annotation.api.ims.oss.utils.StringUtils;
import com.wsi.annotation.api.ims.oss.domain.FileUploadReq;
import com.wsi.annotation.api.ims.oss.domain.FileUploadResp;
import com.wsi.annotation.api.ims.oss.exception.SystemException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.Calendar;
import java.util.Date;

@Service
public class AliOSSService {
    @Value("${oss.ali.endpoint}")
    private String endpoint;
    @Value("${oss.ali.accessKeyId}")
    private String accessKeyId;
    @Value("${oss.ali.accessKeySecret}")
    private String accessKeySecret;
    @Value("${oss.ali.bucket}")
    private String bucket;
    @Value("${oss.ali.visit.url}")
    private String visitUrl;
    @Value("${resources_path}")
    private String resourcesPath;
    @Value("${server.host}")
    private String hostUrl;

    public FileUploadResp upload(FileUploadReq fileUploadReq) {
        FileUploadResp fileUploadResp = new FileUploadResp();
        OSS ossClient = new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
        try {
            Calendar calendar = DateUtils.calendar(new Date());
            String url = "wsi.annotation/" + calendar.get(Calendar.YEAR) + "/" + calendar.get(Calendar.MONTH) + "/"
                    + calendar.get(Calendar.DAY_OF_MONTH) + "/"
                    + calendar.getTimeInMillis() + StringUtils.getRandomStr(6) + "." + fileUploadReq.getFileSuffix();
            ByteArrayInputStream tInputStringStream =
                    new ByteArrayInputStream(Base64.base64ToByteArray(fileUploadReq.getDataStream()));

            ossClient.putObject(bucket, url, tInputStringStream);
            fileUploadResp.setUrl(visitUrl + url);

        } catch (Exception e) {
            throw new SystemException("上传阿里云失败");
        } finally {
            ossClient.shutdown();
        }
        return fileUploadResp;
    }

    public FileUploadResp upload(MultipartFile file) {
        FileUploadResp fileUploadResp = new FileUploadResp();
        if (file == null) {
            throw new SystemException("文件不能为空");
        }
        // 获取文件名
        String fileName = file.getOriginalFilename();
        fileName = fileName.replace(" ","");
        Calendar calendar = DateUtils.calendar(new Date());
        fileName = DateUtils.format(new Date(), DatePattern.PURE_DATETIME_MS_PATTERN) + "_" + fileName;
        String path = "wsi.annotation/" + calendar.get(Calendar.YEAR) + "/" + calendar.get(Calendar.MONTH) + "/"
                + calendar.get(Calendar.DAY_OF_MONTH) + "/";
        BufferedOutputStream stream = null;
        try {
            File dir = new File(resourcesPath+path);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String filePath =  path + fileName;
            File savedFile = new File(resourcesPath+filePath);
            stream = new BufferedOutputStream(new FileOutputStream(savedFile));
            stream.write(file.getBytes());
            fileUploadResp.setUrl(hostUrl +"/"+ filePath);
        } catch (Exception e) {
            throw new HTTPDataException(400,"上传失败");
        } finally {
            if (null != stream) {
                try {
                    stream.close();
                }catch (Exception e){

                }
            }
        }
        return fileUploadResp;
    }

    private String getInputString() {
        InputStream is = null;
        byte[] bytes = null;
        try {
            is = new FileInputStream("G:\\b5e8afb0b016cc0db70c82db40d0f098.jpeg");
            ByteArrayOutputStream swapStream = new ByteArrayOutputStream();
            byte[] buff = new byte[100];
            int rc = 0;
            while ((rc = is.read(buff, 0, 100)) > 0) {
                swapStream.write(buff, 0, rc);
            }
            bytes = swapStream.toByteArray();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
        }
        String result = Base64.byteArrayToBase64(bytes);

        return result;
    }

    public static void main(String[] args) {

        InputStream is = null;
        byte[] bytes = null;
        try {
            is = new FileInputStream("G:\\b5e8afb0b016cc0db70c82db40d0f098.jpeg");
            ByteArrayOutputStream swapStream = new ByteArrayOutputStream();
            byte[] buff = new byte[100];
            int rc = 0;
            while ((rc = is.read(buff, 0, 100)) > 0) {
                swapStream.write(buff, 0, rc);
            }
            bytes = swapStream.toByteArray();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
        }
        String result = Base64.byteArrayToBase64(bytes);
        System.out.println(result);

    }

}
