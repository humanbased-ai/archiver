package com.wsi.annotation.api.manager.domain.request.cytomine;

import com.wsi.annotation.api.manager.domain.request.base.CollectionBaseReq;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImageInstanceSearchReq extends CollectionBaseReq {
    private String projectId;
}
