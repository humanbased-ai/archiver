package com.wsi.annotation.api.database.domain.cytomine;

import com.mongodb.DBObject;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.Inner.InnerTag;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "user_annotation_log")
public class UserAnnotationLog extends BaseEntity {

    @Id
    private String id;
    private String annotation_id;
    private String user_id;
    private String wkt_location;
    private String undo_wkt_location;
    /**
     * 操作类型0新增，1编辑，2删除
     */
    private int opType;
    private boolean valid;
}
