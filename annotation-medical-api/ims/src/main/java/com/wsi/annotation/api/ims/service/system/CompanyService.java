package com.wsi.annotation.api.ims.service.system;

import com.wsi.annotation.api.ims.service.BaseService;
import com.mongodb.QueryBuilder;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.dao.system.SysCompanyDao;
import com.wsi.annotation.api.database.daoextend.system.SysCompanyExtend;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.ims.domain.request.system.Company;
import com.wsi.annotation.api.ims.domain.request.system.CompanyListReq;
import com.wsi.annotation.api.ims.domain.response.system.CompanyListResp;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class CompanyService extends BaseService {

    @Autowired
    private SysCompanyExtend sysCompanyExtend;
    @Autowired
    private SysCompanyDao sysCompanyDao;

    public JqGridPage<CompanyListResp> selectCompanyList(CompanyListReq companyListReq) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");

        QueryBuilder queryBuilder = new QueryBuilder();
        if (companyListReq.getOPCO() != null && !StringUtils.isEmpty(companyListReq.getOPCO())) {
            queryBuilder.and("companyName").is(companyListReq.getOPCO());
        }
        if (companyListReq.getStatus() != null) {
            queryBuilder.and("status").is(companyListReq.getStatus());
        }

        queryBuilder.and("delFlag").is(0);

        Query query = new BasicQuery(queryBuilder.get().toString());
        long listCount = sysCompanyExtend.getListCount(query);

        query.with(sort);
        query = query.skip((companyListReq.getCurrent() - 1) * companyListReq.getPageSize()).limit(companyListReq.getPageSize());

        List<SysCompany> companyList = sysCompanyExtend.getList(query);

        List<CompanyListResp> companyListRespList = new ArrayList<>();

        for (SysCompany sysCompany : companyList) {
            CompanyListResp companyListResp = new CompanyListResp();
            companyListResp.setIncId(sysCompany.getIncId());
            companyListResp.setCompanyName(sysCompany.getCompanyName());
            companyListResp.setAddress(sysCompany.getAddress());
            companyListResp.setLeader(sysCompany.getLeader());
            companyListResp.setPhone(sysCompany.getPhone());
            companyListResp.setFax(sysCompany.getFax());
            companyListResp.setCreateTime(sysCompany.getCreateTime());
            companyListResp.setStatus(sysCompany.getStatus());
            companyListResp.setId(sysCompany.getId());
            if (sysCompany.getUpdateUser() != null) {
                companyListResp.setUpdateUser(sysCompany.getUpdateUser().getName());
            }

            companyListRespList.add(companyListResp);
        }

        JqGridPage<CompanyListResp> respJqGridPage = new JqGridPage<>(
                companyListRespList,
                (int) listCount,
                companyListReq.getPageSize(),
                companyListReq.getCurrent());

        return respJqGridPage;
    }

    public SysCompany add(Company company) {
        if (StringUtils.isEmpty(company.getCompanyName())) {
            throw new HTTPDataException(400, "公司名字不能为空");
        }

        SysCompany sysCompany = new SysCompany();
        BeanUtils.copyProperties(company,sysCompany);

        sysCompany.setStatus(0);
        sysCompany.setCreateTime(new Date());
        sysCompany.setUpdateTime(new Date());
        sysCompanyDao.save(sysCompany);
        return sysCompany;
    }

    public SysCompany getDetail(String id) {
        return sysCompanyDao.getSysCompanyById(id);
    }

    public long update(Company company) {
        if (StringUtils.isEmpty(company.getCompanyName())) {
            throw new HTTPDataException(400, "公司名字不能为空");
        }

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(company.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("companyName", company.getCompanyName())
                .set("region", company.getRegion())
                .set("address", company.getAddress())
                .set("leader", company.getLeader())
                .set("phone", company.getPhone())
                .set("fax", company.getFax())
                .set("businessLicense", company.getBusinessLicense())
                .set("payee", company.getPayee())
                .set("bankName", company.getBankName())
                .set("bankAccountName", company.getBankAccountName())
                .set("bankAccount", company.getBankAccount())
                .set("cnaps", company.getCnaps())
                .set("discountRate", company.getDiscountRate())
                .set("updateTime", new Date());

        return sysCompanyExtend.updateResult(query, update).getModifiedCount();
    }

    public long change(String id) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(id);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        SysCompany sysCompany = sysCompanyDao.getSysCompanyById(id);

        Update update = new Update();
        if (sysCompany.getStatus() == 1) {
            update.set("status", 0);
        } else {
            update.set("status", 1);
        }

        UpdateResult result = sysCompanyExtend.updateResult(query, update);
        return result.getModifiedCount();
    }

    public long delete(String id) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(id);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        UpdateResult result = sysCompanyExtend.updateResult(query, update);
        return result.getModifiedCount();
    }
}
