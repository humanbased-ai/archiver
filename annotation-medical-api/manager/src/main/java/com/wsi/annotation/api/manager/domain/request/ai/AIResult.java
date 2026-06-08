package com.wsi.annotation.api.manager.domain.request.ai;

import com.wsi.annotation.api.common.core.domain.BaseEntity;
import com.wsi.annotation.api.manager.domain.request.ai.inner.InnerKeyValue;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "ai_result")
public class AIResult extends BaseEntity {

    @Id
    private String id;

    private String imageId;

    private String taskId;

    private Integer isShow;
    private String tagId;

    private String tagName;

    private List<InnerKeyValue> result;

    private List<String> gradient;

    private Object data;

    /**
     * 结果类型
     * 1：综合的结果
     * 2：切片上展示的结果heatmap ponit
     * 3: 用户认为的结果
     */
    private Integer resultType;
}
