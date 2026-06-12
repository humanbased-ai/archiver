"""RouteStep — conditionally split records into different data slots."""

import logging

from ..base_step import BaseStep
from ..context import PipelineContext
from ..expression import evaluate_condition

logger = logging.getLogger(__name__)


class RouteStep(BaseStep):
    name = "route"
    input_slots = ["records"]
    output_slots = []  # dynamic — determined by conditions

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        conditions = self.params.get("conditions", [])
        default_slot = self.params.get("default_slot", None)
        records = ctx.get_records(input_slot)

        # Initialize output slots
        slot_counts = {}
        for cond in conditions:
            slot = cond.get("output_slot", "")
            if slot:
                ctx.data.setdefault(slot, [])
                slot_counts[slot] = 0
        if default_slot:
            ctx.data.setdefault(default_slot, [])
            slot_counts[default_slot] = 0

        for record in records:
            routed = False
            for cond in conditions:
                condition_expr = cond.get("condition", "")
                output_slot = cond.get("output_slot", "")
                if not condition_expr or not output_slot:
                    continue
                if evaluate_condition(condition_expr, record, ctx.variables):
                    ctx.data[output_slot].append(record)
                    slot_counts[output_slot] = slot_counts.get(output_slot, 0) + 1
                    routed = True
                    break  # First match wins

            if not routed and default_slot:
                ctx.data[default_slot].append(record)
                slot_counts[default_slot] = slot_counts.get(default_slot, 0) + 1

        logger.info(f"Route: {len(records)} records → {slot_counts}")
        return ctx

    def _get_stats(self, ctx):
        conditions = self.params.get("conditions", [])
        stats = {}
        for cond in conditions:
            slot = cond.get("output_slot", "")
            if slot:
                stats[slot] = len(ctx.data.get(slot, []))
        default_slot = self.params.get("default_slot")
        if default_slot:
            stats[default_slot] = len(ctx.data.get(default_slot, []))
        return stats
