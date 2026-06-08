package com.wsi.annotation.api.database.domain.baseInner;

import com.alibaba.fastjson.annotation.JSONField;
import com.wsi.annotation.api.database.serializer.ObjectIdSerializer;
import io.swagger.annotations.ApiModel;
import org.bson.types.ObjectId;
@ApiModel
public class InnerUserInfo {

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ObjectId getForeignKeyId() {
        return foreignKeyId;
    }

    public void setForeignKeyId(ObjectId foreignKeyId) {
        this.foreignKeyId = foreignKeyId;
    }

    public ObjectId getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(ObjectId departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    @JSONField(serializeUsing = ObjectIdSerializer.class, deserializeUsing = ObjectIdSerializer.class)
    private ObjectId foreignKeyId;

    private String name;

    @JSONField(serializeUsing = ObjectIdSerializer.class, deserializeUsing = ObjectIdSerializer.class)
    private ObjectId departmentId;

    private String departmentName;
}
