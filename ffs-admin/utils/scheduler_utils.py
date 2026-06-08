from flask_apscheduler import APScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dao import scheduler_dao
from dao.models import SchedulerConfig
from log import logger
import setting
# 实例APScheduler定时任务

scheduler = AsyncIOScheduler()


def init_scheduler():
    logger.info(f"初始化APScheduler定时任务")
    datas = scheduler_dao.list()
    if len(datas) > 0:
        for data in datas:
            status = data.get('status')
            if status != 1:
                continue
            name = data.get('name')
            remarks = data.get('remarks')
            #print(f'start_scheduler task {name}， remarks = {remarks}')

            if 'win' == remarks and setting.START_WIN_TASK == '0':
                logger.info(f'不启动win任务{name},type={remarks}: id = {data["id"]}, func={data.service}')
                continue

            try:
                start_scheduler(data)
            except Exception as e:
                logger.error(e)


def start_scheduler(scheduler_config):

    trigger = 'cron'
    cron = scheduler_config.cron
    values = cron.split(' ')
    id = scheduler_config.id
    name = scheduler_config.name
    func = scheduler_config.service
    remarks = scheduler_config.remarks

    task_id = f'task_{id}'

    logger.info(f'start_scheduler id={task_id}, name={name}, func={func}')
    scheduler.add_job(id=task_id,
                      func=func,
                      name=name,
                      trigger=trigger,
                      second=values[0], minute=values[1], hour=values[2], day=values[3], month=values[4],
                      day_of_week=values[5],
                      replace_existing=True,
                      coalesce=True
                      )


def stop_scheduler(scheduler_config):
    id = scheduler_config.id
    task_id = f'task_{id}'

    logger.info(f'stop_scheduler task :{task_id}')
    scheduler.pause_job(task_id)




