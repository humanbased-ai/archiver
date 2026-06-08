package com.wsi.annotation.api.database.dao.cytomine;

import com.wsi.annotation.api.database.domain.cytomine.ImageServer;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ImageServerDao extends MongoRepository<ImageServer,String> {
}
