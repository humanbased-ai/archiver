package com.wsi.annotation.api.manager.domain.response.base;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Data
public class BasicUserResp {
    private String id;
    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 用户账号，默认和手机号相同
     */
//    private String userName;

    private String username;

    //职员姓名，不能重复
    private String name;
    //职员姓名拼音
    private String nameSpell;
    //职员姓名拼音首字母
    private String nameSpellFirst;
    //昵称
    private String nickName;
    //昵称拼音
    private String nickNameSpell;
    //昵称拼音首字母
    private String nickNameSpellFirst;
    //类型  0医学生  1医生
    private Integer userType;
    //机构名称
    private String institution;
    //技能等级
    private Integer skillLevel;
    //认证状态 0未认证 1已认证
    private String authStatus;
    //擅长亚专科
    private List<Subspecialty> subspecialtyList;
    //住址
    private String address;
    // 身份证号
    private String IdNumber;
    // 籍贯
    private String nativeAddress;
    /**
     * 用户邮箱
     */
    private String email;

    /**
     * 手机号码
     */
    private String phonenumber;

    /**
     * 用户性别
     */
    private String sex;

    /**
     * 用户头像
     */
    private String avatar;
    // 备注
    private String remark;

    private String status;

    private Date createTime;

    private Boolean admin;

    private String language;

    private BigDecimal ownership;

}
