import { useMemo } from "react";
import CodeMirror, { keymap, EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";

// CM6 React 包装 — 节点调试面板 + (未来) pipeline 编辑器 step.params.script 公用.
//
// 关键设计:
//   - JS / JSON 模式: 行号 / 高亮 / 括号匹配 / 自动缩进 / 折叠
//   - 语法错误标红: 基于 Lezer 解析树 (syntaxTree), 遍历 isError 节点转 Diagnostic.
//     不依赖 acorn — Lezer 解析器本身就容错且实时, 已经标好了错误节点
//   - Cmd+Enter / Ctrl+Enter: 触发外层 onSubmit (一般是 "试运行" 按钮的 handler)
//   - 受控: value/onChange 用; defaultValue 不支持 (避免双重 source-of-truth)
//   - 不引入 Monaco — CM6 体积 ~200KB, 满足 90% 在线脚本平台体感

// Lezer 解析时遇到语法错误会插入 ⚠ 节点 (node.type.isError = true).
// linter 把这些节点位置转成 Diagnostic, CM6 自动给问题位置画下划线 + 在 gutter 标红点.
const syntaxLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  syntaxTree(view.state).iterate({
    enter: (node) => {
      if (node.type.isError) {
        diagnostics.push({
          from: node.from,
          to: node.to === node.from ? Math.min(node.from + 1, view.state.doc.length) : node.to,
          severity: "error",
          message: `语法错误 — 期望 ${node.type.name === "⚠" ? "合法 token" : node.type.name}`,
        });
      }
    },
  });
  return diagnostics;
});

type Language = "javascript" | "json";

interface Props {
  language: Language;
  value: string;
  onChange: (v: string) => void;
  /** Cmd/Ctrl+Enter 触发 — 用于"试运行" */
  onSubmit?: () => void;
  /** 最小高度 (px). 内容更多时编辑器会自动延展 */
  minHeight?: number;
  /** 最大高度 (px). 超过时编辑器内滚动 */
  maxHeight?: number;
  /** 只读模式 — readonly 数据展示 (例: dry-run 结果) */
  readOnly?: boolean;
  /** 可选 placeholder, 空内容时显示 */
  placeholder?: string;
}

export function CodeEditor({
  language, value, onChange, onSubmit,
  minHeight = 120, maxHeight = 360, readOnly = false, placeholder,
}: Props) {
  const extensions = useMemo(() => {
    const langExt = language === "javascript" ? javascript({ jsx: false, typescript: false }) : json();
    const submitKey = onSubmit
      ? keymap.of([
          { key: "Mod-Enter", run: () => { onSubmit(); return true; } },
        ])
      : null;
    const exts: any[] = [langExt, EditorView.lineWrapping, syntaxLinter, lintGutter()];
    if (submitKey) exts.push(submitKey);
    return exts;
  }, [language, onSubmit]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      readOnly={readOnly}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: !readOnly,
        bracketMatching: true,
        autocompletion: true,
        foldGutter: true,
        indentOnInput: true,
        history: true,
        tabSize: 2,
      }}
      style={{
        fontSize: 13,
        border: "1px solid #d1d5db",
        borderRadius: 4,
        overflow: "hidden",
      }}
      minHeight={`${minHeight}px`}
      maxHeight={`${maxHeight}px`}
    />
  );
}
