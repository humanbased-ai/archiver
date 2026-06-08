package com.wsi.annotation.api.ims.service.ims;


import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import org.apache.ibatis.javassist.tools.rmi.ObjectNotFoundException;
import org.locationtech.jts.io.ParseException;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.websocket.DeploymentException;
import java.io.IOException;
import java.io.UnsupportedEncodingException;

public interface IImageService {
    void tile(String zoomify, String tileGroup, int z, int x, int y, String mimeType);

    void crop() throws IOException, ParseException;

    void nested() throws IOException, InterruptedException, ObjectNotFoundException;

    void thumb() throws IOException;

    ImageInstance upload(MultipartFile file, String idStorage, String idProject) throws DeploymentException, IOException;

    void init(String idStorage, String idProject) throws DeploymentException, IOException;

    void initByFileName(String idStorage, String idProject,String fileName) throws DeploymentException, IOException;

    void associated() throws IOException, InterruptedException;

    ImageInstance upload(String imageId, MultipartFile file, String idStorage) throws DeploymentException, IOException;

}
