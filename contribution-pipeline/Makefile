# ==============================================================================
#  Label Studio 标注流水线 - 全流程编排
#
#  本地开发 (推荐):
#    make dev-install → dev-start → setup → import-upload → ... → dev-stop
#
#  Docker 部署:
#    make clone → start → setup → import → ... → stop
# ==============================================================================

# --- 配置 ---
LABEL_STUDIO_URL  ?= http://localhost:8080
LABEL_STUDIO_API_KEY ?= $(shell grep -s '^LABEL_STUDIO_API_KEY=' .env 2>/dev/null | cut -d= -f2 || grep -s '^LABEL_STUDIO_API_KEY=' core/.env 2>/dev/null | cut -d= -f2)
PROJECT_ID        ?= 1
PROJECT_TITLE     ?= YOLO 目标检测标注
LABELS            ?= person car truck bus motorcycle bicycle
IMAGE_DIR         ?= core/data/images
VIDEO_FILE        ?=
VIDEO_FPS         ?= 1
ZIP_FILE          ?=
TARGET_CLASS      ?= person
EXPORT_FORMAT     ?= JSON
EXPORT_DIR        ?= output
ML_BACKEND_PORT   ?= 9090
MODEL_PATH        ?= yolo26n.pt
PYTHON_VERSION    ?= 3.11

# --- 虚拟环境 (三个组件各自隔离) ---
ROOT     := $(shell pwd)
VENV_LS  := $(ROOT)/.venv/label-studio
VENV_ML  := $(ROOT)/.venv/ml-backend
VENV_SDK := $(ROOT)/.venv/api-sdk
VENV_PM  := $(ROOT)/.venv/pipeline_manager
PID_DIR  := .pids

# 自动检测: 有 venv 用 venv，没有用系统 PATH
BIN_LS   = $(if $(wildcard $(VENV_LS)/bin/label-studio),$(VENV_LS)/bin/,)
BIN_ML   = $(if $(wildcard $(VENV_ML)/bin/label-studio-ml),$(VENV_ML)/bin/,)
BIN_SDK  = $(if $(wildcard $(VENV_SDK)/bin/python),$(VENV_SDK)/bin/,)
BIN_PM   = $(if $(wildcard $(VENV_PM)/bin/python),$(VENV_PM)/bin/,)

ENV_VARS = LABEL_STUDIO_URL=$(LABEL_STUDIO_URL) LABEL_STUDIO_API_KEY=$(LABEL_STUDIO_API_KEY)

.PHONY: help

help: ## 显示帮助
	@echo ""
	@echo "Label Studio 标注流水线"
	@echo "======================"
	@echo ""
	@echo "本地开发: make dev-install → dev-start → setup → import-upload → [标注] → status → export"
	@echo "Docker:   make clone → start → setup → import → [标注] → status → export"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ==============================================================================
#  环境隔离 (uv 虚拟环境)
# ==============================================================================
#
#  .venv/
#  ├── label-studio/   ← Label Studio 服务端 (Django, 最重)
#  ├── ml-backend/     ← YOLO ML Backend (ultralytics + torch)
#  └── api-sdk/        ← SDK 自动化脚本 (轻量)
#
#  三个 venv 完全隔离，互不干扰。uv 创建速度 < 1 秒。
# ==============================================================================

dev-install: ## [本地] 创建隔离环境 + 安装依赖 (uv)
	@echo "创建虚拟环境..."
	@echo ""
	@echo "--- Label Studio ($(VENV_LS)) ---"
	uv venv $(VENV_LS) --python $(PYTHON_VERSION)
	VIRTUAL_ENV=$(VENV_LS) uv pip install label-studio
	@echo ""
	@echo "--- ML Backend ($(VENV_ML)) ---"
	uv venv $(VENV_ML) --python $(PYTHON_VERSION)
	VIRTUAL_ENV=$(VENV_ML) uv pip install -r ml-backend/requirements.txt
	@echo ""
	@echo "--- API SDK ($(VENV_SDK)) ---"
	uv venv $(VENV_SDK) --python $(PYTHON_VERSION)
	VIRTUAL_ENV=$(VENV_SDK) uv pip install -r api-sdk/requirements.txt
	@echo ""
	@echo "--- Pipeline Manager ($(VENV_PM)) ---"
	uv venv $(VENV_PM) --python $(PYTHON_VERSION)
	VIRTUAL_ENV=$(VENV_PM) uv pip install -r pipeline_manager/requirements.txt
	@echo ""
	@echo "[OK] 四个隔离环境已就绪"
	@echo "  $(VENV_LS)"
	@echo "  $(VENV_ML)"
	@echo "  $(VENV_SDK)"
	@echo "  $(VENV_PM)"
	@echo ""
	@echo "环境由 Makefile 自动使用，无需手动 source activate"

