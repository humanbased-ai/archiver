"""AnnotateStep — push data to an annotation backend and pause the pipeline.

This step:
1. Creates a project on the annotation backend (or reuses one).
2. Uploads records + predictions.
3. Optionally registers a webhook for completion notification.
4. Sets __pipeline_should_pause to signal the runner to enter waiting_annotation state.
"""

import logging

from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


class AnnotateStep(BaseStep):
    name = "annotate"
    input_slots = ["records"]
    output_slots = ["records"]

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        backend_name = self.params.get("backend", "")
        input_slot = self.params.get("input_slot", "records")
        project_config = self.params.get("project_config", {})
        wait_for_completion = self.params.get("wait_for_completion", False)

        # Resolve backend name from variables
        if backend_name.startswith("${"):
            var_name = backend_name[2:-1]
            backend_name = ctx.variables.get(var_name, backend_name)

        backend = ctx.annotation_backends.get(backend_name)
        if backend is None:
            raise ValueError(f"Annotation backend not found: {backend_name}. "
                             f"Available: {list(ctx.annotation_backends.keys())}")

        records = ctx.get_records(input_slot)
        if not records:
            logger.warning("AnnotateStep: no records to annotate")
            return ctx

        # 1. Create project
        ext_project_id = backend.create_project(project_config)

        # 2. Upload data
        upload_records = []
        for r in records:
            upload_records.append({
                "uid": r.uid,
                "data_type": r.data_type,
                "content": r.content,
                "metadata": r.metadata,
                "predictions": r.predictions,
            })

        mapping = backend.upload_data(ext_project_id, upload_records)

        # Map external IDs back to records
        for r in records:
            if r.uid in mapping:
                r.external_id = mapping[r.uid]

        # 3. Register webhook
        from .. import config as app_config
        self_url = f"http://{app_config.HOST}:{app_config.PORT}"
        webhook_registered = backend.register_webhook(ext_project_id, f"{self_url}/api/v1/webhooks/annotation-complete")

        # 4. Signal pipeline to pause
        if not wait_for_completion:
            ctx.variables["__pipeline_should_pause"] = True
            ctx.variables["__annotate_project_id"] = ext_project_id
            ctx.variables["__annotate_backend"] = backend_name
            logger.info(f"AnnotateStep: uploaded {len(records)} records to '{backend_name}' "
                         f"(project={ext_project_id}), pipeline will pause. "
                         f"Webhook registered: {webhook_registered}")
        else:
            # Synchronous mode: poll until done (for small datasets or testing)
            import time
            max_polls = 720  # 1 hour at 5s intervals
            for i in range(max_polls):
                progress = backend.get_progress(ext_project_id)
                if progress.get("completed", 0) >= progress.get("total", 1):
                    break
                time.sleep(5)
            # Pull annotations
            annotations = backend.get_annotations(ext_project_id)
            for ann in annotations:
                task_id = ann.get("task_id", "")
                for r in records:
                    if r.external_id == task_id:
                        r.annotations = ann.get("result", {})
                        r.status = "annotated"
                        break
            logger.info(f"AnnotateStep (sync): completed with {len(annotations)} annotations")

        return ctx

    def _get_stats(self, ctx):
        input_slot = self.params.get("input_slot", "records")
        return {
            "records_uploaded": len(ctx.get_records(input_slot)),
            "backend": self.params.get("backend", ""),
            "paused": ctx.should_pause(),
        }
