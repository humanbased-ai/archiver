package com.wsi.annotation.api.database.domain.basic;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

/**
 * 所有权表 case_ownership
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(value = "case_ownership")
public class CaseOwnership extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    @ApiModelProperty("所有权编号")
    @AutoIncKeyString(access = AutoIncKeyString.Access.CONO)
    private String shipNo;

    @ApiModelProperty("标注用户id")
    private String userId;


    @ApiModelProperty("案例id")
    private String caseId;

    @ApiModelProperty("所有权")
    private BigDecimal ownership = new BigDecimal(0);

    @ApiModelProperty("类型")
    private String type;

}
