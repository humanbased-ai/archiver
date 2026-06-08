import asyncio
import json
import logging

from models.Question import QuestionParam, QuestionResult
from models.check import SubRiskInfo
from service.risk import check_service_db

from log import logger


# 保存调查问卷
async def save_naire(question_param: QuestionParam):
    # Step1：从入参中解析得到转出的地址
    from_address = question_param.from_address
    to_address = question_param.to_address
    value = float(question_param.value)

    logger.info(f"Request: from_address={from_address}, to_address={to_address}, value={value}")

    # Step2: 读取bigtable的数据
    to_ad_category, from_ad_in_history, from_ad_out_history = await check_service_db.get_risk_info_from_mysql(from_address,
                                                                                                to_address)
    logger.info(f"data from bigtable: to_ad_category={to_ad_category}, from_ad_in_history={from_ad_in_history},"
                f" from_ad_out_history={from_ad_out_history}")

    # Step3: 判断转出地址的标签风险
    tag_risk_info: SubRiskInfo = await check_service_db.judge_address_tag_risk(to_ad_category)

    # Step4: 判断转出地址的操作风险
    action_risk_info: SubRiskInfo = await check_service_db.judge_address_action_risk(to_address, from_ad_in_history, from_ad_out_history,
                                                                    value)

    # Step4: 得到最终结果
    question_result = QuestionResult()
    if not tag_risk_info.risk_type and not action_risk_info.risk_type:
        question_result.risk_level = "LOW"
        question_result.risk_info = "Your transaction has not been identified as risky."
        question_result.advise = "Allow this transaction."
    elif tag_risk_info.risk_type:
        question_result.risk_level = "HIGH"
        risk_categories = ",".join(tag_risk_info.risk_list)
        question_result.risk_info = f"Your transaction has been identified as risky. " \
                                    f"The category of the transfer address is '{risk_categories}'."
        question_result.advise = "Block this transaction."
    else:
        question_result.risk_level = "HIGH"
        risk_categories = ",".join(action_risk_info.risk_list)
        question_result.risk_info = f"Your transaction has been identified as risky. " \
                                    f"The category of the transfer address is '{risk_categories}'."
        question_result.advise = "Block this transaction."

    result_json = json.dumps(question_result.model_dump(), ensure_ascii=False)
    logger.info(f"Result: {result_json}")
    return result_json


if __name__ == '__main__':
    question_param = QuestionParam(
        network="Ethereum",
        from_address="0x7925cd659b7ae3934b641e47f45d76947e561323",
        # to_address="0x0708c4c6a0c201636aa94c1fc0991a9347406145",
        to_address="0x151b381058f91cf981e7ea1ee83c45326f61e96d",
        value="100"
    )
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(save_naire(question_param))
    loop.close()
