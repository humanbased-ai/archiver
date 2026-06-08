package com.wsi.annotation.api.manager.service.cytomine;

import com.wsi.annotation.api.manager.domain.response.cytomine.ImageServerResq;

import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

public interface IAbstractImageService {
    public void thumb(String abstractImageId , Integer maxSize);
    public void associated(String abstractImageId, Integer maxSize, String label);
    public ImageServerResq imageServers(String abstractImageId);
    public void crop(HttpServletRequest request) throws IOException;
    public String getCropIMSUrl(String baseImageId,String queryString) throws IOException;
}
