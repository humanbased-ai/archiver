package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

/**
 * 登录信息表 sys_login_info
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(value = "sys_login_info")
public class SysLoginInfo extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    private String token;

    private String loginUserJson;

    private Date expireTime;
}
