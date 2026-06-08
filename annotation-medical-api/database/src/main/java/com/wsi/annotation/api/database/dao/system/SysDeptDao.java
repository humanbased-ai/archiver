package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.BasicDept;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysDeptDao extends MongoRepository<BasicDept,String> {
    List<BasicDept> getBasicDeptsByAncestorsContaining(String deptId);

    Long countBasicDeptsByDeptNameAndDelFlagAndCompanyId(String deptName, int flag, ObjectId companyId);

    List<BasicDept> getBasicDeptsByDelFlagAndCompanyId(int flag, ObjectId companyId);

    BasicDept getBasicDeptByIdAndDelFlag(String id, int flag);

    BasicDept getBasicDeptByDeptId(Long id);
}