dev-update: ## [本地] 更新所有依赖
	VIRTUAL_ENV=$(VENV_LS) uv pip install --upgrade label-studio
	VIRTUAL_ENV=$(VENV_ML) uv pip install --upgrade -r ml-backend/requirements.txt
	VIRTUAL_ENV=$(VENV_SDK) uv pip install --upgrade -r api-sdk/requirements.txt
	@echo "[OK] 依赖已更新"

# ==============================================================================
#  本地开发模式
# ==============================================================================

dev-start: _check_venv ## [本地] 启动 Label Studio + ML Backend
	@mkdir -p $(PID_DIR) logs
	@# --- Label Studio ---
	@if [ -f $(PID_DIR)/label-studio.pid ] && kill -0 $$(cat $(PID_DIR)/label-studio.pid) 2>/dev/null; then \
		echo "Label Studio 已在运行 (PID $$(cat $(PID_DIR)/label-studio.pid))"; \
	else \
		echo "启动 Label Studio..."; \
		$(BIN_LS)label-studio start --port 8080 --no-browser \
			> logs/label-studio.log 2>&1 & \
		echo $$! > $(PID_DIR)/label-studio.pid; \
		echo "  PID: $$(cat $(PID_DIR)/label-studio.pid)  日志: logs/label-studio.log"; \
	fi
	@# --- 等待就绪 ---
	@printf "等待 Label Studio 就绪"
	@for i in $$(seq 1 30); do \
		if curl -s -o /dev/null -w '' $(LABEL_STUDIO_URL)/health 2>/dev/null; then \
			echo " OK"; \
			break; \
		fi; \
		printf "."; \
		sleep 2; \
	done
	@# --- ML Backend ---
	@if [ -f $(PID_DIR)/ml-backend.pid ] && kill -0 $$(cat $(PID_DIR)/ml-backend.pid) 2>/dev/null; then \
		echo "ML Backend 已在运行 (PID $$(cat $(PID_DIR)/ml-backend.pid))"; \
	else \
		echo "启动 ML Backend..."; \
		cd ml-backend && \
		LABEL_STUDIO_URL=$(LABEL_STUDIO_URL) \
		LABEL_STUDIO_API_KEY=$(LABEL_STUDIO_API_KEY) \
		MODEL_PATH=$(MODEL_PATH) \
		CONF_THRESHOLD=$${CONF_THRESHOLD:-0.25} \
		IOU_THRESHOLD=$${IOU_THRESHOLD:-0.45} \
		$(BIN_ML)label-studio-ml start . --host 0.0.0.0 --port $(ML_BACKEND_PORT) \
			> ../logs/ml-backend.log 2>&1 & \
		echo $$! > ../$(PID_DIR)/ml-backend.pid; \
		echo "  PID: $$(cat ../$(PID_DIR)/ml-backend.pid)  日志: logs/ml-backend.log"; \
	fi
	@# --- Pipeline Manager ---
	@if [ -f $(PID_DIR)/pipeline-manager.pid ] && kill -0 $$(cat $(PID_DIR)/pipeline-manager.pid) 2>/dev/null; then \
		echo "Pipeline Manager 已在运行 (PID $$(cat $(PID_DIR)/pipeline-manager.pid))"; \
	else \
		if [ -d "$(VENV_PM)" ]; then \
			echo "启动 Pipeline Manager..."; \
			LABEL_STUDIO_URL=$(LABEL_STUDIO_URL) \
			LABEL_STUDIO_API_KEY=$(LABEL_STUDIO_API_KEY) \
			$(BIN_PM)python -m uvicorn pipeline_manager.app:app --host 0.0.0.0 --port 8000 \
				> logs/pipeline-manager.log 2>&1 & \
			echo $$! > $(PID_DIR)/pipeline-manager.pid; \
			echo "  PID: $$(cat $(PID_DIR)/pipeline-manager.pid)  日志: logs/pipeline-manager.log"; \
		fi; \
	fi
	@echo ""
	@echo "[OK] 服务已启动"
	@echo "  Label Studio:      $(LABEL_STUDIO_URL)"
	@echo "  ML Backend:        http://localhost:$(ML_BACKEND_PORT)"
	@echo "  Pipeline Manager:  http://localhost:8000"
	@echo "  Dashboard:         http://localhost:8000/dashboard/"
	@echo ""
	@if [ -z "$(LABEL_STUDIO_API_KEY)" ]; then \
		echo "首次使用:"; \
		echo "  1. 打开 $(LABEL_STUDIO_URL) 注册账户"; \
		echo "  2. Account & Settings → 复制 Access Token"; \
		echo "  3. echo 'LABEL_STUDIO_API_KEY=<token>' > .env"; \
		echo "  4. make dev-restart"; \
	fi

