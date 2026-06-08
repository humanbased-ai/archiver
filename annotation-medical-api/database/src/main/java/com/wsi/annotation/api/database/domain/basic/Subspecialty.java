package com.wsi.annotation.api.database.domain.basic;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 亚专科表 subspecialty
 * 
 * @author wxy
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(collection = "subspecialty")
public class Subspecialty extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    @ApiModelProperty("亚专科编号")
    @AutoIncKeyString(access = AutoIncKeyString.Access.DSU)
    private String subspecialtyNo;

    @ApiModelProperty("亚专科名称")
    private String subspecialtyName;

    @ApiModelProperty("亚专科英文名称")
    private String subspecialtyEnName;

    private Integer status;

}
