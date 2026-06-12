"""CollectStep — acquire data from various sources."""

import json
import logging
import os
import uuid
from pathlib import Path

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo

logger = logging.getLogger(__name__)

# File extension to data_type mapping
EXT_TYPE_MAP = {
    ".jpg": "image", ".jpeg": "image", ".png": "image", ".bmp": "image",
    ".webp": "image", ".gif": "image", ".tif": "image", ".tiff": "image",
    ".mp4": "video", ".avi": "video", ".mov": "video", ".mkv": "video",
    ".wav": "audio", ".mp3": "audio", ".m4a": "audio", ".flac": "audio",
    ".pdf": "document", ".txt": "text", ".json": "json", ".jsonl": "json",
    ".csv": "table", ".xlsx": "table", ".xls": "table",
}


class CollectStep(BaseStep):
    name = "collect"
    input_slots = []
    output_slots = ["records"]

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        source_type = self.params.get("source_type", "directory")
        output_slot = self.params.get("output_slot", "records")
        source_config = self.params.get("source_config", {})

        if source_type == "directory":
            records = self._collect_directory(source_config, ctx)
        elif source_type == "file":
            records = self._collect_file(source_config)
        elif source_type == "api":
            records = self._collect_api(source_config)
        elif source_type == "database":
            records = self._collect_database(source_config)
        else:
            raise ValueError(f"Unknown source_type: {source_type}")

        ctx.set_records(records, slot=output_slot)
        logger.info(f"Collected {len(records)} records from {source_type}")
        return ctx

    def _collect_directory(self, config: dict, ctx: PipelineContext) -> list[RecordInfo]:
        path = config.get("path", ctx.source_path)
        patterns = config.get("patterns", ["*"])
        recursive = config.get("recursive", True)
        records = []
        src = Path(path)
        if not src.exists():
            raise FileNotFoundError(f"Source directory not found: {path}")

        for pattern in patterns:
            glob_fn = src.rglob if recursive else src.glob
            for fp in sorted(glob_fn(pattern)):
                if not fp.is_file():
                    continue
                ext = fp.suffix.lower()
                data_type = EXT_TYPE_MAP.get(ext, "file")
                records.append(RecordInfo(
                    uid=str(uuid.uuid4()),
                    data_type=data_type,
                    content=str(fp),
                    metadata={"filename": fp.name, "size": fp.stat().st_size, "extension": ext},
                ))
        return records

    def _collect_file(self, config: dict) -> list[RecordInfo]:
        """Collect from a single file (JSONL, CSV, etc.)."""
        file_path = config.get("path", "")
        file_type = config.get("file_type", "jsonl")
        records = []

        if file_type == "jsonl":
            with open(file_path) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    records.append(RecordInfo(
                        uid=str(data.get("id", uuid.uuid4())),
                        data_type=data.get("data_type", "json"),
                        content=data.get("content", data),
                        metadata=data.get("metadata", {}),
                    ))
        elif file_type == "json":
            with open(file_path) as f:
                items = json.load(f)
            if isinstance(items, list):
                for item in items:
                    records.append(RecordInfo(
                        uid=str(item.get("id", uuid.uuid4())),
                        data_type=item.get("data_type", "json"),
                        content=item.get("content", item),
                        metadata=item.get("metadata", {}),
                    ))
        return records

    def _collect_api(self, config: dict) -> list[RecordInfo]:
        """Collect from an HTTP API with pagination support."""
        import requests

        url = config.get("url", "")
        method = config.get("method", "GET").upper()
        headers = config.get("headers", {})
        pagination = config.get("pagination", {})
        data_mapping = config.get("data_mapping", {})
        records = []
        page = 0
        page_size = pagination.get("page_size", 100)
        max_pages = pagination.get("max_pages", 100)

        while page < max_pages:
            params = {}
            if pagination.get("type") == "offset":
                params["offset"] = page * page_size
                params["limit"] = page_size
            elif pagination.get("type") == "cursor" and page > 0:
                params["cursor"] = records[-1].metadata.get("_cursor", "") if records else ""

            req_kwargs = {"headers": headers, "params": params, "timeout": 60}
            if method == "GET":
                resp = requests.get(url, **req_kwargs)
            else:
                resp = requests.post(url, **req_kwargs)
            resp.raise_for_status()
            data = resp.json()

            items = data if isinstance(data, list) else data.get("data", data.get("results", []))
            if not items:
                break

            for item in items:
                records.append(RecordInfo(
                    uid=str(item.get("id", uuid.uuid4())),
                    data_type=item.get("data_type", "json"),
                    content=item.get("content", item),
                    metadata=item.get("metadata", {}),
                ))

            if not pagination or len(items) < page_size:
                break
            page += 1

        return records

    def _collect_database(self, config: dict) -> list[RecordInfo]:
        """Collect from a database via SQL query."""
        import sqlite3

        connection_string = config.get("connection_string", "")
        query = config.get("query", "")
        records = []

        # Simple SQLite support; for production, use SQLAlchemy
        if connection_string.startswith("sqlite"):
            db_path = connection_string.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query)
            for row in cursor.fetchall():
                row_dict = dict(row)
                records.append(RecordInfo(
                    uid=str(row_dict.get("id", uuid.uuid4())),
                    data_type=row_dict.get("data_type", "json"),
                    content=row_dict.get("content", row_dict),
                    metadata={k: v for k, v in row_dict.items() if k not in ("id", "content")},
                ))
            conn.close()

        return records

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        records = ctx.get_records(output_slot)
        type_counts = {}
        for r in records:
            type_counts[r.data_type] = type_counts.get(r.data_type, 0) + 1
        return {"total_collected": len(records), "by_type": type_counts}
