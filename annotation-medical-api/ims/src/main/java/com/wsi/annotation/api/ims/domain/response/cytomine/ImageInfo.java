package com.wsi.annotation.api.ims.domain.response.cytomine;

import lombok.Data;

@Data
public class ImageInfo {
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

    /**
     * 部位
     */
    private String place;


}
