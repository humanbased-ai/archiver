import setting
from log import logger
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse


def date_to_timestamp(date, zone=timezone.utc):
    date_timestamp = None
    if date is not None:
        new_date = date.replace(tzinfo=zone)
        date_timestamp = int(new_date.timestamp())
    return date_timestamp


def date_to_timestamp_no_zone(date):
    date_timestamp = None
    if date is not None:
        date_timestamp = int(date.timestamp())
    return date_timestamp


def date_to_utc_str(date_time):
    date_str = None
    if date_time is None:
        return date_str
    try:
        date_str = date_time.isoformat(timespec='seconds') + ".000Z"
    except Exception as e:
        logger.error('parse date {} , error = {}', date_time, e)
    return date_str



