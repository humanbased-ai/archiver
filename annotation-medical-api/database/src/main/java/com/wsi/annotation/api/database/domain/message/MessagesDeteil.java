package com.wsi.annotation.api.database.domain.message;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(value = "MessagesDeteil")
public class MessagesDeteil {
    @Id
    private String id;
    //消息发送人ID
    private String senderId;
    //消息发送人
    private String sender;
    //消息数据
    private String message;
    //发送时间
    private Date sendTime;
    //0为未读 ，1 为已读
    private Integer flag = 0;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String sendId) {
        this.senderId = sendId;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Date getSendTime() {
        return sendTime;
    }

    public void setSendTime(Date sendTime) {
        this.sendTime = sendTime;
    }

    public Integer getFlag() {
        return flag;
    }

    public void setFlag(Integer flag) {
        this.flag = flag;
    }

    @Override
    public String toString() {
        return "Messages{" +
                "message='" + message + '\'' +
                ", sendTime=" + sendTime +
                ", flag=" + flag +
                '}';
    }
}
