"""Base class for all pipeline steps.

v2: Adds input/output slot declarations, validate(), and output_mode support.
"""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from sqlmodel import Session

from ..models.run_step import RunStep
from .context import PipelineContext

logger = logging.getLogger(__name__)


class BaseStep(ABC):
    name: str = "base"

    # Declare expected input/output data slots (for DAG analysis and UI display).
    input_slots: list[str] = ["records"]
    output_slots: list[str] = ["records"]

    def __init__(self, params: dict = None):
        self.params = params or {}

    @abstractmethod
    def execute(self, ctx: PipelineContext) -> PipelineContext:
        ...

    def validate(self, ctx: PipelineContext) -> list[str]:
        """Pre-execution validation. Returns list of error messages (empty = OK)."""
        errors = []
        for slot in self.input_slots:
            if slot not in ctx.data and slot != "records":
                errors.append(f"Step '{self.name}': missing input slot '{slot}'")
        return errors

    def run(self, ctx: PipelineContext, session: Session, step_index: int) -> PipelineContext:
        """Run the step with DB tracking and output_mode handling."""
        now = datetime.now(timezone.utc)
        step = RunStep(
            run_id=ctx.run_id,
            step_name=self.name,
            step_index=step_index,
            status="running",
            started_at=now,
        )
        session.add(step)
        session.commit()
        session.refresh(step)

        # Capture input summary
        input_slot = self.params.get("input_slot", "records")
        input_records = ctx.data.get(input_slot, [])
        step.input_summary = json.dumps(
            {"slot": input_slot, "count": len(input_records) if isinstance(input_records, list) else 1},
            default=str,
        )

        try:
            # Validate
            errors = self.validate(ctx)
            if errors:
                raise ValueError(f"Validation failed: {'; '.join(errors)}")

            ctx = self.execute(ctx)

            # Handle output_mode (append vs replace) — already done by step itself
            # Capture output summary
            output_slot = self.params.get("output_slot", "records")
            output_records = ctx.data.get(output_slot, [])
            step.output_summary = json.dumps(
                {"slot": output_slot, "count": len(output_records) if isinstance(output_records, list) else 1},
                default=str,
            )

            step.status = "completed"
            step.completed_at = datetime.now(timezone.utc)
            step.duration_sec = (step.completed_at - step.started_at).total_seconds()
            step.stats_json = json.dumps(self._get_stats(ctx), default=str)
            session.add(step)
            session.commit()
            return ctx
        except Exception as e:
            step.status = "failed"
            step.completed_at = datetime.now(timezone.utc)
            step.duration_sec = (step.completed_at - step.started_at).total_seconds()
            step.log = str(e)
            session.add(step)
            session.commit()
            raise

    def _get_stats(self, ctx: PipelineContext) -> dict:
        """Override to return step-specific stats."""
        return {}
