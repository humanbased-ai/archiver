package com.wsi.annotation.api.database.daoextend.system;

import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.mongodb.QueryBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Pattern;

@Component
public class SysMenuExtend {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<SysMenu> getList(Query query) {

        Sort sort = Sort.by(Sort.Direction.ASC, "orderNum");
        query = query.with(sort);
        //计算总数
        //long total = mongoTemplate.count(query, SysMenu.class);
        List<SysMenu> menusList = mongoTemplate.find(query, SysMenu.class);
//        //查询结果集条件
//        BasicDBObject fieldsObject = new BasicDBObject();
//        //id默认有值，可不指定
//        fieldsObject.append("id", 1)  //1查询，返回数据中有值；0不查询，无值
//                .append("name", 1);
//        query = new BasicQuery(queryBuilder.get().toString(), fieldsObject.toJson());
//
//        //查询结果集
//        List<Student> studentList = mongoTemplate.find(query.with(pageable), Student.class);
//        Page<Student> studentPage = new PageImpl(studentList, pageable, total);
        return menusList;
    }

    public List<SysMenu> getListNoAdmin(SysMenu menu, Long userId) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        QueryBuilder queryBuilder = new QueryBuilder();

        //动态拼接查询条件
        if (!StringUtils.isEmpty(menu.getMenuName())) {
            Pattern pattern = Pattern.compile("^.*" + menu.getMenuName() + ".*$", Pattern.CASE_INSENSITIVE);
            queryBuilder.and("menuName").regex(pattern);
        }

        if (menu.getVisible() != null) {
            queryBuilder.and("visible").is(menu.getVisible());
        }
        if (menu.getStatus() != null) {
            queryBuilder.and("status").is(menu.getStatus());
        }

        Query query = new BasicQuery(queryBuilder.get().toString());
        //计算总数
        //long total = mongoTemplate.count(query, SysMenu.class);
        List<SysMenu> menusList = mongoTemplate.find(query, SysMenu.class);
//        //查询结果集条件
//        BasicDBObject fieldsObject = new BasicDBObject();
//        //id默认有值，可不指定
//        fieldsObject.append("id", 1)  //1查询，返回数据中有值；0不查询，无值
//                .append("name", 1);
//        query = new BasicQuery(queryBuilder.get().toString(), fieldsObject.toJson());
//
//        //查询结果集
//        List<Student> studentList = mongoTemplate.find(query.with(pageable), Student.class);
//        Page<Student> studentPage = new PageImpl(studentList, pageable, total);
        return menusList;
    }

    public SysMenu getMenuById(String id) {
        return mongoTemplate.findById(id, SysMenu.class);
    }
}
