package com.wsi.annotation.api.manager.util;

import com.wsi.annotation.api.common.config.ProjectConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

public class ApiUtil {

    public static String getAbstractImageThumbURL(String imageId) {
        return  "/cytomine/imageinstance/thumb/"+imageId;
    }

    public static String getAbstractImageThumbURL(String imageId,int maxSize) {
        return  ProjectConfig.getServerUrl() + "/cytomine/abstractimage/thumb/"+imageId + "?maxSize=" + maxSize;
    }

    public static String getThumbImage(String idAbstractImage, int maxSize) {
        return ProjectConfig.getServerUrl() + "/cytomine/abstractimage/thumb.png?abstractImageId=" + idAbstractImage + "&maxSize=" + maxSize;
    }

}
