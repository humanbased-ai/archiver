from dao import dashboard_dao
from datetime import datetime, timedelta, timezone


async def get_opt_post_data():
    now = datetime.now()
    current_date = now
    last_month = now - timedelta(days=30)
    start_date = last_month.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = now

    push_post_data = await dashboard_dao.get_reply_post_data(start_date=start_date, end_date=end_date)


    current = last_month

    push_post_datas = []
    finish_user_datas = []
    days = []
    while current <= end_date:
        # 格式化日期并打印
        day = current.strftime("%Y-%m-%d")
        push_post_num = push_post_data.get(day, 0)
        #finish_user_num = finish_user_data.get(day, 0)
        days.append(day)
        push_post_datas.append(push_post_num)
        #finish_user_datas.append(finish_user_num)

        # 日期加一天
        current += timedelta(days=1)

    list_datas = [
        {
            'name': '回复帖子数量', 'data': push_post_datas, 'type': 'line', 'smooth': 0

        }
    ]
    legends = []
    for row_data in list_datas:
        name = row_data['name']
        legends.append(name)

    result = {
        'legend': {
            'data': legends
        },
        'xAxis': {
            'type': 'category',
            'data': days
        },
        'series': list_datas
    }
    return result