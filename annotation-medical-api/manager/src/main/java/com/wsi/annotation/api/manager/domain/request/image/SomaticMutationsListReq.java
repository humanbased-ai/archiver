package com.wsi.annotation.api.manager.domain.request.image;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import lombok.Data;

@Data
public class SomaticMutationsListReq extends BaseListSearch {

    private String caseId;
    private String polyphen;
    private String sift;
    private String vep;
    private String dnaChange;
}
