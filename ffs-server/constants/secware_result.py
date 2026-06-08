class SecWareRiskLevel:
    # 风险低
    LOW = "LOW"
    # 风险中
    MEDIUM = "MEDIUM"
    # 风险高
    HIGH = "HIGH"


class SecWareRiskScore:
    # 风险低
    LOW_SCORE = 30
    # 风险中
    MEDIUM_SCORE = 60
    # 风险高
    HIGH_SCORE = 90


class SecWareRiskType:
    # 检测交易资产风险
    ASSET_DETECT = "ASSET_DETECT"
    # 检测对手地址风险
    ADDRESS_DETECT = "ADDRESS_DETECT"
    # 授权地址风险
    APPROVAL_ADDRESS_DETECT = "APPROVAL_ADDRESS_DETECT"
    # 授权资产风险
    APPROVAL_ASSET_DETECT = "APPROVAL_ASSET_DETECT"
    # 模拟交易风险
    SIMULATE_DETECT = "SIMULATE_DETECT"


class SecWareRiskDetail:
    # 疑似貔貅代币
    IS_HONEYPOT = "is_honeypot"

    # 涉及honeypot资产
    HONEYPOT_RELATED_ADDRESS = "honeypot_related_address"
    # 实施钓鱼活动
    PHISHING_ACTIVITIES = "phishing_activities"
    # 实施勒索活动
    BLACKMAIL_ACTIVITIES = "blackmail_activities"
    # 实施盗币攻击
    STEALING_ATTACK = "stealing_attack"
    # 涉及假 KYC
    FAKE_KYC = "fake_kyc"
    # 涉及恶意挖矿活动
    MALICIOUS_MINING_ACTIVITIES = "malicious_mining_activities"
    # 涉及暗网交易
    DARKWEB_TRANSACTIONS = "darkweb_transactions"
    # 涉及网络犯罪
    CYBERCRIME = "cybercrime"
    # 涉及洗币活动
    MONEY_LAUNDERING = "money_laundering"
    # 涉及金融犯罪
    FINANCIAL_CRIME = "financial_crime"
    # 其他恶意行为
    BLACKLIST_DOUBT = "blacklist_doubt"
    # 涉及混币服务
    MIXER = "mixer"
    # 被第三方制裁的地址
    SANCTIONED = "sanctioned"
    # 滥用Gas获利
    GAS_ABUSE = "gas_abuse"
    # 重复部署
    REINIT = "reinit"
    # 伪造标准接口
    FAKE_STANDARD_INTERFACE = "fake_standard_interface"
    # 该代币是否是主流资产的伪造品
    FAKE_TOKEN = "fake_token"
    # 虚荣地址，特别注意：Secware目前不支持该分类
    VANITY_ADDRESS = "vanity_address"


class ChaintoolRisk2SecWareRisk:
    chaintool_category_2_risk_detail = {
        "scam": SecWareRiskDetail.FINANCIAL_CRIME,
        "honeypot": SecWareRiskDetail.HONEYPOT_RELATED_ADDRESS,
        "ransom": SecWareRiskDetail.BLACKMAIL_ACTIVITIES,
        "phishing": SecWareRiskDetail.PHISHING_ACTIVITIES,
        "theft": SecWareRiskDetail.STEALING_ATTACK,
        "high_risk": SecWareRiskDetail.FINANCIAL_CRIME,
        "cybercrime": SecWareRiskDetail.CYBERCRIME,
        "mixer": SecWareRiskDetail.MIXER,
        "sanctioned": SecWareRiskDetail.SANCTIONED,
        "terrorism": SecWareRiskDetail.SANCTIONED,
        "ponzi": SecWareRiskDetail.FINANCIAL_CRIME,
        "spam": SecWareRiskDetail.BLACKMAIL_ACTIVITIES,
        "constrained_by_service": SecWareRiskDetail.CYBERCRIME,
        "darknet": SecWareRiskDetail.DARKWEB_TRANSACTIONS,
    }
