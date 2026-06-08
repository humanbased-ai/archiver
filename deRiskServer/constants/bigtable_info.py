class EvmRiskInfoTable:
    project_id = "chaintool-etl"
    instance_id = "secware"
    table_name = "bt_risk_detail_ethereum_dd"
    # 地址标签
    risk_family_id = 'risk_info'
    type_qualifier = 'type'
    path_qualifier = 'path'
    category_qualifier = 'category'

    trans_history_family_id = 'trans_history'
    in_history_qualifier = 'in_target_ads_info'
    out_history_qualifier = 'out_target_ads_info'


class GoplusRiskInfoTable:
    project_id = "chaintool-etl"
    instance_id = "secware"
    table_name = "bt_risk_detail_goplus_dd"
    # 地址标签
    risk_family_id = 'risk_info'
    categories_qualifier = 'categories'
    biz_dt_qualifier = 'biz_dt'
