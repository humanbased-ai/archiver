package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel
@Document(value = "sys_position")
public class SysPosition extends BaseEntity {
    @Id
    private String id;

    private String companyId;
    private String companyName;

    private String deptId;
    private String deptName;

    private String positionName;
    private Integer status;
}
