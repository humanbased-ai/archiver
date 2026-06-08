package com.wsi.annotation.api.manager.domain.request.cytomine;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import lombok.Data;

@Data
public class TagListReq extends BaseListSearch {
    private String name;
    private String position;
}
