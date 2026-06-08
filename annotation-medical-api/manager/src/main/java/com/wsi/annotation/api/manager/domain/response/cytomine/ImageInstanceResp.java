package com.wsi.annotation.api.manager.domain.response.cytomine;

import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.bean.BeanUtils;
import com.wsi.annotation.api.database.annotation.AutoConvertObjectId;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.Inner.InnerTag;
import com.wsi.annotation.api.manager.vo.ZoomLevelVo;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.models.auth.In;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Value;

import java.util.Arrays;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageInstanceResp {
    private String id;
    private Long id_num;
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
    private Double resolution;
    private Double magnification;
    private Integer depth;
    private String preview;
    private String thumb;
    private String macroURL;
    private String imageUrl;
    private String fullPath;
    private Integer numberOfAnnotations;
    private Integer numberOfJobAnnotations;
    private Integer numberOfReviewedAnnotations;
    @ApiModelProperty("切片诊断报告")
    private String description;
    @ApiModelProperty("切片部位")
    private String place;
    @ApiModelProperty("切片标签")
    private List<InnerTag> tags;
    /**
     * TCGA,COREONE
     */
    private String source;
    /**
     * HE,IHC
     */
    private String wsiType;
    /**
     * 病理号
     */
    private String pathologyNumber;
    /**
     * 倍数
     */
    private Integer multiple;

    /**
     * 癌症名称
     */
    private String cancerName;
    private Integer matchedPatch;
    private Integer similarity;
    private Integer totalPatch;
    private Integer isMasked;

    private Integer quality;

    private String caseId;

    @AutoConvertObjectId
    private List<String> imageServerIds;

    public ImageInstanceResp(ImageInstance imageInstance) {
        BeanUtils.copyBeanProp(this, imageInstance);
        this.setDepth(this.getZoomLevels(this.width, this.height).getMax());
        this.setMime(imageInstance.getMimeType());
        this.setThumb(this.getThumbImage(this.baseImageId, 512));
        this.setPreview(this.getThumbImage(this.baseImageId, 1024));
        this.setMacroURL(this.getAssociatedImage(this.baseImageId, "macro"));
        this.setFullPath(imageInstance.getBase_path() + imageInstance.getPath());
        this.setImageUrl(this.getUiImageUrl());
        this.setSource(imageInstance.getSource());
        this.setWsiType(imageInstance.getWsiType());
        this.setPathologyNumber(imageInstance.getPathologyNumber());
        this.setCancerName(imageInstance.getCancerName());
        this.setTotalPatch(imageInstance.getTotalPatch());
        this.setIsMasked(imageInstance.getIsMasked());
        this.setId_num(imageInstance.getId_num());
        this.setQuality(imageInstance.getQuality());
        if(ObjectUtils.isNotEmpty(imageInstance.getCase_id())&&imageInstance.getCase_id().size()>0){
            this.setCaseId(imageInstance.getCase_id().get(0));
        }
    }

    public String getThumbImage(String idAbstractImage, int maxSize) {
        return ProjectConfig.getServerUrl() + "/imagecore/api/abstractimage/thumb.png?abstractImageId=" + idAbstractImage + "&maxSize=" + maxSize;
    }

    public String getAssociatedImage(String idAbstractImage, String label) {
        String[] mines = new String[]{"image/pyrtiff", "image/tiff", "image/tif", "image/jp2"};
        if (Arrays.stream(mines).anyMatch(x -> x.equals(this.getMime())))
            return null;
        return ProjectConfig.getServerUrl() + "/imagecore/api/abstractimage/associated.png?abstractImageId=" + idAbstractImage + "&maxSize=256&label=" + label;
    }

    public String getUiImageUrl() {
        return ProjectConfig.getUiUrl() + "/#/image/" + this.getId();
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
