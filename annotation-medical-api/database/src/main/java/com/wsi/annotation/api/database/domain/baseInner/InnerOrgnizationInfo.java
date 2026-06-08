package com.wsi.annotation.api.database.domain.baseInner;


import com.alibaba.fastjson.annotation.JSONField;
import com.wsi.annotation.api.database.serializer.ObjectIdSerializer;
import org.bson.types.ObjectId;

public class InnerOrgnizationInfo {

    public ObjectId getForeignKeyId() {
        return foreignKeyId;
    }

    public void setForeignKeyId(ObjectId foreignKeyId) {
        this.foreignKeyId = foreignKeyId;
    }

    public String getOrgnizationName() {
        return orgnizationName;
    }

    public void setOrgnizationName(String orgnizationName) {
        this.orgnizationName = orgnizationName;
    }

    @JSONField(serializeUsing = ObjectIdSerializer.class, deserializeUsing = ObjectIdSerializer.class)
    private ObjectId foreignKeyId;

    private String orgnizationName;

}
