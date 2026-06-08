# import asyncio
# import json
# import logging
# from google.cloud.bigtable.row_set import RowSet
#
# from constants.bigtable_info import EvmRiskInfoTable
# from constants.secware_result import SecWareRiskLevel, SecWareRiskScore, SecWareRiskType, SecWareRiskDetail, \
#     ChaintoolRisk2SecWareRisk
# from dao.risk_info_by_bigtable import BigtableClient
# from models.check import CheckParam, TxObject, SubRiskInfo, RiskResult, SubAdvise, MidRiskResult
# from service.risk.query_goplus_service import check_goplus_risk
# from service.risk import misreport_service
#
# from log import logger
#
#
# # 判断地址的标签风险
# async def get_risk_info_from_bigtable(from_ad, to_ad):
#     to_ad_category = None
#     from_ad_in_history = None
#     from_ad_out_history = None
#
#     try:
#         # 连接bigtable
#         client = BigtableClient(EvmRiskInfoTable.project_id, EvmRiskInfoTable.instance_id)
#         table = client.get_table(EvmRiskInfoTable.table_name)
#         row_set = RowSet()
#         row_set.add_row_key(from_ad)
#         row_set.add_row_key(to_ad)
#         rows = table.read_rows(row_set=row_set)
#         if rows:
#             rows.consume_all()
#             for row_key, row_data in rows.rows.items():
#                 row_key = row_key.decode('utf-8')
#                 # print(f"row_key={row_key}")
#                 if row_key == from_ad and EvmRiskInfoTable.trans_history_family_id in row_data.cells:
#                     trans_history_cell = row_data.cells[EvmRiskInfoTable.trans_history_family_id]
#                     if EvmRiskInfoTable.in_history_qualifier in trans_history_cell:
#                         from_ad_in_history = trans_history_cell[EvmRiskInfoTable.in_history_qualifier.encode('utf-8')][
#                             0].value.decode("utf-8")
#                     if EvmRiskInfoTable.out_history_qualifier in trans_history_cell:
#                         from_ad_out_history = trans_history_cell[EvmRiskInfoTable.out_history_qualifier.encode('utf-8')][
#                             0].value.decode("utf-8")
#                 if row_key == to_ad and EvmRiskInfoTable.risk_family_id in row_data.cells:
#                     risk_cell = row_data.cells[EvmRiskInfoTable.risk_family_id]
#                     type = risk_cell[EvmRiskInfoTable.type_qualifier.encode('utf-8')][0].value.decode("utf-8")
#                     # 不进行扩散
#                     if type == "self":
#                         to_ad_category = risk_cell[EvmRiskInfoTable.category_qualifier.encode('utf-8')][0].value.decode(
#                             "utf-8")
#                     # path = risk_cell[EvmRiskInfoTable.path_qualifier.encode('utf-8')][0].value.decode("utf-8")
#                 # 打印行数据
#                 # print(f'Row key: {row_key}, Value: {to_ad_category}, {from_ad_in_history}, {from_ad_out_history}')
#     except Exception as e:
#         logger.error(e)
#
#     return to_ad_category, from_ad_in_history, from_ad_out_history
#
#
# # 判断地址的标签风险
# async def judge_address_tag_risk(ad_category, goplus_risk) -> SubRiskInfo:
#     tag_risk_info = SubRiskInfo()
#     if goplus_risk:
#         tag_risk_info.risk_type = SecWareRiskType.ADDRESS_DETECT
#         risk_detail_list = []
#         for aa in goplus_risk.split(","):
#             risk_detail_list.append(aa)
#         tag_risk_info.risk_list.extend(risk_detail_list)
#     elif ad_category:
#         tag_risk_info.risk_type = SecWareRiskType.ADDRESS_DETECT
#         risk_detail_list = []
#         for cc in ad_category.split(","):
#             this_risk = ChaintoolRisk2SecWareRisk.chaintool_category_2_risk_detail[cc]
#             if this_risk is None:
#                 this_risk = SecWareRiskDetail.FINANCIAL_CRIME
#             if this_risk not in risk_detail_list:
#                 risk_detail_list.append(this_risk)
#         tag_risk_info.risk_list.extend(risk_detail_list)
#
#     return tag_risk_info
#
#
# async def is_vanity_address(address_a, address_b, prefix_length=6, suffix_length=4):
#     """
#     判断地址A是否为地址B的Vanity Address（前缀或后缀）
#
#     :param address_a: 要检查的地址A
#     :param address_b: 用作前缀或后缀的地址B
#     :param prefix_length: 要检查的前缀长度
#     :param suffix_length: 要检查的后缀长度
#     :return: 如果地址A以地址B的前缀开头且后缀结尾，则返回True，否则返回False
#     """
#     address_a = address_a.lower()
#     address_b = address_b.lower()
#     return (address_a.startswith(address_b[:prefix_length]) and
#             address_a.endswith(address_b[-suffix_length:]))
#
#
# # 判断地址的操作风险
# async def judge_address_action_risk(to_ad, ad_in_history: str, ad_out_history: str, value: float) -> SubRiskInfo:
#     action_risk_info = SubRiskInfo()
#
#     trans_history = []
#     if ad_in_history:
#         trans_history.extend(ad_in_history.split(";"))
#     if ad_out_history:
#         trans_history.extend(ad_out_history.split(";"))
#
#     for entry in trans_history:
#         address_history, value_history, cnt_history = entry.split(',')
#         if await is_vanity_address(to_ad, address_history) and value > 0:
#             action_risk_info.risk_type = SecWareRiskType.ADDRESS_DETECT
#             action_risk_info.risk_list.append(SecWareRiskDetail.BLACKLIST_DOUBT)
#             # action_risk_info.risk_list.append(SecWareRiskDetail.VANITY_ADDRESS)
#             return action_risk_info
#
#     return action_risk_info
#
#
# # 还需要检测一下是否为transfer，如果是的话需要检测transfer目标地址
# async def transfer(data: str) -> str:
#     if not data.startswith("0xa9059cbb"):
#         return ""
#     return "0x" + data[10:74].replace("000000000000000000000000", "").lower()
#
#
# # 入口函数
# async def check(check_param: CheckParam):
#     # Step1：从入参中解析得到转出的地址
#     chain_id = check_param.chain_id
#     to_ad_transfer = await transfer(check_param.tx.data)
#     from_address = check_param.tx.from_address.lower()
#     if to_ad_transfer == "":
#         to_address = check_param.tx.to_address.lower()
#     else:
#         to_address = to_ad_transfer
#     value = float(check_param.tx.value)
#     logger.info(f"Request: chain_id={chain_id}, from_address={from_address}, to_address={to_address}, value={value}")
#
#     # Step2: 读取bigtable的数据
#     mid_risk_result = MidRiskResult()
#     to_ad_category, from_ad_in_history, from_ad_out_history = await get_risk_info_from_bigtable(from_address,
#                                                                                                 to_address)
#     logger.info(f"data from bigtable: to_ad_category={to_ad_category}, from_ad_in_history={from_ad_in_history},"
#                 f" from_ad_out_history={from_ad_out_history}")
#     # 获取goplus的结果
#     goplus_risk = await check_goplus_risk(to_address)
#     # print(f"data from goplus: {goplus_risk}")
#     logger.info(f"data from goplus: {goplus_risk}")
#
#     # Step3: 判断转出地址的标签风险
#     tag_risk_info: SubRiskInfo = await judge_address_tag_risk(to_ad_category, goplus_risk)
#
#     # Step4: 判断转出地址的操作风险
#     action_risk_info: SubRiskInfo = await judge_address_action_risk(to_address, from_ad_in_history, from_ad_out_history,
#                                                                     value)
#     mid_risk_result.goplus_risk_list = goplus_risk
#     mid_risk_result.chaintool_risk_list = to_ad_category
#     if action_risk_info.risk_type:
#         mid_risk_result.action_risk_list = SecWareRiskDetail.VANITY_ADDRESS
#
#     # Step5: 得到最终结果
#     risk_result = RiskResult()
#
#     mis_count = await misreport_service.query_mis_report_count(from_address, to_address)
#     if mis_count > 0:
#         risk_result.score = SecWareRiskScore.LOW_SCORE
#         risk_result.risk_level = SecWareRiskLevel.LOW
#     elif not tag_risk_info.risk_type and not action_risk_info.risk_type:
#         risk_result.score = SecWareRiskScore.LOW_SCORE
#         risk_result.risk_level = SecWareRiskLevel.LOW
#         # risk_result.risk_info.append(SubRiskInfo())
#         # risk_result.advise.append(SubAdvise())
#     elif tag_risk_info.risk_type:
#         if tag_risk_info.malice_address_list is None:
#             tag_risk_info.malice_address_list = []
#         tag_risk_info.malice_address_list.append(to_address)
#
#         risk_result.score = SecWareRiskScore.HIGH_SCORE
#         risk_result.risk_level = SecWareRiskLevel.HIGH
#         risk_result.risk_info.append(tag_risk_info)
#         risk_category = ",".join(tag_risk_info.risk_list)
#         advise_title = f"Your transaction has been identified as risky. " \
#                        f"The category of the transfer address is '{risk_category}'."
#         sub_advise = SubAdvise(title=advise_title)
#         risk_result.advise.append(sub_advise)
#     else:
#         if tag_risk_info.malice_address_list is None:
#             tag_risk_info.malice_address_list = []
#         tag_risk_info.malice_address_list.append(to_address)
#
#         risk_result.score = SecWareRiskScore.HIGH_SCORE
#         risk_result.risk_level = SecWareRiskLevel.HIGH
#         risk_result.risk_info.append(action_risk_info)
#         risk_category = ",".join(action_risk_info.risk_list)
#         advise_title = f"Your transaction has been identified as risky. " \
#                        f"The category of the transfer address is '{risk_category}'."
#         sub_advise = SubAdvise(title=advise_title)
#         risk_result.advise.append(sub_advise)
#
#     result_json = json.dumps(risk_result.model_dump(), ensure_ascii=False)
#     mid_risk_result_json = json.dumps(mid_risk_result.model_dump(), ensure_ascii=False)
#     logger.info(f"Result: {result_json}. MidResult: {mid_risk_result_json}")
#     return result_json, mid_risk_result_json
#
#
# if __name__ == '__main__':
#     tx = TxObject(
#         **{
#             "from": "0x4a96fc715f913f7a6092607cf182e8274cdab6ca",
#             "to": "0x38e53a58ad3fc605fec5a993f442468e483ff089",
#             # "to": "0xb8648d1250fba717e2706160f511540a559f916b",
#             # "to": "0x151b381058f91cf981e7ea1ee83c45326f61e96d",
#             # "to": "0x38e53a58ad3fc605fec5a993f442468e483ff089",
#             "gas": 100,
#             "gas_price": "10",
#             "value": "100",
#             "data": "22",
#             "nonce": "1234",
#             "hash": "0x3d2e17110243801c8f1cb0becc483ad579f11c09a898f7e002048f22cf7afa88"
#         }
#     )
#     config = []
#     checkParam = CheckParam(id="2",
#                             chain_id="1",
#                             tx=tx,
#                             config=config)
#     loop = asyncio.get_event_loop()
#     result = loop.run_until_complete(check(checkParam))
#     result, mid_risk_result = loop.run_until_complete(check(checkParam))
#     print(result)
#     print(mid_risk_result)
#     loop.close()
