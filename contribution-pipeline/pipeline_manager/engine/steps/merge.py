"""MergeStep — combine records from multiple data slots into one."""

import logging

from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


class MergeStep(BaseStep):
    name = "merge"
    input_slots = []  # dynamic
    output_slots = ["records"]

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slots = self.params.get("input_slots", [])
        output_slot = self.params.get("output_slot", "records")
        strategy = self.params.get("strategy", "concat")  # concat | dedupe | stitch

        merged = []
        for slot in input_slots:
            records = ctx.data.get(slot, [])
            merged.extend(records)

        if strategy == "dedupe":
            seen = set()
            deduped = []
            for r in merged:
                if r.uid not in seen:
                    seen.add(r.uid)
                    deduped.append(r)
            merged = deduped
        elif strategy == "stitch":
            merged = self._stitch(merged, ctx)

        ctx.set_records(merged, slot=output_slot)
        logger.info(f"Merge ({strategy}): {[f'{s}={len(ctx.data.get(s,[]))}' for s in input_slots]} → {len(merged)}")
        return ctx

    def _stitch(self, records, ctx):
        """Group records by group_id and merge annotations.
        Placeholder — actual stitch logic depends on data type (e.g. geospatial tile merge).
        """
        from collections import defaultdict
        groups = defaultdict(list)
        for r in records:
            key = r.group_id or r.uid
            groups[key].append(r)

        stitched = []
        for group_id, group in groups.items():
            if len(group) == 1:
                stitched.append(group[0])
            else:
                # Merge annotations from all records in the group
                from ..context import RecordInfo
                merged_annotations = {}
                for r in group:
                    merged_annotations.update(r.annotations)
                primary = group[0]
                primary.annotations = merged_annotations
                primary.metadata["merged_count"] = len(group)
                stitched.append(primary)
        return stitched

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        return {"merged_count": len(ctx.get_records(output_slot))}
