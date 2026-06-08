package com.wsi.annotation.api.framework.security.auditor;

import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.database.domain.baseInner.InnerUserInfo;
import org.bson.types.ObjectId;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

public class SpringSecurityAuditorAware implements AuditorAware<InnerUserInfo> {

    @Override
    public Optional<InnerUserInfo> getCurrentAuditor() {
        InnerUserInfo info = new InnerUserInfo();
        try {
            LoginUser user = SecurityUtils.getLoginUser();
            if (user != null) {
                info.setForeignKeyId(new ObjectId(user.getUser().getId()));
                info.setName(user.getUser().getNickName());
                if (user.getUser().getDepartmentInfo() != null) {
                    info.setDepartmentId(user.getUser().getDepartmentInfo().getForeignKeyId());
                    info.setDepartmentName(user.getUser().getDepartmentInfo().getDepartmentName());
                }
            }
        } catch (Exception e) {

        }
        return Optional.of(info);

    }
}
