package com.wsi.annotation.api.manager.domain.response.base;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CollectionBaseResp<T> {
    private List<T> collection;
    private Long size;
    private Long perPage = 10L;
    private Long offset = 0L;
    private Long totalPages;

    public Long getPerPage() {
        if (perPage > size) {
            perPage = size;
        }
        return perPage;
    }

    public Long getTotalPages() {
        if (Math.floorMod(size, getPerPage()) == 0)
            return size / getPerPage();
        else
            return size / getPerPage() + 1;
    }


}
