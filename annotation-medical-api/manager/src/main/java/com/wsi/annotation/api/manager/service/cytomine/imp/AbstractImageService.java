package com.wsi.annotation.api.manager.service.cytomine.imp;

import com.alibaba.fastjson.JSON;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.database.dao.cytomine.AttachedFileDao;
import com.wsi.annotation.api.database.dao.cytomine.ImageServerDao;
import com.wsi.annotation.api.database.domain.cytomine.AbstractImage;
import com.wsi.annotation.api.database.domain.cytomine.AttachedFile;
import com.wsi.annotation.api.database.domain.cytomine.ImageServer;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageServerResq;
import com.wsi.annotation.api.manager.service.cytomine.IAbstractImageService;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
@Slf4j
public class AbstractImageService implements IAbstractImageService {
    @Autowired
    MongoTemplate mongoTemplate;

    @Autowired
    AttachedFileDao attachedFileDao;

    @Autowired
    ImageServerDao imageServerDao;

    public void thumb(String abstractImageId, Integer maxSize) {
//        response.setHeader("max-age", "86400");
        try {
            log.info("abstractImageId:{}",abstractImageId);
            AbstractImage abstractImage = mongoTemplate.findById(new ObjectId(abstractImageId), AbstractImage.class);
            log.info("abstractImage:{}",abstractImage.getId());
            String fif = URLEncoder.encode(abstractImage.getAbsolutePath(), "UTF-8");
            String mimeType = abstractImage.getMimeType();
            String url = "/image/thumb?format=jpg&fif=" + fif + "&mimeType=" + mimeType + "&maxSize=" + maxSize;
            log.info("url:{}",url);
            getImages(abstractImage, url,"jpg");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void associated(String abstractImageId, Integer maxSize, String label) {
//        response.setHeader("max-age", "86400");
        try {
            AbstractImage abstractImage = mongoTemplate.findById(abstractImageId, AbstractImage.class);
            String fif = URLEncoder.encode(abstractImage.getAbsolutePath(), "UTF-8");
            String mimeType = abstractImage.getMimeType();
            String url = "/image/nested?format=jpg&fif=" + fif + "&mimeType=" + mimeType + "&label=" + label + "&maxSize=" + maxSize;
            getImages(abstractImage, url,"jpg");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void getImages(AbstractImage abstractImage, String url,String format) {
        try {

            AttachedFile attachedFile = attachedFileDao.getAttachedFileByDomainIdentAndFilename(abstractImage.getId_num(), url);
            if (attachedFile == null) {
                String imageServerURL = getRandomImageServerURL(abstractImage.getImageServerIds());
                URL imageData = new URL(imageServerURL + url);
                log.info("abstractImage");
                log.info(JSON.toJSONString(abstractImage));
                log.info("imageServerURL + url:");
                log.info(imageServerURL + url);
                BufferedImage bufferedImage = ImageIO.read(imageData);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(bufferedImage, format, baos);
                attachedFile = new AttachedFile();
                attachedFile.setDomainIdent(abstractImage.getId_num());
                attachedFile.setFilename(url);
                attachedFile.setData(Base64.getEncoder().encodeToString(baos.toByteArray()));
                attachedFileDao.save(attachedFile);
                HttpUtils.responseBufferedImage(bufferedImage);
            } else {
                BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(attachedFile.getData())));
                HttpUtils.responseBufferedImage(bufferedImage);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public ImageServerResq imageServers(String abstractImageId) {
        ImageServerResq resq = new ImageServerResq();
        List<String> imageServersURLs = new ArrayList<>();
        AbstractImage abstractImage = mongoTemplate.findById(abstractImageId, AbstractImage.class);
        if (abstractImage != null) {
            String zoomify = abstractImage.getBase_path() + abstractImage.getPath();

            imageServerDao.findAllById(abstractImage.getImageServerIds())
                    .forEach(x -> imageServersURLs.add(x.getUrl() + x.getService() + "?zoomify=" + zoomify));
        }
        resq.setImageServersURLs(imageServersURLs);
        return resq;
    }

    public void crop(HttpServletRequest request) throws IOException {
        String redirection = getCropUrl(request);
        String format = request.getParameter("format");
        HttpServletResponse response = ServletUtils.getResponse();
        if (redirection.length() < 2000) {
            response.sendRedirect(redirection);
        } else {
            HttpUtils.responseUrl(redirection, format, response);
        }
    }


    public String getCropUrl(HttpServletRequest request) throws UnsupportedEncodingException {
        String baseImageId = request.getParameter("baseImageId");
        return getCropIMSUrl(baseImageId, request.getQueryString());
    }

    public String getCropIMSUrl(String baseImageId, String queryString) throws UnsupportedEncodingException {
        AbstractImage abstractImage = mongoTemplate.findById(baseImageId, AbstractImage.class);
        String imageServerURL = getRandomImageServerURL(abstractImage.getImageServerIds());
        String fif = URLEncoder.encode(abstractImage.getAbsolutePath(), "UTF-8");
        String mimeType = abstractImage.getMimeType();
        return imageServerURL + "/image/crop?fif=" + fif + "&mimeType=" + mimeType + "&" + queryString + "&resolution=" + abstractImage.getResolution();
    }


    public String getRandomImageServerURL(List<String> imageServerIds) {
        int index = Long.valueOf(Math.round(Math.random() * (imageServerIds.size() - 1))).intValue(); //select an url randomly
        ImageServer imageServer = mongoTemplate.findById(imageServerIds.get(index), ImageServer.class);
        String imageServerURL = imageServer.getUrl();
        return imageServerURL;
    }
}
