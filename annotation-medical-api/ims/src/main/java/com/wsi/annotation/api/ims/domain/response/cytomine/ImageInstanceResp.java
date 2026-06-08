package com.wsi.annotation.api.ims.domain.response.cytomine;

import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.bean.BeanUtils;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.ims.vo.ZoomLevelVo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageInstanceResp {
    private String id;
    private Integer id_num;
    private String baseImageId;
    private Integer baseImage;
    private String userId;
    private Integer user;
    private String projectId;
    private Integer project;
    private String filename;
    private String extension;
    private String originalFilename;
    private String instanceFilename;
    private String path;
    private String mime;
    private Integer width;
    private Integer height;
    private double resolution;
    private Integer depth;
    private String preview;
    private String thumb;
    private String macroURL;
    private String fullPath;
    private Integer numberOfAnnotations;
    private Integer numberOfJobAnnotations;
    private Integer numberOfReviewedAnnotations;

    public ImageInstanceResp(ImageInstance imageInstance) {
        BeanUtils.copyBeanProp(this, imageInstance);
        this.setDepth(this.getZoomLevels(this.width, this.height).getMax());
        this.setMime(imageInstance.getMimeType());
        this.setThumb(this.getThumbImage(this.baseImage, 512));
        this.setPreview(this.getThumbImage(this.baseImage, 1024));
        this.setMacroURL(this.getAssociatedImage(this.baseImage, "macro"));
        this.setFullPath(imageInstance.getBase_path() + imageInstance.getPath());
    }

    public String getThumbImage(Integer idAbstractImage, int maxSize) {
        return ProjectConfig.getServerUrl() + "/cytomine/abstractImage/thumb.png?abstractImageId=" + idAbstractImage + "&maxSize=" + maxSize;
    }

    public String getAssociatedImage(Integer idAbstractImage, String label) {
        String[] mines = new String[]{"image/pyrtiff", "image/tiff", "image/tif", "image/jp2"};
        if (Arrays.stream(mines).anyMatch(x -> x.equals(this.getMime())))
            return null;
        return ProjectConfig.getServerUrl() + "/cytomine/abstractImage/associated.png?abstractImageId=" + idAbstractImage + "&maxSize=256&label=" + label;
    }

    public ZoomLevelVo getZoomLevels(Integer width, Integer height) {
        ZoomLevelVo zoomLevelVo = new ZoomLevelVo();
        if (width == 0 || height == 0) {
            zoomLevelVo.setMin(0);
            zoomLevelVo.setMax(9);
            zoomLevelVo.setMiddle(0);
            return zoomLevelVo;
        }
        double tmpWidth = width;
        double tmpHeight = height;
        int nbZoom = 0;
        while (tmpWidth > 256 || tmpHeight > 256) {
            nbZoom++;
            tmpWidth = tmpWidth / 2;
            tmpHeight = tmpHeight / 2;
        }
        zoomLevelVo.setMin(0);
        zoomLevelVo.setMax(nbZoom);
        zoomLevelVo.setMiddle(nbZoom / 2);
        zoomLevelVo.setOverviewWidth(Math.round(tmpWidth));
        zoomLevelVo.setOverviewHeight(Math.round(tmpHeight));
        zoomLevelVo.setWidth(width);
        zoomLevelVo.setHeight(height);
        return zoomLevelVo;
    }
}
