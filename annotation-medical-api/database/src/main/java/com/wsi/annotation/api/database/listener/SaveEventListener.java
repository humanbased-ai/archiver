package com.wsi.annotation.api.database.listener;

import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import com.wsi.annotation.api.database.annotation.*;
import com.wsi.annotation.api.database.domain.SeqInfo;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;

import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeSaveEvent;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import org.springframework.util.ReflectionUtils;

@Component
public class SaveEventListener extends AbstractMongoEventListener<Object> {

    @Autowired
    private MongoTemplate mongo;

    @Override
    public void onBeforeConvert(BeforeConvertEvent<Object> event) {
        Object source = event.getSource();
        if (source != null) {
            ReflectionUtils.doWithFields(source.getClass(), new ReflectionUtils.FieldCallback() {
                public void doWith(Field field) throws IllegalArgumentException, IllegalAccessException {
                    ReflectionUtils.makeAccessible(field);
                    // 如果字段添加了我们自定义的AutoIncKey注解
                    if (field.isAnnotationPresent(AutoIncKey.class) && field.get(source) == null) {
                        // 设置自增ID
                        String doc = null;
                        if (source.getClass().getAnnotation(Document.class) != null) {
                            doc = source.getClass().getAnnotation(Document.class).value();
                        } else {
                            doc = source.getClass().getSimpleName();
                        }
                        field.set(source, getNextId(doc));
                    }
                    if (field.isAnnotationPresent(AutoIncKeyString.class) && field.get(source) == null) {
                        // 设置自增编码  前3位为字段开头字母大写  后5位为自增数字
                        String str = String.format("%05d", getNextId(source.getClass().getAnnotation(Document.class).value()));
                        //String result = field.getName().substring(field.getName().length()-2,field.getName().length());
                        AutoIncKeyString.Access result = field.getAnnotation(AutoIncKeyString.class).access();
                        field.set(source, result + str);
                    }
                    if (field.isAnnotationPresent(AutoIncKeyProject.class) && field.get(source) == null) {
                        // 设置自增编码  前8位为yyyyMMdd  后3位为自增数字
                        String str = String.format("%03d", getNextId(source.getClass().getAnnotation(Document.class).value()));
                        //String result = field.getName().substring(field.getName().length()-2,field.getName().length());
                        //AutoIncKeyString.Access result = field.getAnnotation(AutoIncKeyString.class).access();
                        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyyMMdd");
                        Date date = new Date();
                        String result = simpleDateFormat.format(date);

                        field.set(source, result + str);
                    }
                    if (field.isAnnotationPresent(AutoIncKeySerialNumber.class) && field.get(source) == null) {
                        // 设置自增编码  8位为自增数字
                        String str = String.format("%08d", getNextId(source.getClass().getAnnotation(Document.class).value()));
                        field.set(source, str);
                    }
                }
            });
        }
    }


    @Override
    public void onBeforeSave(BeforeSaveEvent<Object> event) {
        org.bson.Document document = event.getDocument();
        Object source = event.getSource();
        if (source != null) {
            getDocument(document, source);
        }
    }

    private ObjectId toObjectId(String str) {
        return new ObjectId(("000000000000000000000000" + str).substring(str.length()));
    }

    private org.bson.Document getDocument(org.bson.Document document, Object source) {
        ReflectionUtils.doWithFields(source.getClass(), new ReflectionUtils.FieldCallback() {
            public void doWith(Field field) throws IllegalArgumentException, IllegalAccessException {
                ReflectionUtils.makeAccessible(field);
                // 如果字段添加了我们自定义的AutoIncKey注解
                if (field.isAnnotationPresent(AutoConvertObjectId.class) && field.get(source) != null) {
                    if (field.getType().getName().equals("java.util.List")) {
                        int length = Array.getLength(((ArrayList) field.get(source)).toArray());
                        List<ObjectId> objectIds = new ArrayList<>();
                        for (int i = 0; i < length; i++) {
                            Object item = Array.get(((ArrayList) field.get(source)).toArray(), i);
                            objectIds.add(toObjectId(item.toString()));
                        }
                        document.put(field.getName(), objectIds);
                    } else {
                        document.put(field.getName(), toObjectId(field.get(source).toString()));
                    }
                } else if (field.get(source) != null && field.getType().getName().equals("java.util.List")) {
                    if (field.getGenericType().getClass().getName().contains("com.wsi.annotation.api.database.domain")) {
                        int length = Array.getLength(((ArrayList) field.get(source)).toArray());
                        List<org.bson.Document> documents = document.getList(field.getName(), org.bson.Document.class);
                        for (int i = 0; i < length; i++) {
                            Object item = Array.get(((ArrayList) field.get(source)).toArray(), i);
                            if (item.getClass().getName().contains("com.wsi.annotation.api.database.domain") && item != null)
                                documents.set(i, getDocument(documents.get(i), item));
                        }
                        document.put(field.getName(), documents);
                    }
                }
                if (field.getType().getName().contains("com.wsi.annotation.api.database.domain") && field.get(source) != null) {
                    document.put(field.getName(), getDocument((org.bson.Document) document.get(field.getName()), field.get(source)));
                }
            }
        });
        return document;
    }

    /**
     * 获取下一个自增ID
     *
     * @param collName 集合（这里用类名，就唯一性来说最好还是存放长类名）名称
     * @return 序列值
     */
    public Long getNextId(String collName) {
        Query query = new Query(Criteria.where("collName").is(collName));
        List<SeqInfo> seqInfos=mongo.find(query, SeqInfo.class);
        if(seqInfos.size()==0){
            SeqInfo seq =new SeqInfo();
            seq.setCollName(collName);
            seq.setSeqId(1L);
            mongo.save(seq);
            return seq.getSeqId();
        }
        else {
            Update update = new Update();
            update.inc("seqId", 1);
            FindAndModifyOptions options = new FindAndModifyOptions();
            options.upsert(true);
            options.returnNew(true);
            SeqInfo seq = mongo.findAndModify(query, update, options, SeqInfo.class);
            return seq.getSeqId();
        }
    }
}
