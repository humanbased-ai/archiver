import { Block, GenerateNextNodeResult, Indicator, Node, StateChange } from "./types";
import { BLOCK_WIDTH, BLOCK_SPACING, DEFAULT_INITIAL_X, NODE_SPACING } from "./constants";

// 计算节点最右边方块的X坐标
export const getRightmostBlockX = (node: Node): number => {
  const blockCount = node.blocks.length;
  return node.x - 30 + (blockCount - 1) * BLOCK_SPACING + BLOCK_WIDTH / 2;
};

// 生成唯一ID
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// 生成初始节点
export const generateInitialNode = (): Node => {
  return {
    id: generateUniqueId("node-KP0"),
    x: DEFAULT_INITIAL_X,
    label: "KP0",
    blocks: [{ type: "X", id: generateUniqueId("x-0"), status: "complete" }],
    indicators: [],
    stateChanges: [],
    verticalLines: [{ x: DEFAULT_INITIAL_X }], // 初始就有一条竖线
    isRendered: false,
  };
};

// 生成新一轮的初始节点函数
// 每一轮开始时创建新的X节点，但保留之前的节点
export const generateResetNode = (previousNode: Node): GenerateNextNodeResult => {
  // 计算新的位置，在前一个节点之后
  const previousRightmostX = getRightmostBlockX(previousNode);
  const newX = previousRightmostX + NODE_SPACING - BLOCK_WIDTH / 2 + 30;
  // 初始化一个新的节点，只有一个X块，但位置连接到前一个节点
  const newNode: Node = {
    id: generateUniqueId(`node-KP0-round-${Date.now()}`),
    x: newX,
    label: "KP0",
    blocks: [{ type: "X", id: generateUniqueId("x-0"), status: "complete" }],
    indicators: [],
    stateChanges: [{ type: "newRound", value: true }], // 使用newRound类型而不是reset
    verticalLines: [{ x: newX }],
    isRendered: false,
  };

  return {
    reset: false, // 将reset标志设为false，表示不完全重置视图
    newNode,
    newRound: true, // 添加新的标志表示这是新一轮的开始
  };
};

// 判断Y块的状态
export const getYStatus = (block: Block, indicators: Indicator[]): "invalid" | "verified" | "staked" | "pending" => {
  if (!block || block.type !== "Y") return "invalid";

  const hasVerification = indicators.some((i) => i.type === "verification" && i.targetBlock === block.id);

  if (hasVerification) return "verified";

  const hasStaking = indicators.some((i) => i.type === "staking" && i.targetBlock === block.id);

  if (hasStaking) return "staked";

  return "pending";
};

// 生成下一个节点

