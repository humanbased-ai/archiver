package com.wsi.annotation.api.manager.service.system;

import com.wsi.annotation.api.manager.domain.request.system.RoleListReq;
import com.mongodb.QueryBuilder;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.database.dao.system.SysRoleDao;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.manager.domain.response.system.RoleListResp;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SysRoleService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private SysRoleDao sysRoleDao;

    public JqGridPage<RoleListResp> selectRoleList(RoleListReq role, Long userId) {
        JqGridPage<RoleListResp> roleResps = null;
        if (BasicUser.isAdmin(userId)) {
           // List<String> sortFields=new List<String>();
            Sort sort = Sort.by(new Sort.Order(Sort.Direction.ASC, "roleSort"));
            //}"roleSort");//.by(Sort.Direction.DESC, "createTime");
            QueryBuilder queryBuilder = new QueryBuilder();
            queryBuilder.and("delFlag").is(0);
            //动态拼接查询条件
            if (!StringUtils.isEmpty(role.getRoleName())) {
                Pattern pattern = Pattern.compile("^.*" + role.getRoleName() + ".*$", Pattern.CASE_INSENSITIVE);
                queryBuilder.and("roleName").regex(pattern);
            }

            if (role.getStatus() != null) {
                queryBuilder.and("status").is(role.getStatus());
            }

            if (role.getDataRoleScope() != null && role.getDataRoleScope() > 0) {
                queryBuilder.and("dataRoleScope").is(role.getDataRoleScope());
            }

            Query query = new BasicQuery(queryBuilder.get().toString());
            Integer count = Math.toIntExact(mongoTemplate.count(query, SysRole.class));


            query = query.skip((role.getCurrent() - 1) * role.getPageSize()).limit(role.getPageSize());

            query = query.with(sort);

            List<SysRole> roleList = mongoTemplate.find(query, SysRole.class);

            roleResps = new JqGridPage<>(roleList.stream().map(RoleListResp::new).collect(Collectors.toList()), count, role.getPageSize(), role.getCurrent());
        } else {

        }
        return roleResps;
    }

    public int insertRole(SysRole role) {
        int i = 0;
        SysRole model = mongoTemplate.insert(role);
        if (model != null) {
            i = 1;
        }
        return i;
    }

    public int updateRole(SysRole role) {
        int i = 0;
        SysRole model = mongoTemplate.save(role);
        if (model != null) {
            i = 1;
        }
        return i;
    }

    public int deleteRoleByIds(List<String> roleIds) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").in(roleIds);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        Update update = new Update();
        update.set("delFlag", 1);
        UpdateResult result = mongoTemplate.updateMulti(query, update, SysRole.class);
        return (int) result.getModifiedCount();
    }

    /**
     * 校验角色名称是否唯一
     *
     * @param role 角色信息
     * @return 结果
     */
    public String checkRoleUnique(SysRole role,Integer min) {
        Long count = sysRoleDao.countSysRolesByDelFlagAndRoleName(0, role.getRoleName());
        if (count > min) {
            return UserConstants.NOT_UNIQUE;
        }
        count = sysRoleDao.countSysRolesByDelFlagAndRoleKey(0, role.getRoleKey());
        if (count > min) {
            return UserConstants.NOT_UNIQUE;
        }
        return UserConstants.UNIQUE;
    }

    public SysRole selectRoleById(String id){
        return sysRoleDao.findById(id).get();
    }

    public int updateRoleStatus(String id,Integer status){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(new ObjectId(id));
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        Update update = new Update();
        update.set("status", status);
        UpdateResult result = mongoTemplate.updateMulti(query, update, SysRole.class);
        return (int) result.getModifiedCount();
    }


}
