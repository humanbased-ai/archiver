package com.wsi.annotation.api.ims.service.system;

import com.wsi.annotation.api.ims.service.BaseService;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.domain.TreeSelect;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.dao.system.SysDeptDao;
import com.wsi.annotation.api.database.dao.system.SysCompanyDao;
import com.wsi.annotation.api.database.daoextend.system.SysCompanyExtend;
import com.wsi.annotation.api.database.daoextend.system.SysDeptExtend;
import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.ims.domain.request.system.DeptListReq;
import com.wsi.annotation.api.ims.domain.response.system.DeptListResp;
import com.mongodb.QueryBuilder;
import com.mongodb.client.result.UpdateResult;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class DeptService extends BaseService {

    @Autowired
    private SysDeptExtend sysDeptExtend;
    @Autowired
    private SysDeptDao sysDeptDao;
    @Autowired
    private SysCompanyDao sysCompanyDao;
    @Autowired
    private SysCompanyExtend sysCompanyExtend;
//    public Query getListQuery(DeptListReq deptListReq) {
//        QueryBuilder queryBuilder = new QueryBuilder();
//        if (deptListReq.getDeptName() != null) {
//            Pattern pattern = Pattern.compile("^.*" + deptListReq.getDeptName() + ".*$", Pattern.CASE_INSENSITIVE);
//            queryBuilder.and("deptName").regex(pattern);
//        }
//        if (deptListReq.getCompanyName() != null) {
//            Pattern pattern = Pattern.compile("^.*" + deptListReq.getCompanyName() + ".*$", Pattern.CASE_INSENSITIVE);
//            queryBuilder.and("companyName").regex(pattern);
//        }
//        if (deptListReq.getStatus() != null) {
//            queryBuilder.and("phone").is(deptListReq.getStatus());
//        }
//        Query query = getQuery(queryBuilder, 0, deptListReq.getDataScope());
//        return query;
//    }

    public List<BasicDept> selectDeptList(DeptListReq deptListReq) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("delFlag").is(0);

        if (deptListReq.getDeptName() != null) {
            Pattern pattern = Pattern.compile("^.*" + deptListReq.getDeptName() + ".*$", Pattern.CASE_INSENSITIVE);
            queryBuilder.and("deptName").regex(pattern);
        }
        if (deptListReq.getCompanyId() != null) {
            queryBuilder.and("companyId").is(new ObjectId(deptListReq.getCompanyId()));
        }
        if (deptListReq.getStatus() != null) {
            queryBuilder.and("status").is(deptListReq.getStatus());
        }
        if (deptListReq.getCompanyIds() != null && deptListReq.getCompanyIds().size() > 0) {
            queryBuilder.and("companyId").in(StringUtils.toObjectId(deptListReq.getCompanyIds()));
        }

        //Query query = getQuery(queryBuilder, 0, deptListReq.getDataScope());
        Query query = new BasicQuery(queryBuilder.get().toString());


        query = query.with(sort);
//
//        query = query.skip((deptListReq.getCurrent() - 1) * deptListReq.getPageSize()).limit(deptListReq.getPageSize());

        return sysDeptExtend.getList(query);

//        List<DeptListResp> deptListResps = new ArrayList<>();
//        for (BasicDept basicDept : deptList) {
//            DeptListResp deptListResp = new DeptListResp();
//            deptListResp.setUpdateUser(basicDept.getUpdateUser().getName());
//            BeanUtils.copyProperties(basicDept, deptListResp);
//            deptListResps.add(deptListResp);
//        }
//
//        JqGridPage<DeptListResp> listRespJqGridPage = new JqGridPage<>(
//                deptListResps,
//                (int) listCount,
//                deptListReq.getPageSize(),
//                deptListReq.getCurrent()
//        );

        // return listRespJqGridPage;
    }

    /**
     * 构建前端所需要下拉树结构
     *
     * @param depts 菜单列表
     * @return 下拉树结构列表
     */
    public List<DeptListResp> buildDeptTreeList(List<BasicDept> depts) {
        List<DeptListResp> resps = new ArrayList<>();
        DeptListResp resp = new DeptListResp();
        resp.setDeptName("正合");
        resp.setNodeType("root");
        resp.setChildren(new ArrayList<>());
        List<String> companyIds = depts.stream().map(x -> x.getCompanyId().toString()).collect(Collectors.toList());
        List<SysCompany> sysCompanyList = sysCompanyDao.getSysCompaniesByIdIn(companyIds);
        List<DeptListResp> companys = new ArrayList<>();
        for (SysCompany sysCompany : sysCompanyList) {
            DeptListResp company = new DeptListResp();
            company.setId(sysCompany.getId());
            company.setDeptName(sysCompany.getCompanyName());
            company.setNodeType("company");
            company.setStatus(null);
            List<BasicDept> deptTrees = buildDeptTree(depts.stream().filter(x -> x.getCompanyId().toString().equals(sysCompany.getId())).collect(Collectors.toList()));
            company.setChildren(deptTrees.stream().map(DeptListResp::new).collect(Collectors.toList()));
            companys.add(company);
        }
        resp.setChildren(companys);
        resps.add(resp);
        return companys;
    }

    /**
     * 构建前端所需要下拉树结构
     *
     * @param depts 菜单列表
     * @return 下拉树结构列表
     */
    public List<TreeSelect> buildDeptTreeSelect(List<BasicDept> depts) {
        List<String> companyIds = depts.stream().map(x -> x.getCompanyId().toString()).distinct().collect(Collectors.toList());
        if (companyIds.size() > 1) {
            List<SysCompany> sysCompanyList = sysCompanyDao.getSysCompaniesByIdIn(companyIds);
            List<TreeSelect> companys = new ArrayList<>();
            for (SysCompany sysCompany : sysCompanyList) {
                TreeSelect company = new TreeSelect();
                company.setValue(sysCompany.getIncId() + 100000);
                company.setTitle(sysCompany.getCompanyName());
                company.setSelectable(false);
                company.setCheckable(false);
                List<BasicDept> deptTrees = buildDeptTree(depts.stream().filter(x -> x.getCompanyId().toString().equals(sysCompany.getId())).collect(Collectors.toList()));
                company.setChildren(deptTrees.stream().map(TreeSelect::new).collect(Collectors.toList()));
                companys.add(company);
            }
            return companys;
        } else {
            List<BasicDept> deptTrees = buildDeptTree(depts);
            return deptTrees.stream().map(TreeSelect::new).collect(Collectors.toList());
        }
    }

    /**
     * 构建前端所需要树结构
     *
     * @param depts 菜单列表
     * @return 树结构列表
     */
    public List<BasicDept> buildDeptTree(List<BasicDept> depts) {
        List<BasicDept> returnList = new ArrayList<BasicDept>();
        List<Long> tempList = new ArrayList<Long>();
        for (BasicDept dept : depts) {
            tempList.add(dept.getDeptId());
        }
        for (Iterator<BasicDept> iterator = depts.iterator(); iterator.hasNext(); ) {
            BasicDept dept = iterator.next();
            // 如果是顶级节点, 遍历该父节点的所有子节点
            if (!tempList.contains(dept.getParentId())) {
                dept.setParentId(null);
                recursionFn(depts, dept);
                returnList.add(dept);
            }
        }
        if (returnList.isEmpty()) {
            returnList = depts;
        }
        return returnList;
    }

    /**
     * 递归列表
     *
     * @param list
     * @param t
     */
    private void recursionFn(List<BasicDept> list, BasicDept t) {
        // 得到子节点列表
        List<BasicDept> childList = getChildList(list, t);
        if (childList.size() > 0) {
            t.setChildren(childList);
        } else {
            t.setChildren(null);
        }
        for (BasicDept tChild : childList) {
            if (hasChild(list, tChild)) {
                recursionFn(list, tChild);
            }
        }
    }

    /**
     * 递归列表
     *
     * @param list
     * @param t
     */
    public List<BasicDept> getAllChildList(List<BasicDept> list, BasicDept t) {
        // 得到子节点列表
        List<BasicDept> childList = getChildList(list, t);
        for (BasicDept tChild : childList) {
            if (hasChild(list, tChild)) {
                childList.addAll(getAllChildList(list, tChild));
            }
        }
        return childList;
    }


    /**
     * 判断是否有子节点
     */
    private boolean hasChild(List<BasicDept> list, BasicDept t) {
        return getChildList(list, t).size() > 0 ? true : false;
    }

    /**
     * 得到子节点列表
     */
    private List<BasicDept> getChildList(List<BasicDept> list, BasicDept t) {
        List<BasicDept> tlist = new ArrayList<BasicDept>();
        Iterator<BasicDept> it = list.iterator();
        while (it.hasNext()) {
            BasicDept n = it.next();
            if (n.getParentId() != null && n.getParentId().longValue() == t.getDeptId().longValue()) {
                n.setParentName(t.getDeptName());
                tlist.add(n);
            }
        }
        return tlist;
    }


    public String checkUnique(BasicDept dept,Integer min) {
        Long count = sysDeptDao.countBasicDeptsByDeptNameAndDelFlagAndCompanyId(dept.getDeptName(), 0, dept.getCompanyId());
        if (count > min) {
            return UserConstants.NOT_UNIQUE;
        }
        return UserConstants.UNIQUE;
    }

    public BasicDept add(BasicDept dept) {
        SysCompany sysCompany = sysCompanyDao.getSysCompanyById(dept.getCompanyId().toString());
        dept.setCompanyName(sysCompany.getCompanyName());
        dept.setStatus(0);
        return sysDeptDao.save(dept);
    }

    public BasicDept update(BasicDept dept) {
        SysCompany sysCompany = sysCompanyDao.getSysCompanyById(dept.getCompanyId().toString());
        dept.setCompanyName(sysCompany.getCompanyName());
        BasicDept sourceDept = sysDeptDao.findById(dept.getId()).get();
        if (sourceDept == null) {
            throw new HTTPDataException(400, "数据不存在不能编辑");
        }
        List<BasicDept> basicDepts = sysDeptDao.getBasicDeptsByDelFlagAndCompanyId(0, dept.getCompanyId());
        List<BasicDept> allChilds = getAllChildList(basicDepts, sourceDept);
        allChilds.add(sourceDept);
        if (allChilds.stream().anyMatch(x -> x.getDeptId().equals(dept.getParentId()))) {
            throw new HTTPDataException(400, "上级不能选择下级或自己");
        }

        return sysDeptDao.save(dept);
    }

    public long del(String id) {
        if (id != null) {
            BasicDept sourceDept = sysDeptDao.findById(id).get();
            if (sourceDept == null) {
                throw new HTTPDataException(400, "数据不存在不能删除");
            }
            List<BasicDept> basicDepts = sysDeptDao.getBasicDeptsByDelFlagAndCompanyId(0, sourceDept.getCompanyId());
            List<BasicDept> allChilds = getAllChildList(basicDepts, sourceDept);
            if (allChilds.size() > 0) {
                throw new HTTPDataException(400, "存在下级部门不能删除");
            }
            QueryBuilder queryBuilder = new QueryBuilder();
            queryBuilder.and("_id").is(id);
            BasicQuery query = new BasicQuery(queryBuilder.get().toString());
            Update update = new Update();
            update.set("delFlag", 1);
            UpdateResult result = sysDeptExtend.update(query, update);
            long count = result.getMatchedCount();
            return count;
        }
        return 0;
    }

    public long changeDeptStatus(String id) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(id);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        BasicDept basicDept = sysDeptDao.getBasicDeptByIdAndDelFlag(id, 0);

        Update update = new Update();
        if (basicDept.getStatus() == 1) {
            update.set("status", 0);
        } else {
            update.set("status", 1);
        }

        UpdateResult result = sysDeptExtend.update(query, update);
        return result.getModifiedCount();
    }

    public BasicDept getDeptDetail(String id) {
        return sysDeptDao.getBasicDeptByIdAndDelFlag(id, 0);
    }




}
