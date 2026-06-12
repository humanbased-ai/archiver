"""CleanStep — deduplicate, validate, and filter data records."""

import hashlib
import json
import logging

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo
from ..expression import evaluate_condition

logger = logging.getLogger(__name__)


class CleanStep(BaseStep):
    name = "clean"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        output_slot = self.params.get("output_slot", "records")
        rules = self.params.get("rules", [])
        records = list(ctx.get_records(input_slot))
        initial = len(records)

        for rule in rules:
            rule_type = rule.get("type", "")
            if rule_type == "dedup":
                records = self._dedup(records, rule)
            elif rule_type == "validate":
                records = self._validate(records, rule)
            elif rule_type == "filter":
                records = self._filter(records, rule, ctx.variables)
            elif rule_type == "normalize":
                records = self._normalize(records, rule)
            elif rule_type == "pii_mask":
                records = self._pii_mask(records, rule)
            else:
                logger.warning(f"Unknown clean rule type: {rule_type}")

        ctx.set_records(records, slot=output_slot)
        logger.info(f"Clean: {initial} → {len(records)} records ({initial - len(records)} removed)")
        return ctx

    def _dedup(self, records: list[RecordInfo], rule: dict) -> list[RecordInfo]:
        fields = rule.get("fields", ["content"])
        method = rule.get("method", "hash")  # hash | exact
        seen = set()
        deduped = []
        for r in records:
            key_parts = []
            for field in fields:
                val = getattr(r, field, None) or r.metadata.get(field, "")
                if isinstance(val, (dict, list)):
                    val = json.dumps(val, sort_keys=True)
                key_parts.append(str(val))
            key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
            if key not in seen:
                seen.add(key)
                deduped.append(r)
        removed = len(records) - len(deduped)
        if removed:
            logger.info(f"Dedup: removed {removed} duplicates")
        return deduped

    def _validate(self, records: list[RecordInfo], rule: dict) -> list[RecordInfo]:
        """Validate records against a JSON schema or basic checks."""
        check = rule.get("check", "")
        valid = []
        for r in records:
            if check == "image_integrity":
                # Basic check: file exists and non-zero
                import os
                if isinstance(r.content, str) and os.path.isfile(r.content) and os.path.getsize(r.content) > 0:
                    valid.append(r)
            elif check == "not_empty":
                if r.content:
                    valid.append(r)
            else:
                valid.append(r)
        return valid

    def _filter(self, records: list[RecordInfo], rule: dict, variables: dict) -> list[RecordInfo]:
        condition = rule.get("condition", "")
        if not condition:
            return records
        return [r for r in records if evaluate_condition(condition, r, variables)]

    def _normalize(self, records: list[RecordInfo], rule: dict) -> list[RecordInfo]:
        """Basic text normalization."""
        for r in records:
            if isinstance(r.content, str):
                # Full-width to half-width
                r.content = r.content.translate(
                    str.maketrans(
                        '０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
                        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
                    )
                )
        return records

    def _pii_mask(self, records: list[RecordInfo], rule: dict) -> list[RecordInfo]:
        """Basic PII masking — phone numbers, emails."""
        import re
        for r in records:
            if isinstance(r.content, str):
                r.content = re.sub(r'1[3-9]\d{9}', '[PHONE]', r.content)
                r.content = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '[EMAIL]', r.content)
            elif isinstance(r.content, dict):
                for k, v in r.content.items():
                    if isinstance(v, str):
                        v = re.sub(r'1[3-9]\d{9}', '[PHONE]', v)
                        v = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '[EMAIL]', v)
                        r.content[k] = v
        return records

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        return {"records_after_clean": len(ctx.get_records(output_slot))}
