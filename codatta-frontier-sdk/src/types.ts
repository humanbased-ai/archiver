// ─── Generic Response Types ──────────────────────────────────────────────────

/**
 * Standard API response wrapper.
 * @template T - The type of the `data` payload.
 */
export interface Response<T> {
  /** The actual response payload. */
  data: T
  /** Whether the request succeeded. Always `true` on success; rejection is handled via `errorCode`. */
  success: true
  /** Error code returned by the server when `success` is false. */
  errorCode: number
  /** Human-readable error message returned by the server when `success` is false. */
  errorMessage: string
}

/**
 * Common pagination parameters used in list API requests.
 */
export interface TPagination {
  /** Current page number, 1-based. */
  page_num: number
  /** Number of items per page. */
  page_size: number
}

/**
 * Standard paginated response wrapper.
 * @template T - The type of the `data` payload (usually an array).
 */
export interface PaginationResponse<T> {
  /** The paginated data payload. */
  data: T
  /** Total number of items matching the query. */
  total: number
  /** Current page number, 1-based. */
  page_num: number
  /** Number of items per page. */
  page_size: number
}

// ─── Enums & Unions ──────────────────────────────────────────────────────────

export type RankingGrade = 'S' | 'A' | 'B' | 'C' | 'D'
export type TaskType = 'submission' | 'validation'
export type TaskTypeName = 'Contribute' | 'Review'
export type ActiveStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED'

// ─── Shared Sub-types ────────────────────────────────────────────────────────

export interface TaskRewardInfo {
  reward_icon: string
  reward_mode: string
  reward_type: string
  reward_value: number
}

export interface VideoItem {
  video_id: string
  desc?: string
  image_url?: string
  video_url: string
}

export interface FashionQuestion {
  content: object
  image_url: string
  source_type: string
  uid: string
}


export interface CMUDataRequirements {
  num: string
  querytext: string
  status: number // 2: finished, other: not finished
  part1: {
    select?: string
    videos: Array<VideoItem>
  }
  part2: {
    videos: Array<VideoItem>
    questions: Array<{
      title: string
      select?: string
      options: Array<{
        value: string
        label: string
        content: string
      }>
    }>
  }
}

// ─── Task Detail ─────────────────────────────────────────────────────────────

/**
 * Full detail of a frontier task, including display data, submission state, and reward info.
 */
export interface TaskDetail {
  /** ID of the frontier this task belongs to. */
  frontier_id: string
  /** Unique task ID. */
  task_id: string
  /** Display name of the task. */
  name: string
  /** Task creation timestamp (Unix ms). */
  create_time: number
  /** Associated submission ID, if any. */
  submission_id: string
  /** Internal task type identifier (e.g. `'submission'`, `'validation'`). */
  task_type: string
  /** Human-readable task type name (e.g. `'Contribute'`, `'Review'`). */
  task_type_name: string
  /** Template ID used to render this task. */
  template_id: string
  data_display: {
    gif_resource: string
    template_id: string
    related_task_id?: string
    hide?: boolean
    link?: string
    bot_id?: string
    data_source?: string
    web_template_url?: string
    app_template_url?: string
  }
  questions?: CMUDataRequirements[] | FashionQuestion[]
  data_submission?: { [key: string]: unknown; lifelog_report?: string }
  /**
   * Question group availability:
   * - `1`: questions available
   * - `2`: no more questions in this group
   * - `3`: need to switch question group
   */
  question_status?: number
  data_requirements: unknown
  /** List of reward configurations for this task. */
  reward_info: readonly TaskRewardInfo[]
  qualification_datas: unknown[]

  /**
   * Current task submission status:
   * - `'PENDING'`: submitted, awaiting review
   * - `'SUBMITTED'`: confirmed on-chain
   * - `'REFUSED'`: rejected by reviewer
   * - `'ADOPT'`: accepted and rewarded
   */
  status: 'PENDING' | 'SUBMITTED' | 'REFUSED' | 'ADOPT'
  /** Block explorer URL for the on-chain transaction. */
  txHashUrl: string
  /** Quality grading result after review (`S` > `A` > `B` > `C` > `D`). */
  result: RankingGrade
  /**
   * On-chain processing status:
   * - `0`: not submitted
   * - `1`: pending
   * - `2`: processing
   * - `3`: confirmed
   * - `4`: failed
   */
  chain_status: 0 | 1 | 2 | 3 | 4
  qualification?: string
  /** Whether the user meets the qualification requirement: `0` = no, `1` = yes. */
  qualification_flag: 0 | 1

  /** User reputation score at submission time. */
  reputation: number
  /** Reward points earned for this task. `null` if not yet settled. */
  reward_points: null | number

  /**
   * User reputation check flag:
   * - `0`: not checked
   * - `1`: passed
   * - `2`: failed
   */
  user_reputation_flag: 0 | 1 | 2
  /** Tags associated with this task. */
  tags: string[]
  /** Reason provided by reviewer when the task is refused. */
  audit_reason?: string

  today_complete_count: number
  total_complete_count: number
  total_count: number
}

// ─── Frontier Info ───────────────────────────────────────────────────────────

export enum MediaName {
  TWITTER = 'x',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WEBSITE = 'website',
  DOC = 'doc'
}

export interface FrontierRewardItem {
  reward_type: string
  reward_type_name: string
  reward_value: number
}

export interface FrontierItemType {
  id?: number
  name: string
  description: string
  logo_url: string
  banner?: string
  media_link?: Array<{
    name: MediaName
    value: string
  }>
  qualification?: string
  videos?: Array<VideoItem>
  reputation_permission?: number
  frontier_id?: string
  adopt_count: number
  rewards: FrontierRewardItem[]
  dataset_url: string | null
}

// ─── Spec Task ──────────────────────────────────────────────────────────────

/**
 * Basic info for a spec task, used by the `/v2/spec/task/*` endpoints.
 */
export interface TaskInfo {
  /** Unique task ID. */
  task_id: string
  /**
   * Task processing status:
   * - `1`: pending / to be processed
   * - `2`: completed / accepted
   */
  status: 1 | 2
  /** Optional freeform content submitted with the task. */
  content?: string
}

// ─── Submission ──────────────────────────────────────────────────────────────

export interface SubmissionReward {
  reward_type: string
  reward_amount: number
}

/**
 * A historical submission record returned by the submission list / detail endpoints.
 */
export interface SubmissionRecord {
  /** Submission timestamp (Unix ms). */
  submission_time: number
  /** Display name of the frontier the task belongs to. */
  frontier_name: string
  /** Display name of the submitted task. */
  task_name: string
  /** Numeric review score. */
  result: number
  /** Letter grade derived from the review score (`S` > `A` > `B` > `C` > `D`). */
  rating_name: RankingGrade
  /**
   * Submission review status:
   * - `'PENDING'`: awaiting review
   * - `'ADOPT'`: accepted and rewarded
   * - `'REFUSED'`: rejected by reviewer
   */
  status: 'ADOPT' | 'PENDING' | 'REFUSED'
  /** Unique submission ID. */
  submission_id: string
  /** Rewards earned for this submission. */
  rewards: SubmissionReward[]
  /** The original data submitted by the user, if available. */
  data_submission?: {
    data: { [key: string]: unknown }
    taskId: string
    templateId: string
  }
}
