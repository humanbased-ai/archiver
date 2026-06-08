from log import logger
from dao.ct import ct_ai_chat_record_dao, ct_ai_model_dao
import asyncio
import numpy as np
from scipy.stats import beta
from datetime import datetime, timedelta, timezone
import math


async def statics_chat_model_task():
    logger.info('chat statics data')
    records = await ct_ai_chat_record_dao.find_ai_chat_records(status=2, has_vote=1)
    if len(records) == 0:
        logger.error('no ai chat records')
        return None

    record_datas = []
    for record in records:
        model_a = record.get('model_a')
        model_b = record.get('model_b')
        evaluate = record.get('evaluate')
        if model_a is None or model_b is None or evaluate is None:
            continue

        record_data = {
            'id': record.get('id'),
            'model_a': model_a,
            'model_b': model_b,
            'evaluate': int(evaluate),

        }
        record_datas.append(record_data)

    # 统计模型数据
    model_name_data_map = await statics_model_data(record_datas)

    models = await ct_ai_model_dao.find_ai_models()
    num = 0
    for model_data in models:
        model_name = model_data['name']
        model_name_data = model_name_data_map.get(model_name)
        if model_name_data is None:
            continue
        num = num + 1
        model_name_data['id'] = model_data['id']
        model_name_data['statistical_time'] = datetime.now(timezone.utc)
        await ct_ai_model_dao.update_ai_model(model_name_data)
    logger.info('chat statics data done,  size = {}', num)
    return


async def statics_model_data(records):
    model_name_data_map = {}
    model_stats = {}
    for record in records:
        model_a = record.get('model_a')
        model_b = record.get('model_b')
        evaluate = record.get('evaluate')
        for m in [model_a, model_b]:
            if m not in model_stats:
                model_stats[m] = {
                    "elo": 1000,
                    "elo_history": [],
                    "votes": 0,
                    "wins": 0,
                    "matches": 0,
                }

    K = 16
    for record in records:
        model_a = record.get('model_a')
        model_b = record.get('model_b')
        evaluate = record.get('evaluate')
        if model_a not in model_stats or model_b not in model_stats:
            continue
        ra = model_stats[model_a]["elo"]
        rb = model_stats[model_b]["elo"]
        ea = 1 / (1 + 10 ** ((rb - ra) / 400))
        eb = 1 / (1 + 10 ** ((ra - rb) / 400))
        if evaluate == 1:
            sa, sb = 1, 0
        elif evaluate == 2:
            sa, sb = 0, 1
        elif evaluate == 3:
            sa, sb = 1, 1
        else:
            sa, sb = 0, 0
        model_stats[model_a]["elo"] += K * (sa - ea)
        model_stats[model_b]["elo"] += K * (sb - eb)
        model_stats[model_a]["elo_history"].append(model_stats[model_a]["elo"])
        model_stats[model_b]["elo_history"].append(model_stats[model_b]["elo"])
        model_stats[model_a]["matches"] += 1
        model_stats[model_b]["matches"] += 1
        model_stats[model_a]["votes"] += 1
        model_stats[model_b]["votes"] += 1
        if sa > sb:
            model_stats[model_a]["wins"] += 1
        elif sb > sa:
            model_stats[model_b]["wins"] += 1

    for m, stat in model_stats.items():
        matches = stat["matches"]
        wins = stat["wins"]
        votes = stat["votes"]
        correct_rate = wins / matches if matches > 0 else 0.0

        arena_score = int(round(stat["elo"]))

        if matches >= 30:
            # Elo bootstrap
            elo_samples = []
            elo_hist = stat["elo_history"]
            for _ in range(1000):
                sample_idx = np.random.choice(len(elo_hist), len(elo_hist), replace=True)
                sample = [elo_hist[i] for i in sample_idx]
                elo_samples.append(np.mean(sample))
            ci_low = int(np.percentile(elo_samples, 2.5))
            ci_high = int(np.percentile(elo_samples, 97.5))
            up = ci_high - arena_score
            down = arena_score - ci_low
            ci = f"+{abs(int(up))}/-{abs(int(down))}"
        else:
            # 样本不足时用Beta分布，但转换为Elo量级
            a = wins + 1
            b = matches - wins + 1
            mean = a / (a + b)  # 胜率
            ci_low, ci_high = beta.ppf([0.025, 0.975], a, b)

            # 胜率转换为Elo分数差值的函数
            def win_rate_to_elo_diff(rate):
                if rate <= 0.01:
                    return -400
                if rate >= 0.99:
                    return 400
                try:
                    return -400 * math.log10(1/rate - 1)
                except:
                    return 0

            # 计算置信区间边界相对于平均胜率对应的Elo分差
            mean_elo_diff = win_rate_to_elo_diff(mean)
            low_elo_diff = win_rate_to_elo_diff(ci_low)
            high_elo_diff = win_rate_to_elo_diff(ci_high)

            # 计算Elo分数的置信区间
            elo_mean = arena_score  # 使用当前Elo作为基准点
            elo_low = elo_mean + (low_elo_diff - mean_elo_diff)
            elo_high = elo_mean + (high_elo_diff - mean_elo_diff)

            # 计算相对于当前分数的上下误差
            up = elo_high - elo_mean
            down = elo_mean - elo_low

            # 格式化为整数，与Elo格式统一
            ci = f"+{abs(int(round(up)))}/-{abs(int(round(down)))}"

        model_name_data_map[m] = {
            "arena_score": arena_score,
            "ci": ci,
            "votes": votes,
            "correct_rate": round(correct_rate, 4),
        }

    return model_name_data_map


def test_statics_model_data():
    import asyncio

    # 构造测试数据
    records = [
        # 评价次数不足的模型
        {"model_a": "gpt-4o", "model_b": "qwen", "evaluate": 1},
        {"model_a": "gpt-4o", "model_b": "qwen", "evaluate": 2},
        {"model_a": "gpt-4o", "model_b": "qwen", "evaluate": 1},
        # 评价次数充足的模型
    ]
    # 让 qwen 多打几场
    for _ in range(35):
        records.append({"model_a": "qwen", "model_b": "glm", "evaluate": 1})
    for _ in range(10):
        records.append({"model_a": "glm", "model_b": "qwen", "evaluate": 2})

    # print (records)
    # print (len(records))
    # print("satrt calc")

    # 跑异步测试
    result = asyncio.run(statics_model_data(records))
    print("统计结果：")
    for model, data in result.items():
        print(f"{model}: {data}")

if __name__ == '__main__':
    # test_statics_model_data()
    asyncio.run(statics_chat_model_task())





