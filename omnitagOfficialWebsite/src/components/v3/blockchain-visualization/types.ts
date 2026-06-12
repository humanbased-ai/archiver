// Types for the blockchain visualization component

export interface Block {
  type: "X" | "Y";
  id: string;
  status: "pending" | "staked" | "verified" | "complete";
}

export interface VerticalLine {
  x: number;
}

export interface Indicator {
  type: "staking" | "verification";
  id: string;
  targetBlock: string;
}

export interface StateChange {
  type: "block" | "indicator" | "reset" | "newRound";
  value: any; // Using any to avoid complex type constraints
  position?: number;
  targetBlock?: string;
}

export interface Node {
  id: string;
  x: number;
  label: string;
  blocks: Block[];
  indicators: Indicator[];
  stateChanges: StateChange[];
  verticalLines: VerticalLine[];
  isRendered: boolean;
}

export interface GenerateNextNodeResult {
  reset: boolean;
  newNode: Node;
  newRound?: boolean;
}
