package com.wsi.annotation.api.ims.domain.request.basic;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SysUserSearch extends BaseListSearch {
    /**
     * 用户账号，默认和手机号相同
     */
    private String userName;
    //职员姓名，不能重复
    private String name;
    //昵称
    private String nickName;
    // 身份证号
    private String IdNumber;
    /**
     * 手机号码
     */
    private String phonenumber;
    /**
     * 用户性别
     */
    private String sex;
    /**
     * 所属部门
     */
    private Integer deptId;

    /**
     * 所属公司
     */
    private String companyId;

    private String status;
}
