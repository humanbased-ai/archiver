package com.wsi.annotation.api.database.domain.message;

import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@Document(value = "message")
public class Message extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @Id
    private String id;
    //消息接收用户
    private BasicUser receiveUser;
    //接受消息详细数据列表
    private List<MessagesDeteil> messagesDeteils;

    public BasicUser getSysUser() {
        return receiveUser;
    }

    public void setSysUser(BasicUser basicUser) {
        this.receiveUser = basicUser;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<MessagesDeteil> getMessages() {
        return messagesDeteils;
    }

    public void setMessages(List<MessagesDeteil> messages) {
        this.messagesDeteils = messages;
    }

    @Override
    public String toString() {
        return "Message{" +
                "id='" + id + '\'' +
                ", sysUser=" + receiveUser +
                ", messagesDeteils=" + messagesDeteils +
                '}';
    }
}
