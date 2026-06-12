import ReactDOM from "react-dom/client";
import App from "./App";
import "reactflow/dist/style.css";
import "./styles.css";

// 不开 StrictMode: dev 模式下它会刻意把 effect 跑两遍, 导致每次进 /work 看到
// batches / collect-tasks 各打两次. 生产没这问题, 但这里我们更看重网络面板干净。
// 真要查 effect 副作用 bug, 可临时把 <App/> 包回 React.StrictMode。
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
