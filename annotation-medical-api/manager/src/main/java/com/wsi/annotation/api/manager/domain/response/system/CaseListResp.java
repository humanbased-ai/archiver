package com.wsi.annotation.api.manager.domain.response.system;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;

import java.util.List;

@Data
public class CaseListResp {
    private String id;

    @ApiModelProperty("病例编号")
    private String caseNo;

    @ApiModelProperty("病例名称")
    private String caseName;

    @ApiModelProperty("病例器官id")
    private String organId;

    @ApiModelProperty("病例器官名称")
    private String organName;

    @ApiModelProperty("病例状态 0待标注 1标注中 2已标注 3已审核")
    private Integer caseStatus;

    @ApiModelProperty("病例信息")
    private String caseInfo;

    @ApiModelProperty("所属数据集id")
    private String dataSetId;

    @ApiModelProperty("所属用户编号")
    private String userAccountID;

    @ApiModelProperty("所属用户名称")
    private String userAccountName;

    @ApiModelProperty(value = "亚专科分类ID")
    private String subSpecialtyID;
    @ApiModelProperty(value = "亚专科名称")
    private String subSpecialtyName;

    @ApiModelProperty(value = "患者性别  0男 1女")
    private Integer customerSex;
    @ApiModelProperty(value = "患者年龄")
    private double customerAge;
    @ApiModelProperty(value = "患者岁数")
    private Integer year;
    @ApiModelProperty(value = "月数")
    private Integer month;

    @ApiModelProperty(value = "染色方式")
    private String dyeingMethod;

    @ApiModelProperty(value = "病例备注")
    private String caseRemark;

    @ApiModelProperty(value = "切片名称")
    private String slideName;

    @ApiModelProperty("svs文件列表")
    @Transient
    private List<ImageInstance> svsList;

    @ApiModelProperty("收藏数")
    private Integer collectNum = 0;

    @ApiModelProperty("访问数")
    private Integer visiteNum = 0;

    @ApiModelProperty("点赞数")
    private Integer likeNum = 0;

    @ApiModelProperty("评论数")
    private Integer commentNum = 0;

    @ApiModelProperty("推荐")
    private Boolean isRecommend = false;

    @ApiModelProperty("置顶")
    private Boolean isTop = false;

    @ApiModelProperty("标注数")
    private Integer markNum = 0;

    @ApiModelProperty("我是否参与 0未参与 1已参与")
    @Transient
    private Integer isJoin = 0;

    @ApiModelProperty("提交用户id")
    private String auditUserId;

    @ApiModelProperty("标注用户id列表")
    private List<String> markUserIds;
}
