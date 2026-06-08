package com.wsi.annotation.api.database.dao.cytomine;

import com.wsi.annotation.api.database.domain.cytomine.AttachedFile;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AttachedFileDao extends MongoRepository<AttachedFile, String> {
    public AttachedFile getAttachedFileByDomainIdentAndFilename(Long domainIdent, String fileName);
}