// 生成下一个节点
export const generateNextNode = (
  previousNode: Node,
  nodeIndex: number,
  kvCounter: number,
  kpCounter: number,
  setKvCounter: (count: number) => void,
  setKpCounter: (count: number) => void,
): GenerateNextNodeResult => {
  const previousRightmostX = getRightmostBlockX(previousNode);
  const x = previousRightmostX + NODE_SPACING - BLOCK_WIDTH / 2 + 30;

  const newBlocks = previousNode.blocks.map((block) => ({ ...block }));
  const newIndicators = previousNode.indicators.map((i) => ({ ...i }));
  const stateChanges: StateChange[] = [];
  const verticalLines = previousNode.verticalLines ? [...previousNode.verticalLines] : [];

  // 获取不同状态的Y块
  const stakedUnverifiedY = newBlocks.filter(
    (block) => block.type === "Y" && getYStatus(block, newIndicators) === "staked",
  );

  const pendingY = newBlocks.filter((block) => block.type === "Y" && getYStatus(block, newIndicators) === "pending");

  // 随机打乱Y块的顺序，使操作更随机
  const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // 打乱待处理和已质押的Y块顺序
  const shuffledPendingY = shuffleArray(pendingY);
  const shuffledStakedY = shuffleArray(stakedUnverifiedY);

  const yBlocks = newBlocks.filter((b) => b.type === "Y");
  const allYVerified = yBlocks.length === 0 || yBlocks.every((b) => getYStatus(b, newIndicators) === "verified");

  // 更随机地决定下一步操作
  const operations: string[] = [];
  const maxYBlocks = 3; // Y块的最大数量

  // 添加所有可能的操作，每个操作都有不同的权重

  // 1. 验证已质押的Y块
  if (stakedUnverifiedY.length > 0) {
    // 多次添加以增加权重
    operations.push("verify_staked");
    operations.push("verify_staked"); // 增加权重，提高选中概率
  }

  // 2. 质押未质押的Y块 - 只有30%的概率
  if (pendingY.length > 0) {
    // 质押的权重较低，只添加一次
    operations.push("stake_pending");
  }

  // 3. 直接验证未质押的Y块
  if (pendingY.length > 0) {
    // 多次添加以增加权重
    operations.push("verify_pending");
    operations.push("verify_pending"); // 增加权重，提高选中概率
  }

  // 4. 添加新的Y块 - 只要没有达到最大数量就可以添加
  if (yBlocks.length < maxYBlocks) {
    // 多次添加以增加权重
    operations.push("add_new_y");
    operations.push("add_new_y");
    operations.push("add_new_y"); // 增加权重，提高选中概率
  }

  // 5. 重置 - 只有当所有Y块都验证过后才可以重置
  if (allYVerified && yBlocks.length >= 3) {
    // 当所有Y都验证了且数量足够，有机会重置
    const resetProbability = 0.3; // 30%的概率重置

    if (yBlocks.length >= maxYBlocks || Math.random() < resetProbability) {
      operations.push("reset");
    }
  }

  // 如果没有操作可执行，默认添加新的Y块或重置
  if (operations.length === 0) {
    if (yBlocks.length < maxYBlocks) {
      operations.push("add_new_y");
    } else {
      operations.push("reset");
    }
  }

  // 检查是否需要开始新一轮
  // 只有当所有Y块都验证过后才可以开始新一轮，或者到达了最大节点数
  const maxNodeCount = 15; // 最大节点数
  const shouldStartNewRound = (allYVerified && yBlocks.length >= 3) || nodeIndex >= maxNodeCount;

  if (shouldStartNewRound) {
    // 重置计数器
    setKvCounter(0);
    setKpCounter(1);
    return generateResetNode(previousNode);
  }

  // 随机选择一个操作
  const selectedOperation = operations[Math.floor(Math.random() * operations.length)];

  // 执行选中的操作
  switch (selectedOperation) {
    case "verify_staked": {
      // 验证已质押的Y块 - 使用打乱后的数组
      const targetY = shuffledStakedY[0]; // 使用打乱后的数组中的第一个元素
      const verificationIndicator: Indicator = {
        type: "verification",
        id: `verification-${nodeIndex}-${targetY.id}`,
        targetBlock: targetY.id,
      };
      newIndicators.push(verificationIndicator);
      targetY.status = "verified";
      stateChanges.push({
        type: "indicator" as const,
        value: verificationIndicator,
        targetBlock: targetY.id,
      } as StateChange);

      const targetBlock = newBlocks.find((b) => b.id === targetY.id);
      if (targetBlock) {
        const blockIndex = newBlocks.indexOf(targetBlock);
        verticalLines.push({ x: x - 30 + blockIndex * 80 + 30 });
      }
      break;
    }

    case "stake_pending": {
      // 质押一个待处理的Y块 - 使用打乱后的数组
      const targetY = shuffledPendingY[0]; // 使用打乱后的数组中的第一个元素
      const stakingIndicator: Indicator = {
        type: "staking",
        id: `staking-${nodeIndex}-${targetY.id}`,
        targetBlock: targetY.id,
      };
      newIndicators.push(stakingIndicator);
      stateChanges.push({
        type: "indicator" as const,
        value: stakingIndicator,
        targetBlock: targetY.id,
      } as StateChange);

      const targetBlock = newBlocks.find((b) => b.id === targetY.id);
      if (targetBlock) {
        const blockIndex = newBlocks.indexOf(targetBlock);
        verticalLines.push({ x: x - 30 + blockIndex * 80 + 30 });
      }
      break;
    }

    case "verify_pending": {
      // 直接验证一个待处理的Y块 - 使用打乱后的数组
      const targetY = shuffledPendingY[0]; // 使用打乱后的数组中的第一个元素
      const verificationIndicator: Indicator = {
        type: "verification",
        id: `verification-${nodeIndex}-${targetY.id}`,
        targetBlock: targetY.id,
      };
      newIndicators.push(verificationIndicator);
      targetY.status = "verified";
      stateChanges.push({
        type: "indicator" as const,
        value: verificationIndicator,
        targetBlock: targetY.id,
      } as StateChange);

      const targetBlock = newBlocks.find((b) => b.id === targetY.id);
      if (targetBlock) {
        const blockIndex = newBlocks.indexOf(targetBlock);
        verticalLines.push({ x: x - 30 + blockIndex * 80 + 30 });
      }
      break;
    }

    case "add_new_y": {
      // 添加新的Y块
      const newBlock: Block = {
        type: "Y",
        id: `y-${nodeIndex}-${newBlocks.length}`,
        status: "pending",
      };
      newBlocks.push(newBlock);
      stateChanges.push({
        type: "block" as const,
        value: newBlock,
        position: newBlocks.length - 1,
      } as StateChange);

      verticalLines.push({ x: x - 30 + (newBlocks.length - 1) * 80 + 30 });
      break;
    }

    case "reset": {
      return generateResetNode(previousNode);
    }
  }

  // 确定节点类型和标签
  // 检查该竖线上是否有验证状态条
  const hasVerificationOnLine = stateChanges.some((change) => {
    if (change.type === "indicator" && change.value.type === "verification") {
      return true;
    }
    return false;
  });

  const currentKvCount = kvCounter;
  const currentKpCount = kpCounter;

  // 界面上显示的label将使用KV和KP标记
  // 只有当有验证状态条时才使用KV，其他情况都使用KP
  const label = hasVerificationOnLine ? `KV${currentKvCount}` : `KP${currentKpCount}`;
  const labelPrefix = hasVerificationOnLine ? `node-KV${currentKvCount}` : `node-KP${currentKpCount}`;

  // 注意：这里不再写入nodeId变量，因为我们使用label标识显示
  // 而使用generateUniqueId函数生成实际的唯一ID
  if (hasVerificationOnLine) {
    // 仅当竖线上有验证状态条时才是KV
    setKvCounter(currentKvCount + 1);
  } else {
    // 其他情况都是KP
    setKpCounter(currentKpCount + 1);
  }

  return {
    reset: false,
    newNode: {
      id: generateUniqueId(labelPrefix),
      x: x,
      label: label,
      blocks: newBlocks,
      indicators: newIndicators,
      stateChanges: stateChanges,
      verticalLines: verticalLines,
      isRendered: false,
    },
  };
};
