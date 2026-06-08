package com.wsi.annotation.api.manager.domain.response.cytomine;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.basic.CaseOwnership;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
import lombok.Data;

import java.util.List;

@Data
public class ProjectResp {
    private boolean areImagesDownloadable;
    private boolean blindMode;
    private String discipline;
    private String disciplineName;
    private boolean hideAdminsLayers;
    private boolean hideUsersLayer;
    private String id;
    private boolean isClosed;
    private boolean isReadOnly;
    private boolean isRestricted;
    private String name;
    private BasicUserResp owner;
    private int numberOfAnnotations;
    private int numberOfImages;
    private int numberOfJobAnnotations;
    private int numberOfReviewedAnnotations;
    private int numberOfSlides;
    private String ontology;
    private String ontologyName;
    private boolean retrievalAllOntology;
    private boolean retrievalDisable;
    private List<String> retrievalProjects;
    private String tableName;

    /** 数据集名 */
    private String setName;

    /** 标注要求 */
    private String markRequire;

    /** 标注教程 */
    private String markCourse;
    /** 标注等级 */
    private Integer markLevel;
    /** 标注人数 */
    private Integer markNum;
    /** 审核等级 */
    private Integer auditLevel;

    private String caseRemark;

    private BasicUserResp auditUser;

    private List<BasicUserResp> markUsers;

    private List<CaseOwnership> ownershipList;

    private Integer caseStatus;
}
