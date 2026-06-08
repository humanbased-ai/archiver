package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.framework.web.service.SysPermissionService;
import com.wsi.annotation.api.framework.web.service.TokenService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Set;

@RestController
@RequestMapping("/custom-ui")
@Api(tags = "custom-ui")
public class CustomUIController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private SysPermissionService permissionService;

    @GetMapping(value = "/config.json", produces = {"application/json"})
    public JSONObject imagefilterproject(@RequestParam String project) {
        JSONObject json = new JSONObject();
        json.put("project-activities-tab", true);
        json.put("project-explore-follow", true);
        json.put("project-tools-magic", true);
        json.put("project-explore-link", true);
        json.put("project-tools-delete", true);
        json.put("project-tools-arrow", true);
        json.put("project", true);
        json.put("project-tools-main", true);
        json.put("feedback", true);
        json.put("project-users-heatmap-graph", true);
        json.put("project-tools-measuring", true);
        json.put("project-annotations-users-graph", true);
        json.put("dashboard", true);
        json.put("ontology", false);
        json.put("project-images-tab", true);
        json.put("project-explore-image-layers", true);
        json.put("project-explore-heatmap", true);
        json.put("project-tools-freehand-polygon", true);
        json.put("project-explore-annotation-panel", true);
        json.put("project-tools-move", true);
        json.put("project-tools-circle", true);
        json.put("project-information-tab", true);
        json.put("project-annotated-slides-users-graph", true);
        json.put("project-explore-annotation-geometry-info", true);
        json.put("project-tools-freehand", true);
        json.put("project-explore-property", true);
        json.put("project-jobs-tab", false);
        json.put("project-tools-diamond", true);
        json.put("project-explore-annotation-attached-files", true);
        json.put("project-users-global-activities-graph", true);
        json.put("project-explore-guided-tour", true);
        json.put("project-tools-undo-redo", true);
        json.put("activity", true);
        json.put("project-explore-color-manipulation", true);
        json.put("project-explore-digital-zoom", true);
        json.put("project-explore-annotation-info", true);
        json.put("project-annotations-term-piegraph", true);
        json.put("project-explore-annotation-properties", true);
        json.put("admin", false);
        json.put("project-annotation-graph", true);
        json.put("project-explore-review", true);
        json.put("project-tools-line", true);
        json.put("storage", true);
        json.put("project-tools-rotate", true);
        json.put("project-annotated-slides-term-graph", true);
        json.put("project-explore-annotation-preview", true);
        json.put("project-explore-overview", true);
        json.put("project-explore-hide-tools", true);
        json.put("project-explore-ontology", true);
        json.put("project-tools-polygon", true);
        json.put("project-tools-select", true);
        json.put("search", false);
        json.put("project-explore-annotation-description", true);
        json.put("project-tools-union", true);
        json.put("project-explore-annotation-tags", true);
        json.put("project-explore-job", true);
        json.put("project-tools-point", true);
        json.put("project-explore-annotation-creation-info", true);
        json.put("explore", true);
        json.put("project-tools-fill", true);
        json.put("project-tools-resize", true);
        json.put("project-annotations-term-bargraph", true);
        json.put("project-annotations-tab", true);
        json.put("project-explore-annotation-terms", true);
        json.put("project-tools-diff", true);
        json.put("project-tools-screenshot", true);
        json.put("project-explore-annotation-comments", true);
        json.put("project-tools-rectangle", true);
        json.put("help", true);
        json.put("project-tools-rule", true);
        json.put("project-explore-annotation-main", true);
        json.put("project-tools-freehand-line", true);
        json.put("project-explore-info", true);
        json.put("project-configuration-tab", true);
        json.put("project-tools-edit", true);
        Boolean hasPremi = false;
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        BasicUser user = loginUser.getUser();
        Set<String> permissions = permissionService.getMenuPermission(user);
        for (String permi:permissions) {
            if(ObjectUtils.isNotEmpty(permi)&&(permi.equals("*:*:*")||permi.equals("image:edit"))){
                hasPremi = true;
                break;
            }
        }
        if(!hasPremi){
            json.put("project-tools-magic", false);
            json.put("project-tools-delete", false);
            json.put("project-tools-arrow", false);
            json.put("project-tools-measuring", false);
            json.put("project-tools-freehand-polygon", false);
            json.put("project-tools-move", false);
            json.put("project-tools-circle", false);
            json.put("project-tools-freehand", false);
            json.put("project-tools-diamond", false);
            json.put("project-tools-undo-redo", false);
            json.put("project-tools-line", false);
            json.put("project-tools-rotate", false);
            json.put("project-tools-polygon", false);
            json.put("project-tools-union", false);
            json.put("project-tools-point", false);
            json.put("project-tools-fill", false);
            json.put("project-tools-resize", false);
            json.put("project-tools-diff", false);
            json.put("project-tools-screenshot", false);
            json.put("project-tools-rectangle", false);
            json.put("project-tools-rule", false);
            json.put("project-tools-freehand-line", false);
            json.put("project-tools-edit", false);
        }
        return json;
    }
}
