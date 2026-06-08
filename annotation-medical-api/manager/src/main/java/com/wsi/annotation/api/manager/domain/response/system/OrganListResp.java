package com.wsi.annotation.api.manager.domain.response.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import lombok.Data;
import org.springframework.data.annotation.Id;

import java.util.Date;
import java.util.List;

@Data
public class OrganListResp {
    private String id;

    private Long incId;

    private String organName;

    private Integer datasetNum = 0;

    private Long parentId = 0l;

    private List<String> tags;
}
