from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dao import scheduler_dao

from log import logger
import setting

# APScheduler task
scheduler = AsyncIOScheduler()


def init_scheduler():
    logger.info(f"init APScheduler task")
    datas = scheduler_dao.list()
    if len(datas) > 0:
        for data in datas:
            status = data.get('status')
            if status != 1:
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




