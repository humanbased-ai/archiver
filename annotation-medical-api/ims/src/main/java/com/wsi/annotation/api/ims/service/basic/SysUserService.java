package com.wsi.annotation.api.ims.service.basic;

import com.wsi.annotation.api.ims.service.BaseService;
import com.wsi.annotation.api.common.constant.DataScopeConstants;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.utils.PinyinUtils;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.dao.basics.SysUserDao;
import com.wsi.annotation.api.database.dao.system.SysCompanyDao;
import com.wsi.annotation.api.database.dao.system.SysDeptDao;
import com.wsi.annotation.api.database.dao.system.SysMenuDao;
import com.wsi.annotation.api.database.dao.system.SysRoleDao;
import com.wsi.annotation.api.database.daoextend.basics.SysUserExtend;
import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.ims.domain.request.basic.SysUserSearch;
import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.QueryBuilder;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.ims.service.system.DeptService;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SysUserService extends BaseService {

    @Autowired
    private SysUserDao sysUserDao;

    @Autowired
    private SysUserExtend sysUserExtend;


    @Autowired
    private SysCompanyDao sysCompanyDao;

    @Autowired
    private SysDeptDao sysDeptDao;

    @Autowired
    private SysRoleDao sysRoleDao;

    @Autowired
    private SysMenuDao sysMenuDao;

    @Autowired
    private DeptService deptService;


    public void initUser() {
        BasicUser user = sysUserDao.getSysUserByUserName("admin");
        if (user == null) {
            user = new BasicUser();
            user.setUserName("admin");
            user.setPassword(SecurityUtils.encryptPassword("123456"));
            sysUserDao.save(user);
        }
    }

    /**
     * 查重职员
     *
     * @param basicUser
     * @return
     */
    public String checkUnique(BasicUser basicUser) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder = getBaseCondition(queryBuilder);
        queryBuilder.and("userName").is(basicUser.getUserName());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        BasicUser user = sysUserExtend.checkUnique(query);
        if (user != null && !user.getId().equals(basicUser.getId())) {
            return UserConstants.NOT_UNIQUE;
        }
        return UserConstants.UNIQUE;
    }

    public Query getQueryList(SysUserSearch sysUserSearch) {
        QueryBuilder queryBuilder = new QueryBuilder();
        BasicDBObject dbObject = new BasicDBObject();
        BasicDBList basicDBList = new BasicDBList();
        if (sysUserSearch.getUserName() != null) {
            queryBuilder.and("userName").is(sysUserSearch.getUserName());
        }
        if (StringUtils.isNotEmpty(sysUserSearch.getName())) {
            Pattern pattern = Pattern.compile("^.*" + sysUserSearch.getName().trim() + ".*$", Pattern.CASE_INSENSITIVE);
            basicDBList.add(new BasicDBObject("name", pattern));
            basicDBList.add(new BasicDBObject("nameSpell", pattern));
            basicDBList.add(new BasicDBObject("nameSpellFirst", pattern));
            dbObject.put("$or", basicDBList);
            queryBuilder.and(dbObject);
        }
        if (sysUserSearch.getNickName() != null) {
            Pattern pattern = Pattern.compile("^.*" + sysUserSearch.getNickName().trim() + ".*$", Pattern.CASE_INSENSITIVE);
            basicDBList.add(new BasicDBObject("nickName", pattern));
            basicDBList.add(new BasicDBObject("nickNameSpell", pattern));
            basicDBList.add(new BasicDBObject("nickNameSpellFirst", pattern));
            dbObject.put("$or", basicDBList);
            queryBuilder.and(dbObject);
        }
        if (StringUtils.isNotEmpty(sysUserSearch.getIdNumber())) {
            queryBuilder.and("IdNumber").is(sysUserSearch.getIdNumber());
        }
        if (StringUtils.isNotEmpty(sysUserSearch.getPhonenumber())) {
            queryBuilder.and("phonenumber").is(sysUserSearch.getPhonenumber());
        }
        if (sysUserSearch.getSex() != null) {
            queryBuilder.and("sex").is(sysUserSearch.getSex());
        }
        if (sysUserSearch.getDeptId() != null) {
            queryBuilder.and("belongDeptId").is(sysUserSearch.getDeptId());
        }
        if (sysUserSearch.getCompanyId() != null) {
            queryBuilder.and("belongCompanyId").is(sysUserSearch.getCompanyId());
        }
        if (sysUserSearch.getStatus() != null) {
            queryBuilder.and("status").is(sysUserSearch.getStatus());
        }

        Query query = getQuery(queryBuilder, 0, sysUserSearch.getDataScope());
        return query;
    }

    /**
     * 添加职员
     *
     * @param basicUser
     * @return
     */
    public BasicUser addUser(BasicUser basicUser) {
        basicUser.setPassword(SecurityUtils.encryptPassword(basicUser.getPassword()));

//        basicUser.setNameSpell(PinyinUtils.getFullSpell(basicUser.getName()));
//        basicUser.setNameSpellFirst(PinyinUtils.getFirstSpell(basicUser.getName()));

//        basicUser.setNickNameSpell(PinyinUtils.getFullSpell(basicUser.getNickName()));
//        basicUser.setNameSpellFirst(PinyinUtils.getFirstSpell(basicUser.getNickName()));

        if ("0".equals(basicUser.getIsCustomized())) {
            this.getManageDepts(basicUser);
        }
        BasicUser user = sysUserDao.save(basicUser);
        return user;
    }

    public JqGridPage<BasicUser> list(SysUserSearch sysUserSearch) {
        Query query = getQueryList(sysUserSearch);
        query.with(Sort.by(Sort.Direction.DESC, "_id")).skip((sysUserSearch.getCurrent() - 1) * sysUserSearch.getPageSize()).limit(sysUserSearch.getPageSize());
        List<BasicUser> list = sysUserExtend.list(query);
        List<SysRole> roles = sysRoleDao.findAll();
        List<BasicDept> depts = sysDeptDao.findAll();
        List<SysCompany> companies = sysCompanyDao.findAll();
        List<SysMenu> menus = sysMenuDao.findAll();
        list.forEach(item -> {
            List<BasicDept> deptStream = depts.stream().filter(x -> x.getDeptId().equals(item.getBelongDeptId())).collect(Collectors.toList());
            if (deptStream.size() > 0) {
                item.setBelongDept(new InnerDepartmentInfo(deptStream.get(0)));
            }
            List<SysCompany> companyStream = companies.stream().filter(x -> x.getId().equals(item.getBelongCompanyId())).collect(Collectors.toList());
            if (companyStream.size() > 0) {
                item.setBelongCompany(new InnerCompanyInfo(companyStream.get(0)));
            }
            if (item.getMenuIds() != null && item.getMenuIds().size() > 0) {
                item.setMenusName(menus.stream().filter(x -> item.getMenuIds().contains(x.getMenuId())).map(x -> x.getMenuName()).collect(Collectors.toList()));
            }
            if (item.getRoleIds() != null && item.getRoleIds().size() > 0)
                item.setRolesName(roles.stream().filter(x -> item.getRoleIds().contains(x.getId())).map(x -> x.getRoleName()).collect(Collectors.toList()));
            if (item.getCompanyOids() != null && item.getCompanyOids().size() > 0)
                item.setCompanysName(companies.stream().filter(x -> item.getCompanyOids().contains(x.getId())).map(x -> x.getCompanyName()).collect(Collectors.toList()));
            if (item.getDeptOids() != null && item.getDeptOids().size() > 0)
                item.setDeptsName(depts.stream().filter(x -> item.getDeptOids().contains(x.getDeptId())).map(x -> x.getDeptName()).collect(Collectors.toList()));
        });
        Long sysUseCount = count(sysUserSearch);
        JqGridPage<BasicUser> respJqGridPage = new JqGridPage<>(
                list, new Long(sysUseCount).intValue(),
                sysUserSearch.getPageSize(),
                sysUserSearch.getCurrent());
        return respJqGridPage;

    }


    public Long count(SysUserSearch sysUserSearch) {
        Query query = getQueryList(sysUserSearch);
        return sysUserExtend.count(query);
    }

    public Integer update(BasicUser basicUser) {

//        basicUser.setNameSpell(PinyinUtils.getFullSpell(basicUser.getName()));
//        basicUser.setNameSpellFirst(PinyinUtils.getFirstSpell(basicUser.getName()));
//
//        basicUser.setNickNameSpell(PinyinUtils.getFullSpell(basicUser.getNickName()));
//        basicUser.setNameSpellFirst(PinyinUtils.getFirstSpell(basicUser.getNickName()));
        if ("0".equals(basicUser.getIsCustomized())) {
            this.getManageDepts(basicUser);
        }
        BasicUser user = sysUserDao.save(basicUser);
        if (user != null) {
            return 1;
        }
        return 0;
    }

    public Long del(List<String> ids) {
        QueryBuilder queryBuilder = new QueryBuilder();
        Update update = new Update();
        update.set("delFlag", 1);
        queryBuilder.and("_id").in(ids);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        UpdateResult result = sysUserExtend.del(query, update);
        long count = result.getMatchedCount();
        return count;
    }


    public Long updatePsw( String id,String psw) {
        QueryBuilder queryBuilder = new QueryBuilder();
        Update update = new Update();
        update.set("password", SecurityUtils.encryptPassword(psw));
        queryBuilder.and("_id").is(id);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        UpdateResult result = sysUserExtend.del(query, update);
        long count = result.getMatchedCount();
        return count;
    }

    public Long changeStatus( String id,String status) {
        QueryBuilder queryBuilder = new QueryBuilder();
        Update update = new Update();
        update.set("status", status);
        queryBuilder.and("_id").is(id);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        UpdateResult result = sysUserExtend.del(query, update);
        long count = result.getMatchedCount();
        return count;
    }

    public InnerCompanyInfo getInnerCompanyInfo(String companyId) {
        SysCompany company = sysCompanyDao.findById(companyId).get();
        return new InnerCompanyInfo(company);
    }

    public InnerDepartmentInfo getInnerDepartmentInfo(Long deptId) {
        BasicDept dept = sysDeptDao.getBasicDeptByDeptId(deptId);
        return new InnerDepartmentInfo(dept);
    }

    public BasicUser getUserById(String id){
        return sysUserExtend.findById(id);
    }

    public void getManageDepts(BasicUser basicUser) {
        /** 菜单组 */
        List<Long> menuIds = new ArrayList<>();

        /** 公司组（数据权限） (ObjectId)*/
        List<String> companyOids = new ArrayList<>();

        /** 部门组（数据权限） (ObjectId)*/
        List<Long> deptOids = new ArrayList<>();
        List<BasicDept> depts = sysDeptDao.findAll();
        List<SysCompany> companies = sysCompanyDao.findAll();
        List<SysRole> roles = sysRoleDao.getSysRolesByIdIn(basicUser.getRoleIds());
        for (SysRole role : roles) {
            menuIds.addAll(role.getMenuIds());
            Integer dataScope = role.getDataRoleScope();
            if (DataScopeConstants.DATA_SCOPE_ALL.equals(dataScope)) {
                companyOids.addAll(companies.stream().filter(x -> x.getDelFlag() == 0).map(x -> x.getId()).collect(Collectors.toList()));
                deptOids.addAll(depts.stream().filter(x -> x.getDelFlag() == 0).map(x -> x.getDeptId()).collect(Collectors.toList()));
                break;
            } else if (DataScopeConstants.DATA_SCOPE_COMPANY.equals(dataScope)) {
                companyOids.addAll(role.getCompanyOids());
                deptOids.addAll(depts.stream().filter(x -> x.getDelFlag() == 0 && role.getCompanyOids().contains(x.getCompanyId().toString())).map(x -> x.getDeptId()).collect(Collectors.toList()));
            } else if (DataScopeConstants.DATA_SCOPE_DEPT_AND_CHILD.equals(dataScope)) {
                companyOids.add(basicUser.getBelongCompanyId());
                Optional<BasicDept> dept= depts.stream().filter(x->basicUser.getBelongDeptId().equals(x.getDeptId())).findFirst();
                if(dept.isPresent()) {
                    deptOids.addAll(deptService.getAllChildList(depts.stream().filter(x -> x.getDelFlag() == 0).collect(Collectors.toList()),dept.get()).stream().map(x->x.getDeptId()).collect(Collectors.toList()));
                }
            } else if (DataScopeConstants.DATA_SCOPE_DEPT.equals(dataScope)) {
                companyOids.add(basicUser.getBelongCompanyId());
                deptOids.add(basicUser.getBelongDeptId());
            } else if (DataScopeConstants.DATA_SCOPE_CUSTOM.equals(dataScope)) {
                companyOids.addAll(role.getCompanyOids());
                deptOids.addAll(role.getDeptOids());
            }
        }
        basicUser.setMenuIds(menuIds.stream().distinct().collect(Collectors.toList()));
        basicUser.setCompanyOids(companyOids.stream().distinct().collect(Collectors.toList()));
        basicUser.setDeptOids(deptOids.stream().distinct().collect(Collectors.toList()));
    }
}
