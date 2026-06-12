"""autoworker — 薄循环. 与 autoworker.ts 1:1."""
from __future__ import annotations
import asyncio
import logging

from .drivers.registry import (
    pick_driver, to_result_body, to_failed_result, auto_node_keys, DriverJob,
)
from .drivers.dedup import register_dedup_driver
from .drivers.export import register_export_driver
from .drivers.sandbox_js import register_sandbox_js_driver
from .drivers.compute import register_compute_driver
from .drivers.http import register_http_driver
from .drivers.llm_translate import register_llm_translate_driver
from .drivers.collect import register_collect_driver
from .drivers.ingest import register_ingest_driver
from .drivers._upsert import upsert_collected_node_definitions
from .drivers._client import sched_post

logger = logging.getLogger(__name__)

AUTOWORKER_ID = "auto-worker"
ACTIVE_TICK_MS = 2000
IDLE_TICK_MS   = 10_000
IDLE_THRESHOLD = 5
NO_DRIVER_PARK_SECONDS = 60

_bootstrapped = False
_stopped = False


def stop_autoworker() -> None:
    global _stopped
    _stopped = True


async def bootstrap_drivers() -> None:
    global _bootstrapped
    if _bootstrapped:
        return
    register_dedup_driver()
    register_export_driver()
    register_sandbox_js_driver()
    register_compute_driver()
    register_http_driver()
    register_llm_translate_driver()
    register_collect_driver()
    register_ingest_driver()
    await upsert_collected_node_definitions()
    _bootstrapped = True


async def process_one(node_key: str) -> int:
    resp = await sched_post(
        f"/queue/{node_key}/lease",
        {"workerId": AUTOWORKER_ID, "batchSize": 5, "leaseSeconds": 30},
        None,
    )
    jobs_data: list[dict] = resp.get("jobs") or []
    for jd in jobs_data:
        job = DriverJob(
            run_id=jd["runId"], item_id=jd["itemId"], task_id=jd["taskId"],
            tenant_id=jd["tenantId"], step_key=jd["stepKey"], node_key=jd["nodeKey"],
            node_version=jd.get("nodeVersion"), params=jd.get("params") or {},
            inputs=jd.get("inputs") or {}, envelope=jd.get("envelope") or {},
            ctx=jd.get("ctx") or {},
        )
        driver = pick_driver(job)
        if not driver:
            try:
                await sched_post(
                    f"/queue/lease/{job.run_id}/release",
                    {"workerId": AUTOWORKER_ID, "parkSeconds": NO_DRIVER_PARK_SECONDS},
                    job.tenant_id,
                )
            except Exception as e:
                logger.warning(f"[autoworker] park-release failed for run {job.run_id}: {e}")
            continue

        try:
            result = await driver.handle(job)
        except Exception as e:
            logger.error(f"[autoworker:{driver.name}] run {job.run_id}: {e}")
            result = to_failed_result(e, "DRIVER_EXCEPTION")

        try:
            await sched_post("/result", to_result_body(job.run_id, result), job.tenant_id)
        except Exception as e:
            logger.error(f"[autoworker] /result failed for run {job.run_id}: {e}")

    return len(jobs_data)


async def autoworker_loop() -> None:
    global _stopped
    _stopped = False
    await bootstrap_drivers()
    logger.info(f"[autoworker] started; drivers cover nodeKeys: {auto_node_keys()}")

    consecutive_empty = 0
    while not _stopped:
        try:
            tick_jobs = 0
            for nk in auto_node_keys():
                try:
                    tick_jobs += await process_one(nk)
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    logger.error(f"[autoworker:{nk}] {e}")

            if tick_jobs > 0:
                consecutive_empty = 0
            else:
                consecutive_empty += 1

            delay = (IDLE_TICK_MS if consecutive_empty >= IDLE_THRESHOLD else ACTIVE_TICK_MS) / 1000
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            break
