import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";

import Node from "./pc-node";
import { generateInitialNode, getRightmostBlockX, generateNextNode } from "./utils";
import { VISIBLE_WIDTH } from "./constants";
import { Node as NodeType } from "./types";
import { cn } from "@udecode/cn";

// Animation constants
const AUTO_PLAY_INTERVAL = 2065; // Auto-play interval (ms)
const ANIMATION_DURATION = 0.964; // Animation duration (seconds)
const CLEANUP_DELAY = 5000; // Delay before removing nodes that are out of view (ms)

interface PCVisualizationProps {
  className?: string;
  containerWidth: number;
}

const PCVisualization: React.FC<PCVisualizationProps> = ({ className, containerWidth }) => {
  // 使用 framer-motion 的 useInView 监听 SVG 是否在可视区
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const inView = useInView(svgRef, { once: false });
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying] = useState(true);
  // 计算section容器的左边距
  const calculateSectionOffset = () => {
    const windowWidth = window.innerWidth;
    if (windowWidth >= 1024) {
      // lg breakpoint
      // section容器宽度为1448px，居中显示
      return (windowWidth - 1448) / 2; // 24px 是 px-6 的左padding
    } else {
      return 24; // 移动端时只需考虑 px-6 的左padding
    }
  };

  const [viewOffset, setViewOffset] = useState(calculateSectionOffset());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State for node counters
  const [nodeCounter, setNodeCounter] = useState(1);
  const [kvCounter, setKvCounter] = useState(0);
  const [kpCounter, setKpCounter] = useState(1);

  // Track visible nodes and rounds
  const [roundsData, setRoundsData] = useState<{ roundId: number; startNodeIndex: number; endNodeIndex: number }[]>([]);

  // Initialize with the first node
  useEffect(() => {
    // 只在组件挂载时初始化一次节点
    const initialNode = generateInitialNode();
    setNodes([initialNode]);

    // 在组件卸载时清理所有计时器
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  // 只要重新进入视口就重置动画
  useEffect(() => {
    if (inView) {
      const initialNode = generateInitialNode();
      setNodes([initialNode]);
      setCurrentStep(0);
      setNodeCounter(1);
      setKvCounter(0);
      setKpCounter(1);
      setRoundsData([]);
      setViewOffset(calculateSectionOffset());
    }
  }, [inView]);

  // 监听窗口大小变化，更新viewOffset
  useEffect(() => {
    const handleResize = () => {
      setViewOffset(calculateSectionOffset());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 优化生成下一个节点的函数，使用useCallback确保引用稳定性
  const generateNextNodeWithState = useCallback(() => {
    if (nodes.length === 0) return;

    const result = generateNextNode(
      nodes[nodes.length - 1],
      nodeCounter,
      kvCounter,
      kpCounter,
      setKvCounter,
      setKpCounter,
    );

    // Add the new node
    const newNode = { ...result.newNode, isRendered: false };

    if (result.newRound) {
      // Update rounds data for the new round
      setRoundsData((prev) => [
        ...prev,
        {
          roundId: prev.length > 0 ? prev[prev.length - 1].roundId + 1 : 0,
          startNodeIndex: nodes.length,
          endNodeIndex: nodes.length, // Will be updated as new nodes are added
        },
      ]);

      // Add the new node without resetting
      setNodes((prev) => [...prev, newNode]);
      setCurrentStep((prev) => prev + 1);
      setNodeCounter(1); // Reset node counter for the new round
    } else {
      // Update the end index of the current round
      if (roundsData.length > 0) {
        setRoundsData((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].endNodeIndex = nodes.length;
          return updated;
        });
      }

      // Add the new node
      setNodes((prev) => [...prev, newNode]);
      setCurrentStep((prev) => prev + 1);
      setNodeCounter((prev) => prev + 1);
    }
  }, [nodes, nodeCounter, kvCounter, kpCounter, roundsData, setKvCounter, setKpCounter]);

  // Auto-play functionality - 优化使用useCallback封装的函数
  useEffect(() => {
    if (!isPlaying) return;

    // Set up the timer for auto-play
    const timer = setTimeout(() => {
      if (currentStep < nodes.length - 1) {
        // Move to the next existing node
        setCurrentStep((prev) => prev + 1);
      } else {
        // 使用优化后的函数生成新节点
        generateNextNodeWithState();
      }
    }, AUTO_PLAY_INTERVAL);

    timerRef.current = timer;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentStep, nodes, nodeCounter, kvCounter, kpCounter, roundsData, generateNextNodeWithState]);

  // 计算视图偏移量 - 使用useMemo优化计算，避免不必要的重复计算
  const calculatedViewOffset = useMemo(() => {
    if (nodes.length === 0 || currentStep >= nodes.length) return viewOffset;

    // Get the rightmost position of the current node
    const currentNode = nodes[currentStep];
    const rightmostX = getRightmostBlockX(currentNode);

    // Calculate target offset - negative value means moving left
    const viewportWidth = containerWidth || VISIBLE_WIDTH;
    const targetOffset = -Math.max(0, rightmostX - viewportWidth + 300);

    // 计算新的偏移量，但不设置状态
    if (currentStep === nodes.length - 1 && currentStep > 0) {
      return targetOffset;
    } else if (rightmostX + viewOffset > viewportWidth - 100) {
      return targetOffset;
    }

    return viewOffset;
  }, [nodes, currentStep, viewOffset, containerWidth]);

  // 只有当计算的偏移量变化时，才更新状态
  useEffect(() => {
    if (viewOffset !== calculatedViewOffset) {
      setViewOffset(calculatedViewOffset);
    }
  }, [calculatedViewOffset, viewOffset]);

  // 标记当前节点为已渲染
  useEffect(() => {
    if (nodes.length === 0 || currentStep >= nodes.length) return;

    if (!nodes[currentStep].isRendered) {
      setNodes((prev) => {
        // 避免不必要的状态更新 - 只有当节点未渲染时才更新
        const updated = [...prev];
        updated[currentStep] = {
          ...updated[currentStep],
          isRendered: true,
        };
        return updated;
      });
    }
  }, [nodes, currentStep]);

  // 单独的清理逻辑，减少不必要的触发
  useEffect(() => {
    // 只在视图偏移量发生变化时，才启动清理检查
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
    }

    cleanupTimerRef.current = setTimeout(() => {
      // 只有当有至少2轮数据且视图已经移动过时才执行清理
      if (roundsData.length >= 2 && viewOffset < 0) {
        const leftEdgeOfView = -viewOffset;

        // 找到第一个应该被移除的轮次，使用优化的算法
        let roundToRemoveIndex = -1;
        let nodesToRemove = 0;

        // 使用优化的循环，找到所有可移除的轮次并批量处理
        for (let i = 0; i < roundsData.length - 1; i++) {
          const round = roundsData[i];
          if (round.endNodeIndex >= nodes.length) continue; // 安全检查

          const lastNodeInRound = nodes[round.endNodeIndex];
          if (!lastNodeInRound) continue;

          const rightmostXOfRound = getRightmostBlockX(lastNodeInRound);

          if (rightmostXOfRound < leftEdgeOfView - 100) {
            roundToRemoveIndex = i;
            nodesToRemove = round.endNodeIndex + 1;
            break;
          }
        }

        if (roundToRemoveIndex >= 0 && nodesToRemove > 0) {
          const updatedNodes = nodes.slice(nodesToRemove);
          const updatedRoundsData = roundsData.slice(roundToRemoveIndex + 1).map((r) => ({
            ...r,
            startNodeIndex: r.startNodeIndex - nodesToRemove,
            endNodeIndex: r.endNodeIndex - nodesToRemove,
          }));
          const updatedCurrentStep = Math.max(0, currentStep - nodesToRemove);

          setNodes(updatedNodes);
          setRoundsData(updatedRoundsData);
          setCurrentStep(updatedCurrentStep);
        }
      }
    }, CLEANUP_DELAY);
  }, [currentStep, nodes, viewOffset, containerWidth, roundsData]);

  const connectionLines = useMemo(() => {
    if (nodes.length === 0) return [];

    return nodes
      .slice(0, currentStep + 1)
      .map((node, index) => {
        if (index === 0) return null;

        const prevNodeX = getRightmostBlockX(nodes[index - 1]);
        const currentNodeX = getRightmostBlockX(node);

        return (
          <motion.line
            key={`line-${index}`}
            x1={prevNodeX}
            y1={100}
            x2={currentNodeX}
            y2={100}
            stroke="black"
            strokeWidth={1}
            initial={{ x2: prevNodeX }}
            animate={{ x2: currentNodeX }}
            transition={{ duration: 0.8 }}
          />
        );
      })
      .filter(Boolean);
  }, [nodes, currentStep]);

  const visibleNodes = useMemo(() => {
    return nodes
      .slice(0, currentStep + 1)
      .map((node, index) => <Node key={node.id} node={node} index={index} currentStep={currentStep} />);
  }, [nodes, currentStep]);

  const darkLineLength = useMemo(() => {
    if (nodes.length === 0) return 0;
    return getRightmostBlockX(nodes[0]);
  }, [nodes]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${containerWidth || VISIBLE_WIDTH} 350`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
      className={cn("font-sora", className)}
    >
      <line x1={0} y1={100} x2={4000} y2={100} stroke="#ccc" strokeWidth={1} />

      <g
        style={{
          transform: `translateX(${viewOffset}px)`,
          transition: `transform ${ANIMATION_DURATION}s ease-in-out`,
          willChange: "transform",
        }}
      >
        {nodes.length > 0 && <line x1={0} y1={100} x2={darkLineLength} y2={100} stroke="black" strokeWidth={1} />}

        <AnimatePresence>{connectionLines}</AnimatePresence>
        <AnimatePresence>{visibleNodes}</AnimatePresence>
      </g>
    </svg>
  );
};

export default React.memo(PCVisualization);

// 优化Node组件，使用React.memo减少重复渲染
/* 
注意：这里只是提示，实际修改需要在pc-node.tsx文件中进行

const Node: React.FC<NodeProps> = React.memo(({ node, index, currentStep }) => {
  // 组件内容
}, (prevProps, nextProps) => {
  // 自定义比较函数，只有在关键属性变化时才重新渲染
  return (
    prevProps.node.id === nextProps.node.id && 
    prevProps.index === nextProps.index &&
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.node.isRendered === nextProps.node.isRendered
  );
});
*/
