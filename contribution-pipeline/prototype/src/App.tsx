import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import StageQueuePage from "./pages/StageQueuePage";
import StageProcessPage from "./pages/StageProcessPage";
import SchemaFormDemoPage from "./pages/SchemaFormDemoPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/tasks/:taskId/stages/:stage" element={<StageQueuePage />} />
        <Route path="/tasks/:taskId/stages/:stage/items/:itemId" element={<StageProcessPage />} />
        <Route path="/schema-form" element={<SchemaFormDemoPage />} />
      </Route>
    </Routes>
  );
}
