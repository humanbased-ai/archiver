package com.wsi.annotation.api.framework.web.service;

import com.wsi.annotation.api.common.utils.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;


/**
 * WebSocketServer
 *
 * @author zhengkai.blog.csdn.net
 */
@ServerEndpoint(value = "/message/{id}")
@Component
public class WebSocketService {
    /**
     * 静态变量，用来记录当前在线连接数。应该把它设计成线程安全的。
     */
    private static int onlineCount = 0;
    /**
     * concurrent包的线程安全Set，用来存放每个客户端对应的Session对象。
     */
    public static ConcurrentHashMap<Integer, List<Session>> webSocketMap = new ConcurrentHashMap<>();
    // 接收userId
    private Session session;
    private Integer id;

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, @PathParam("id") Integer id) throws IOException {
        this.id = id;

        this.session = session;
        if (webSocketMap.containsKey(id)) {
            // 多点登录通过同id，多session实现
            List<Session> sessions = webSocketMap.get(id);
            sessions.add(session);
            webSocketMap.put(id, sessions);
            this.addOnlineCount();
        } else {
            List<Session> list = new ArrayList<>();
            list.add(session);
            webSocketMap.put(id, list);
        }
        sendMessage("1",id);
    }

    /**
     * 连接关闭调用的方法
     */
    @OnClose
    public void onClose() {
        List<Session> sessions = webSocketMap.get(id);
        List<Session> saveSessions = new ArrayList<>();
        if (ObjectUtils.isNotEmpty(sessions)) {
            for (Session session : sessions) {
                if (!session.getId().equals(this.session.getId())) {
                    saveSessions.add(session);
                }
            }
        }
        if (saveSessions.size() == 0) {
            webSocketMap.remove(this.id);

            this.subOnlineCount();
        } else {
            webSocketMap.put(id, saveSessions);
        }
    }

    /**
     * 收到客户端提交的消息后调用的方法
     *
     * @param messageStr 客户端提交过来的消息
     */
    @OnMessage
    public void onMessage(String messageStr) {
        //可以群发消息
        //消息保存到数据库、redis
        if (StringUtils.isNotBlank(messageStr)) {
            try {
                //解析发送的报文
//                MessageParam message = JSONObject.parseObject(messageStr, MessageParam.class);
//                CommonMessage commonMessage = new CommonMessage();
//                BeanUtils.copyProperties(message, commonMessage);
//                commonMessage.setRecver(new ObjectId(message.getRecverId()));
//                messageService.saveMessage(commonMessage);
//                if(StringUtils.isNotBlank(message.getRecverId())&&webSocketMap.containsKey(message.getRecverId())){
//                    List<Session> sessionList = webSocketMap.get(message.getRecverId());
//                    sendMessage(commonMessage, sessionList);
//                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @OnError
    public void onError(Session session, Throwable error) {
        //log.error("用户错误:"+this.userId+",原因:"+error.getMessage());
        error.printStackTrace();
    }

    /**
     * 实现服务器主动推送
     */
//    public void sendMessage(CommonMessage message , List<Session> sessions) throws IOException {
//        for (Session session : sessions) {
//            session.getBasicRemote().sendText(JSONObject.toJSONString(message));
//        }
//    }
    public void sendMessage(String message,Integer id) throws IOException {
        List<Session> sessionList = webSocketMap.get(id);

        for (Session session : sessionList) {
            if(session.isOpen()){
                session.getBasicRemote().sendText(message);
            }
        }
    }

    public static synchronized int getOnlineCount() {
        return WebSocketService.onlineCount;
    }

    public static synchronized void addOnlineCount() {
        WebSocketService.onlineCount++;
    }

    public static synchronized void subOnlineCount() {
        WebSocketService.onlineCount--;
    }
}