dev-stop: ## [本地] 停止服务
	@if [ -f $(PID_DIR)/pipeline-manager.pid ]; then \
		kill $$(cat $(PID_DIR)/pipeline-manager.pid) 2>/dev/null && echo "Pipeline Manager 已停止" || echo "Pipeline Manager 未运行"; \
		rm -f $(PID_DIR)/pipeline-manager.pid; \
	fi
	@if [ -f $(PID_DIR)/ml-backend.pid ]; then \
		kill $$(cat $(PID_DIR)/ml-backend.pid) 2>/dev/null && echo "ML Backend 已停止" || echo "ML Backend 未运行"; \
		rm -f $(PID_DIR)/ml-backend.pid; \
	fi
	@if [ -f $(PID_DIR)/label-studio.pid ]; then \
		kill $$(cat $(PID_DIR)/label-studio.pid) 2>/dev/null && echo "Label Studio 已停止" || echo "Label Studio 未运行"; \
		rm -f $(PID_DIR)/label-studio.pid; \
	fi
	@echo "[OK] 服务已停止"

dev-restart: dev-stop dev-start ## [本地] 重启服务

dev-logs-ls: ## [本地] Label Studio 日志
	@tail -f logs/label-studio.log

dev-logs-ml: ## [本地] ML Backend 日志
	@tail -f logs/ml-backend.log

dev-ps: ## [本地] 查看进程状态
	@echo "Label Studio:"
	@if [ -f $(PID_DIR)/label-studio.pid ] && kill -0 $$(cat $(PID_DIR)/label-studio.pid) 2>/dev/null; then \
		echo "  运行中 (PID $$(cat $(PID_DIR)/label-studio.pid))"; \
	else \
		echo "  未运行"; \
	fi
	@echo "ML Backend:"
	@if [ -f $(PID_DIR)/ml-backend.pid ] && kill -0 $$(cat $(PID_DIR)/ml-backend.pid) 2>/dev/null; then \
		echo "  运行中 (PID $$(cat $(PID_DIR)/ml-backend.pid))"; \
	else \
		echo "  未运行"; \
	fi

dev-shell-ls: ## [本地] 进入 Label Studio 环境的 shell
	@echo "进入 Label Studio 虚拟环境 (exit 退出)"
	@VIRTUAL_ENV=$(VENV_LS) PATH="$(VENV_LS)/bin:$$PATH" $(SHELL)

dev-shell-ml: ## [本地] 进入 ML Backend 环境的 shell
	@echo "进入 ML Backend 虚拟环境 (exit 退出)"
	@VIRTUAL_ENV=$(VENV_ML) PATH="$(VENV_ML)/bin:$$PATH" $(SHELL)

dev-shell-sdk: ## [本地] 进入 API SDK 环境的 shell
	@echo "进入 API SDK 虚拟环境 (exit 退出)"
	@VIRTUAL_ENV=$(VENV_SDK) PATH="$(VENV_SDK)/bin:$$PATH" $(SHELL)

# ==============================================================================
#  Docker 部署模式
# ==============================================================================

clone: ## [Docker] 克隆所有子仓库
	@[ -d core/.git ] || git clone https://github.com/codatta/label-studio-pipeline-core.git core
	@[ -d ml-backend/.git ] || git clone https://github.com/codatta/label-studio-pipeline-ml-backend.git ml-backend
	@[ -d api-sdk/.git ] || git clone https://github.com/codatta/label-studio-pipeline-api-sdk.git api-sdk
	@echo "[OK] 子仓库就绪"

start: ## [Docker] 启动服务
	cd core && cp -n .env.example .env 2>/dev/null || true
	cd core && docker compose up -d --build
	@echo "[OK] Label Studio: $(LABEL_STUDIO_URL) | ML Backend: http://localhost:9090"

restart: ## [Docker] 重启服务
	cd core && docker compose up -d

stop: ## [Docker] 停止服务
	cd core && docker compose down

logs: ## [Docker] 查看日志
	cd core && docker compose logs -f --tail=50

# ==============================================================================
#  流水线步骤 (本地/Docker 通用)
# ==============================================================================

setup: _check_key ## 创建标注项目 + 连接 ML Backend
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python setup_project.py \
		--title "$(PROJECT_TITLE)" \
		--labels $(LABELS)

import: _check_key ## 导入图片 (Docker volume 模式)
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python import_data.py \
		--project-id $(PROJECT_ID) \
		--dir ../$(IMAGE_DIR) \
		--data-root ../core/data

import-upload: _check_key ## 导入图片 (API 上传, 本地开发推荐)
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python import_data.py \
		--project-id $(PROJECT_ID) \
		--dir ../$(IMAGE_DIR) \
		--upload

