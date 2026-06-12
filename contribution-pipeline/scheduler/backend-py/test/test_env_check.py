"""
M3 fail-fast 启动校验 — 与 backend/test/env-check.test.ts 1:1.
纯函数, 无 DB / 网络依赖.
"""
from __future__ import annotations
import re

from scheduler.env_check import validate_production_env


def test_m3_0_non_production_passes():
    assert validate_production_env({"NODE_ENV": "development"}) == []
    assert validate_production_env({"NODE_ENV": "test"}) == []
    assert validate_production_env({}) == []


def test_m3_1_production_auth_required_false_fails():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "false",
        "SCHEDULER_INPROCESS_OK": "true",
    })
    assert len(errs) == 1
    assert re.search(r"AUTH_REQUIRED", errs[0])


def test_m3_2_production_missing_deployment_mode_fails():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "true",
    })
    assert len(errs) == 1
    assert re.search(r"SCHEDULER_BASE_URL", errs[0])
    assert re.search(r"SCHEDULER_INPROCESS_OK", errs[0])


def test_m3_3_production_inprocess_ok_passes():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "true",
        "SCHEDULER_INPROCESS_OK": "true",
    })
    assert errs == []


def test_m3_4_production_remote_missing_api_key_fails():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "true",
        "SCHEDULER_BASE_URL": "http://scheduler:4000",
    })
    assert len(errs) == 1
    assert re.search(r"SCHEDULER_API_KEY", errs[0])


def test_m3_5_production_remote_api_key_too_short_fails():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "true",
        "SCHEDULER_BASE_URL": "http://scheduler:4000",
        "SCHEDULER_API_KEY": "shortkey",
    })
    assert len(errs) == 1
    assert re.search(r"长度 <16", errs[0])


def test_m3_6_production_remote_full_config_passes():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "true",
        "SCHEDULER_BASE_URL": "http://scheduler:4000",
        "SCHEDULER_API_KEY": "k" * 32,
    })
    assert errs == []


def test_m3_7_production_multiple_errors():
    errs = validate_production_env({
        "NODE_ENV": "production",
        "AUTH_REQUIRED": "false",
        "SCHEDULER_BASE_URL": "http://scheduler:4000",
    })
    assert len(errs) == 2
    assert any(re.search(r"AUTH_REQUIRED", e) for e in errs)
    assert any(re.search(r"SCHEDULER_API_KEY", e) for e in errs)
