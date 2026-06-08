package com.wsi.annotation.api.framework.config;

import com.wsi.annotation.api.framework.security.auditor.SpringSecurityAuditorAware;
import com.wsi.annotation.api.database.domain.baseInner.InnerUserInfo;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration

@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public AuditorAware<InnerUserInfo> myAuditorProvider(){
        return new SpringSecurityAuditorAware();
    }
}
