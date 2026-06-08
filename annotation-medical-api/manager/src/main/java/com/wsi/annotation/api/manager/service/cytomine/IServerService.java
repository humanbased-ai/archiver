package com.wsi.annotation.api.manager.service.cytomine;

import com.wsi.annotation.api.manager.domain.request.cytomine.ServerPingReq;
import com.wsi.annotation.api.manager.domain.response.cytomine.ServerPingResp;
import org.springframework.stereotype.Service;

@Service
public interface IServerService {
    ServerPingResp ping(ServerPingReq req);
}