import-video: _check_key ## 导入视频 (VIDEO_FILE=路径 VIDEO_FPS=帧率)
ifndef VIDEO_FILE
	@echo "用法: make import-video VIDEO_FILE=path/to/video.mp4 VIDEO_FPS=2"
	@exit 1
endif
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python import_data.py \
		--project-id $(PROJECT_ID) \
		--video ../$(VIDEO_FILE) \
		--video-fps $(VIDEO_FPS) \
		--upload

import-zip: _check_key ## 导入 ZIP 帧 → 逐帧分割标注 (ZIP_FILE=路径)
ifndef ZIP_FILE
	@echo "用法: make import-zip ZIP_FILE=path/to/frames.zip PROJECT_ID=0"
	@exit 1
endif
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python import_video_frames.py \
		--project-id $(PROJECT_ID) \
		--zip $(if $(filter /%,$(ZIP_FILE)),$(ZIP_FILE),../$(ZIP_FILE)) \
		--mode frames \
		--detect-model ../ml-backend/models/yolo26n.pt \
		--seg-model ../ml-backend/models/yolo26n-seg.pt \
		--conf 0.5 \
		--target-class $(TARGET_CLASS)

import-zip-video: _check_key ## 导入 ZIP 帧 → 合成视频跟踪标注 (ZIP_FILE=路径)
ifndef ZIP_FILE
	@echo "用法: make import-zip-video ZIP_FILE=path/to/frames.zip PROJECT_ID=0"
	@exit 1
endif
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python import_video_frames.py \
		--project-id $(PROJECT_ID) \
		--zip $(if $(filter /%,$(ZIP_FILE)),$(ZIP_FILE),../$(ZIP_FILE)) \
		--mode video --fps 5 \
		--detect-model ../ml-backend/models/yolo26n.pt \
		--conf 0.5 \
		--target-class $(TARGET_CLASS)

open: ## 浏览器打开标注界面
	@open "$(LABEL_STUDIO_URL)/projects/$(PROJECT_ID)/data" 2>/dev/null || \
		echo "请打开: $(LABEL_STUDIO_URL)/projects/$(PROJECT_ID)/data"

status: _check_key ## 查看标注进度
	@cd api-sdk && $(ENV_VARS) $(BIN_SDK)python review_tasks.py \
		--project-id $(PROJECT_ID) status

review-list: _check_key ## 列出待审核任务
	@cd api-sdk && $(ENV_VARS) $(BIN_SDK)python review_tasks.py \
		--project-id $(PROJECT_ID) list

review: _check_key ## 审核任务 (TASK_IDS="1 2 3" ACTION=accept|reject)
ifndef TASK_IDS
	@echo "用法: make review TASK_IDS=\"1 2 3\" ACTION=accept"
	@exit 1
endif
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python review_tasks.py \
		--project-id $(PROJECT_ID) $(or $(ACTION),accept) $(TASK_IDS)

accept-all: _check_key ## 批量通过所有已标注任务
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python review_tasks.py \
		--project-id $(PROJECT_ID) accept-all

export: _check_key ## 导出标注 (EXPORT_FORMAT=JSON|COCO|YOLO|VOC|CSV)
	@mkdir -p $(EXPORT_DIR)
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python export_data.py \
		--project-id $(PROJECT_ID) \
		--format $(EXPORT_FORMAT) \
		--output ../$(EXPORT_DIR)

export-reviewed: _check_key ## 仅导出已审核标注
	@mkdir -p $(EXPORT_DIR)
	cd api-sdk && $(ENV_VARS) $(BIN_SDK)python export_data.py \
		--project-id $(PROJECT_ID) \
		--reviewed-only \
		--output ../$(EXPORT_DIR)

# ==============================================================================
#  组合目标
# ==============================================================================

dev: dev-install dev-start ## 一键本地环境 (创建 venv + 安装 + 启动)
	@echo ""
	@echo "本地环境就绪! 下一步: 注册 → .env → make dev-restart → make setup"

pipeline: clone dev-install start ## 一键 Docker 环境

# ==============================================================================
#  工具
# ==============================================================================

clean: ## 清理导出和日志
	rm -rf $(EXPORT_DIR) logs $(PID_DIR)

clean-venv: ## 删除所有虚拟环境
	rm -rf .venv
	@echo "[OK] 虚拟环境已清理"

_check_key:
	@if [ -z "$(LABEL_STUDIO_API_KEY)" ]; then \
		echo "错误: LABEL_STUDIO_API_KEY 未设置"; \
		echo "  echo 'LABEL_STUDIO_API_KEY=<token>' > .env"; \
		exit 1; \
	fi

_check_venv:
	@if [ ! -d "$(VENV_LS)" ]; then \
		echo "错误: 虚拟环境未创建，请先运行 make dev-install"; \
		exit 1; \
	fi
