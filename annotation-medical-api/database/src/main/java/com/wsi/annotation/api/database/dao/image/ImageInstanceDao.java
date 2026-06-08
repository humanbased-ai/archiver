package com.wsi.annotation.api.database.dao.image;

import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ImageInstanceDao extends MongoRepository<ImageInstance, String> {
}
