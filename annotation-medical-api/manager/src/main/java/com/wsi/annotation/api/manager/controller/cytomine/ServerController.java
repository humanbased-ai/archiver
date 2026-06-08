package com.wsi.annotation.api.manager.controller.cytomine;

import com.wsi.annotation.api.manager.domain.request.cytomine.ServerPingReq;
import com.wsi.annotation.api.manager.domain.response.cytomine.ServerPingResp;
import com.wsi.annotation.api.manager.service.cytomine.IServerService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/imagecore/api/server")
@Api(tags = "server")
public class ServerController {

    @Autowired
    private IServerService serverService;

    @PostMapping(value = "/ping.json", produces = {"application/json"})
    @ApiOperation(value = "ping", notes = "ping", nickname = "ping")
    public ServerPingResp ping(ServerPingReq req) {
        return serverService.ping(req);
    }
}
