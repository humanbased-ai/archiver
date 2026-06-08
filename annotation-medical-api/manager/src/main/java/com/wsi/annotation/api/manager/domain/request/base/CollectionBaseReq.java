package com.wsi.annotation.api.manager.domain.request.base;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionBaseReq {
    private Integer max;
    private Integer offset;
}
