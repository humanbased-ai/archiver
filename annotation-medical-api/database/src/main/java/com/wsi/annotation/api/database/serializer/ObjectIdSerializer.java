package com.wsi.annotation.api.database.serializer;

import com.alibaba.fastjson.parser.DefaultJSONParser;
import com.alibaba.fastjson.parser.deserializer.ObjectDeserializer;
import com.alibaba.fastjson.serializer.JSONSerializer;
import com.alibaba.fastjson.serializer.ObjectSerializer;
import com.alibaba.fastjson.serializer.SerializeWriter;

import org.bson.types.ObjectId;

import java.io.IOException;
import java.lang.reflect.Type;

/**
 * 解决ObjectId 序列化后再反序列化回来值就变的问题，自定义序列化
 */
public class ObjectIdSerializer implements ObjectSerializer, ObjectDeserializer {

    @Override
    public void write(JSONSerializer serializer, Object object, Object fieldName, Type fieldType, int features) throws IOException {
        SerializeWriter out = serializer.out;

        if (object instanceof ObjectId) {
            ObjectId objectId = (ObjectId) object;
            out.writeString(objectId.toString());
            return;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T deserialze(DefaultJSONParser parser, Type type, Object fieldName) {
        return (T) new ObjectId(parser.parseObject(String.class));
    }

    @Override
    public int getFastMatchToken() {
        return 0;
    }
}
