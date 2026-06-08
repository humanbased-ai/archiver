package com.wsi.annotation.api.database.domain.basic;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.ObjectUtils;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;

/**`
 * 用户对象 sys_user
 *
 * @author early
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "basic_user")
public class BasicUser extends BaseEntity {
    private static final long serialVersionUID = 1L;

    @Id
    private String id;
    /**
     * 用户ID
     */
    @AutoIncKey
    private Long userId = 0L;

    /**
     * 用户账号，默认和手机号相同
     */
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
    private String authMethod = "KYC";
    //认证状态 0未认证 1已认证
    private String authStatus="1";
    //擅长亚专科id
    @Transient
    private List<String> subspecialtyIdList;
    //擅长亚专科
    private List<Subspecialty> subspecialtyList;
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
    private String status = "0" ;

    /**
     * 最后登陆IP
     */
    private String loginIp;

    /**
     * 最后登陆时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss",timezone = "GMT+8")
    private Date loginDate;

    /**
     * 部门ID
     */
    private Long belongDeptId;

    /**
     * 公司ID
     */
    private String belongCompanyId;

    /**
     * 角色组
     */
    private List<String> roleIds;


    public String isCustomized;

    /** 菜单组 */
    private List<Long> menuIds;

    /** 公司组（数据权限） (ObjectId)*/
    private List<String> companyOids;

    /** 部门组（数据权限） (ObjectId)*/
    private List<Long> deptOids;

    /**
     * 角色名称列表不存在数据
     */
    @Transient
    private List<String> rolesName;

    /**
     * 菜单组
     */
    @Transient
    private List<String> menusName;
    /**
     * 公司组
     */
    @Transient
    private List<String> companysName;
    /**
     * 角色名称列表不存在数据
     */
    @Transient
    private List<String> deptsName;

    /**
     * 所属部门
     */
    @Transient
    private InnerDepartmentInfo belongDept;

    /**
     * 所属公司
     */
    @Transient
    private InnerCompanyInfo belongCompany;


    // 备注
    private String remark;


    private String language;

    private String codaId;

    private String codaToken;

    private Boolean isAdmin = false;

    private Boolean isProtocol = false;

    public boolean isAdmin() {
//        if (ObjectUtils.isNotEmpty(this.getIsAdmin())){
//            return this.getIsAdmin();
//        }else{
//            return false;
//        }
        return isAdmin(this.userId);
    }

    public static boolean isAdmin(Long userId) {
        return userId != null && 1L == userId;
    }

}
