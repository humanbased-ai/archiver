package com.wsi.annotation.api.manager.service.cytomine;

import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.ImageMark;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.manager.domain.response.cytomine.ProjectResp;

import java.util.List;

public interface IProjectService {
    ProjectResp getProjectDetail(String id);
    List<Tag> getOrganTagList(String id);
    List<Tag> getOrganAreaTagList(String id);
    ImageMark saveImageMark(ImageMark imageMark);
    ImageMark getMyImageMark(ImageMark imageMark);
    ImageMark getImageMark(ImageMark imageMark);
    ImageMark setImageMark(ImageMark imageMark);
    ImageMark scoreImageMark(ImageMark imageMark);
    ImageMark selectImageMark(ImageMark imageMark);
    CaseInfo completeCase(String id);
    CaseInfo resetCase(String id);
}
