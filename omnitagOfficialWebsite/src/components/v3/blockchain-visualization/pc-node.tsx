import React from "react";
import { motion } from "motion/react";
import { Node as NodeType } from "./types";
import { getRightmostBlockX } from "./utils";

interface NodeProps {
  node: NodeType;
  index: number;
  currentStep: number;
}

const NodeComponent = ({ node, index, currentStep }: NodeProps) => {
  const isNew = index === currentStep;
  const rightmostX = getRightmostBlockX(node);

  // 已渲染的节点保持完整视图
  if (node.isRendered && !isNew) {
    return (
      <g>
        <rect
          x={rightmostX} // Center the rectangle (half of width)
          y={92} // Center the rectangle (half of height)
          width={12}
          height={12}
          fill="black"
          transform={`rotate(45, ${rightmostX}, ${92})`} // Rotate 45 degrees around center point (rightmostX, 92)
        />

        {/* 从圆点到方块的竖线 */}
        <line x1={rightmostX} y1={100} x2={rightmostX} y2={150} stroke="black" strokeWidth={1} />

        {/* 方块 */}
        {node.blocks.map((block, blockIndex) => (
          <g key={block.id}>
            <rect
              x={node.x - 30 + blockIndex * 80}
              y={150}
              width={60}
              height={60}
              fill={block.type === "X" ? "black" : "white"}
              stroke="none"
              strokeWidth={1}
            />
            <text
              x={node.x - 30 + blockIndex * 80 + 30}
              y={180}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={block.type === "X" ? "white" : "black"}
              fontSize="24"
              fontWeight="bold"
            >
              {block.type}
            </text>
          </g>
        ))}

        {/* 竖线（先绘制，在状态条下方） */}
        {node.verticalLines &&
          node.verticalLines.map((line, lineIndex) => (
            <line
              key={`vertical-${lineIndex}`}
              x1={line.x}
              y1={210}
              x2={line.x}
              y2={290}
              stroke="black"
              strokeWidth={1}
            />
          ))}

        {/* 状态条（后绘制，遮挡竖线） */}
        {node.indicators.map((indicator, indIndex) => {
          const targetBlock = node.blocks.find((b) => b.id === indicator.targetBlock);
          // Use a default index of 0 if the block isn't found
          const blockIndex = targetBlock ? node.blocks.indexOf(targetBlock) : 0;
          const blockX = node.x - 30 + blockIndex * 80;

          const previousIndicators = node.indicators
            .slice(0, indIndex)
            .filter((i) => i.targetBlock === indicator.targetBlock);
          const indicatorOffset = previousIndicators.length;
          const fixedGap = 8;

          return (
            <g key={indicator.id}>
              {indicator.type === "staking" && (
                <rect x={blockX} y={210 + fixedGap + indicatorOffset * 24} width={60} height={16} fill="#FCA800" />
              )}
              {indicator.type === "verification" && (
                <rect x={blockX} y={210 + fixedGap + indicatorOffset * 24} width={60} height={16} fill="black" />
              )}
            </g>
          );
        })}

        {/* 标签保留在原位置 */}
        <text
          x={
            node.verticalLines && node.verticalLines.length > 0
              ? node.verticalLines[node.verticalLines.length - 1].x
              : node.x
          }
          y={310}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
        >
          {node.label}
        </text>
      </g>
    );
  }

  // 新节点的动画渲染
  return (
    <motion.g key={node.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* 1. 先绘制圆点 */}
      <motion.rect
        x={rightmostX}
        y={92}
        width={12}
        height={12}
        fill="black"
        transform={`rotate(45, ${rightmostX}, ${92})`} // Rotate 45 degrees around center point (rightmostX, 92)
      />

      {/* 2. 从圆点到方块的竖线 */}
      <motion.line
        x1={rightmostX}
        y1={100}
        x2={rightmostX}
        y2={150}
        stroke="black"
        strokeWidth={1}
        initial={{ y2: 100 }}
        animate={{ y2: 150 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />

      {/* 3. 方块和现有的状态条一起出现 */}
      {node.blocks.map((block, blockIndex) => {
        const isNewBlock =
          isNew && node.stateChanges.some((change) => change.type === "block" && change.position === blockIndex);

        // 找出当前方块的已有状态条（非新增的）
        const existingIndicators = node.indicators.filter((indicator) => {
          const hasMatchingBlock = indicator.targetBlock === block.id;
          // 只包含非新增的状态条
          const isExistingIndicator = !node.stateChanges.some(
            (change) => change.type === "indicator" && change.value.id === indicator.id,
          );
          return hasMatchingBlock && isExistingIndicator;
        });

        return (
          <motion.g key={block.id}>
            <motion.rect
              x={node.x - 30 + blockIndex * 80}
              y={150}
              width={60}
              height={60}
              fill={block.type === "X" ? "black" : "white"}
              stroke={isNewBlock ? "#FCA80080" : "none"}
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, stroke: isNewBlock ?  "#FCA80080" : block.type === "X" ? "black" : "white"}}
              transition={{
                duration: 0.5,
                delay: isNewBlock ? 0.8 : 0.8,
                stroke: { delay: isNewBlock ? 1.3 : 0 },
              }}
            />
            <motion.text
              x={node.x - 30 + blockIndex * 80 + 30}
              y={180}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={block.type === "X" ? "white" : "black"}
              fontSize="20"
              fontWeight="bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: isNewBlock ? 0.9 : 0.9 }}
            >
              {block.type}
            </motion.text>

            {/* 与方块一起出现的现有状态条 */}
            {existingIndicators.map((indicator, indIndex) => {
              const previousIndicators = existingIndicators
                .slice(0, indIndex)
                .filter((i) => i.targetBlock === indicator.targetBlock);
              const indicatorOffset = previousIndicators.length;
              const fixedGap = 8;
              const blockX = node.x - 30 + blockIndex * 80;
              return (
                <motion.g
                  key={`existing-${indicator.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }} // 与方块几乎同时出现
                >
                  <motion.rect
                    x={blockX}
                    y={210 + fixedGap + indicatorOffset * 24}
                    width={60}
                    height={16}
                    fill={indicator.type === "staking" ? "#FCA800" : "black"}
                    strokeWidth={1}
                  />
                </motion.g>
              );
            })}
          </motion.g>
        );
      })}

      {/* 4. 从方块下方延伸的竖线（在方块和现有状态条之后，但在新状态条之前） */}
      {/* 如果是初始节点，需要绘制X下的竖线 */}
      {index === 0 && (
        <motion.line
          x1={node.x}
          y1={210}
          x2={node.x}
          y2={295} // 将竖线延长5像素
          stroke="black"
          strokeWidth={1}
          initial={{ y2: 210 }}
          animate={{ y2: 295 }} // 也让动画到295
          transition={{ duration: 0.6, delay: 1.3 }} // 延迟略增加
        />
      )}

      {/* 状态变化的竖线 */}
      {node.stateChanges.map((change, changeIndex) => {
        let verticalX = node.x;
        if (change.type === "block") {
          // Use a default position of 0 if position is undefined
          const position = change.position !== undefined ? change.position : 0;
          verticalX = node.x - 30 + position * 80 + 30;
        } else if (change.type === "indicator") {
          const targetBlock = node.blocks.find((b) => b.id === change.targetBlock);
          // Use a default index of 0 if the block isn't found
          const blockIndex = targetBlock ? node.blocks.indexOf(targetBlock) : 0;
          verticalX = node.x - 30 + blockIndex * 80 + 30;
        }

        return (
          <motion.line
            key={`vertical-down-${changeIndex}`}
            x1={verticalX}
            y1={210}
            x2={verticalX}
            y2={295} // 将第二处竖线也延长5像素
            stroke="black"
            strokeWidth={1}
            initial={{ y2: 210 }}
            animate={{ y2: 295 }} // 匹配动画延伸到新的长度
            transition={{ duration: 0.6, delay: 1.3 }} // 与块同一延迟
          />
        );
      })}

      {/* 5. 新增状态条（在竖线之后绘制） */}
      {node.indicators.map((indicator) => {
        const targetBlock = node.blocks.find((b) => b.id === indicator.targetBlock);
        // Use a default index of 0 if the block isn't found
        const blockIndex = targetBlock !== undefined ? node.blocks.indexOf(targetBlock) : 0;
        const blockX = node.x - 30 + blockIndex * 80;
        const isNewIndicator =
          isNew && node.stateChanges.some((change) => change.type === "indicator" && change.value.id === indicator.id);

        // 只渲染新增的状态条，已有的状态条在方块中已经渲染过了

        // 找出当前方块下同类型的所有状态条
        const sameBlockIndicators = node.indicators.filter((i) => i.targetBlock === indicator.targetBlock);
        // 计算当前新增状态条在方块下的位置
        const indicatorIndex = sameBlockIndicators.indexOf(indicator);
        const fixedGap = 8;

        // 新增的状态条，带动画和文案 - 状态条保持显示，只有文本渐变消失
        return (
          <motion.g
            key={indicator.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.4 }} // 与标签同步显示（竖线绘制后）
          >
            {/* 状态条本身永久保持显示 */}
            <motion.rect
              x={blockX}
              y={210 + fixedGap + indicatorIndex * 24}
              width={60}
              height={16}
              fill={indicator.type === "staking" ? "#FCA800" : "black"}
              stroke={isNewIndicator ? "#FCA80080" : "none"}
              strokeWidth={1}
              // 确保状态条保持显示
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            {/* 只有文本和背景显示2秒后消失 */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{
                opacity: isNewIndicator ? [1, 1, 0] : [0, 0, 0],
              }}
              transition={{
                duration: 3,
                times: [0, 0.95, 1],
              }}
            >
              {/* 文本背景 */}
              <motion.rect
                x={blockX + 30 - 45} // 文本宽度大约 80-90px，中心点偏移一半
                y={210 + fixedGap + indicatorIndex * 24 + 16 + 8} // 文本基线上移 10px
                width={90}
                height={22}
                rx={4}
                fill="#E1E4E9"
                // initial={{ opacity: 0 }}
                // animate={{ opacity: 1 }}
              />
              {/* 文本 */}
              <motion.text
                x={blockX + 30}
                y={210 + fixedGap + indicatorIndex * 24 + 16 + 24} // 状态条底部(y+height) + 24px间距
                fontSize="16"
                textAnchor="middle"
                fill="black"
              >
                {indicator.type === "staking" ? "Staking" : "Verification"}
              </motion.text>
            </motion.g>
          </motion.g>
        );
      })}

      {/* 6. 标签 - 在最后一条竖线下方，初始节点也要显示 */}
      {((node.verticalLines && node.verticalLines.length > 0) || index === 0) && (
        <motion.text
          x={index === 0 ? node.x : node.verticalLines[node.verticalLines.length - 1].x}
          y={320} // 将KP/KV标签往下移10像素
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ 
            duration: 1.2, 
            delay: 1.0,
            opacity: {
              duration: 1.5,
              ease: [0.23, 1, 0.32, 1] // cubicBezier ease
            },
            scale: {
              type: "spring",
              damping: 20,  // 增大阻尼值，减少弹跳
              stiffness: 55, // 降低刺度，使弹性更柔和
              mass: 1.2,     // 增加质量，让动画更自然
              restDelta: 0.001 // 更精确的结束点
            }
          }}
        >
          {node.label}
        </motion.text>
      )}
    </motion.g>
  );
};

// 使用React.memo包装Node组件，并自定义比较函数优化渲染性能
const Node = React.memo(NodeComponent, (prevProps: NodeProps, nextProps: NodeProps) => {
  // 自定义比较函数，仅当关键属性变化时才重新渲染
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.index === nextProps.index &&
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.node.isRendered === nextProps.node.isRendered
  );
});

export default Node;
