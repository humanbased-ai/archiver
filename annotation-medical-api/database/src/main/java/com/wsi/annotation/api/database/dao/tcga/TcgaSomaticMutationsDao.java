package com.wsi.annotation.api.database.dao.tcga;

import com.wsi.annotation.api.database.domain.tcga.TcgaSomaticMutations;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TcgaSomaticMutationsDao extends MongoRepository<TcgaSomaticMutations, String> {
}
