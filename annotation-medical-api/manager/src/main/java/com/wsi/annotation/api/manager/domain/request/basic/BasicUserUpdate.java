package com.wsi.annotation.api.manager.domain.request.basic;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class BasicUserUpdate extends BaseEntity {

    private String id;

    private String userName;

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
    //技能等级  0Junior, 1Senior, 2Expert
    private Integer skillLevel;
    //认证状态 0未认证 1已认证
    private String authStatus;
    //擅长亚专科id
    @Transient
    private List<String> subspecialtyIdList;
    //住址
    private String address;
    // 身份证号
    private String IdNumber;
    // 籍贯
    private String nativeAddress;

    private Integer isAllData;
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

    /**
     * 密码
     */
    private String password;

    /**
     * 盐加密
     */
    private String salt;

    /**
     * 帐号状态（0正常 1停用）
     */
    private String status;



    // 备注
    private String remark;


    private String language;

    private String codaId;

    private String codaToken;

    private List<String> roleIds;

}
