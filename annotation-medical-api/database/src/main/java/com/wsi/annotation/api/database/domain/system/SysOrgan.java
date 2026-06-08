package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

/**
 * 器官表 sys_organ
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(value = "sys_organ")
public class SysOrgan extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    /** 器官ID */
    @AutoIncKeyString(access = AutoIncKeyString.Access.DOR)
    private String organNo;

    /** 器官名称 */
    private String organName;

    private Integer status;

    /** 数据集数量 **/
    private Integer datasetNum = 0;

    /** 上级类别ID **/
    private Long parentNo = 0l;
}
