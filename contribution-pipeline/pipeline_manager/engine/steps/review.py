"""ReviewStep — quality assurance via spot-check, LLM review, auto-check rules."""

import logging
import random

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo
from ..expression import evaluate_condition

logger = logging.getLogger(__name__)


class ReviewStep(BaseStep):
    name = "review"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        output_slot = self.params.get("output_slot", "records")
        rules = self.params.get("rules", [])
        records = ctx.get_records(input_slot)
        review_results = {}  # uid → {status, issues}

        for rule in rules:
            rule_type = rule.get("type", "")
            if rule_type == "spot_check":
                review_results = self._spot_check(records, rule, review_results)
            elif rule_type == "llm_check":
                review_results = self._llm_check(records, rule, ctx, review_results)
            elif rule_type == "auto_check":
                review_results = self._auto_check(records, rule, ctx, review_results)
            elif rule_type == "double_blind":
                review_results = self._double_blind(records, rule, review_results)
            else:
                logger.warning(f"Unknown review rule type: {rule_type}")

        # Apply review results to records
        for r in records:
            review = review_results.get(r.uid, {})
            if review:
                r.metadata["review"] = review
                if review.get("status") == "approved":
                    r.status = "reviewed"

        ctx.set_records(records, slot=output_slot)
        approved = sum(1 for r in review_results.values() if r.get("status") == "approved")
        logger.info(f"Review: {len(records)} records, {approved} approved, "
                     f"{len(records) - approved} need attention")
        return ctx

    def _spot_check(self, records, rule, results):
        sample_rate = rule.get("sample_rate", 0.1)
        sample_size = max(1, int(len(records) * sample_rate))
        sampled = random.sample(records, min(sample_size, len(records)))
        for r in records:
            if r.uid not in results:
                results[r.uid] = {"status": "approved", "issues": []}
        for r in sampled:
            results[r.uid]["needs_manual_review"] = True
        return results

    def _llm_check(self, records, rule, ctx, results):
        backend_name = rule.get("backend", "")
        if backend_name.startswith("${"):
            backend_name = ctx.variables.get(backend_name[2:-1], backend_name)
        backend = ctx.model_backends.get(backend_name)
        if not backend:
            logger.warning(f"Review LLM backend not found: {backend_name}")
            return results

        prompt_template = rule.get("prompt_template", "Review this annotation: ${record.annotations}")
        from .llm_invoke import _render_template

        for r in records:
            prompt = _render_template(prompt_template, r, ctx.variables)
            resp = backend.predict([{"prompt": prompt}], {"response_format": "json"})
            if resp and resp[0].get("result"):
                review_data = resp[0]["result"]
                uid_result = results.get(r.uid, {"status": "approved", "issues": []})
                if isinstance(review_data, dict):
                    if review_data.get("correct") is False:
                        uid_result["status"] = "rejected"
                    if review_data.get("issues"):
                        uid_result["issues"].extend(review_data["issues"])
                results[r.uid] = uid_result
        return results

    def _auto_check(self, records, rule, ctx, results):
        checks = rule.get("checks", [])
        for r in records:
            uid_result = results.get(r.uid, {"status": "approved", "issues": []})
            for check_expr in checks:
                if not evaluate_condition(check_expr, r, ctx.variables):
                    uid_result["status"] = "flagged"
                    uid_result["issues"].append(f"Failed check: {check_expr}")
            results[r.uid] = uid_result
        return results

    def _double_blind(self, records, rule, results):
        """Placeholder for double-blind review — requires two independent annotators."""
        min_agreement = rule.get("min_agreement_iou", 0.5)
        for r in records:
            results.setdefault(r.uid, {"status": "approved", "issues": []})
            results[r.uid]["review_mode"] = "double_blind"
        logger.info(f"Double-blind review configured (min_agreement={min_agreement})")
        return results

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        records = ctx.get_records(output_slot)
        statuses = {}
        for r in records:
            review = r.metadata.get("review", {})
            status = review.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        return {"review_statuses": statuses}
