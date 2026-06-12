# Codatta Frontier SDK

API client SDK for the Codatta Frontier platform.

## Installation

```bash
npm install codatta-frontier-sdk
```

> **Note**: `axios` is a peerDependency. Make sure `axios >= 1.0.0` is installed in your project.

## Usage

```typescript
import { FrontierSDK } from 'codatta-frontier-sdk'

const sdk = new FrontierSDK()

// Get task detail
const taskDetail = await sdk.getTaskDetail('task-id')

// Get task list
const taskList = await sdk.getTaskList({
  frontier_id: 'frontier-id',
  page_num: 1,
  page_size: 10
})

// Submit a task
const result = await sdk.submitTask('task-id', { field: 'value' })

// Get submission list
const submissions = await sdk.getSubmissionList({
  page_num: 1,
  page_size: 10,
  frontier_id: 'frontier-id'
})

// Get Frontier info
const frontierInfo = await sdk.getFrontierInfo('frontier-id')

// Get submission detail
const submissionDetail = await sdk.getSubmissionDetail('submission-id')

// Upload a file (with optional progress callback)
const uploadResult = await sdk.uploadFile(file, (event) => {
  console.log(`Upload progress: ${Math.round((event.loaded * 100) / (event.total ?? 1))}%`)
})

// Get a single spec task info
const specTask = await sdk.getSpecTaskInfo('task-id')

// Get multiple spec tasks info at once (comma-separated IDs)
const specTasks = await sdk.getSpecTaskInfos('task-id-1,task-id-2,task-id-3')

// Submit a spec task (status: 1 = reject, 2 = accept)
const specResult = await sdk.submitSpecTask('task-id', 'optional content', 2)

// Request a verification code sent to an email
const code = await sdk.getVerificationCode({ email: 'user@example.com' })

// Verify email against a task requirement
const check = await sdk.checkEmail({
  email: 'user@example.com',
  code: '123456',
  task_id: 'task-id'
})
if (check.flag) {
  console.log('Email verified successfully')
} else {
  console.warn('Verification failed:', check.info)
}
```

## API

### `new FrontierSDK()`

Creates an SDK instance. No parameters required — the SDK handles the following automatically:

- **Token**: Retrieved from `cookie` (`auth`) or `localStorage` (`auth`)

### Methods

| Method | Description |
|--------|------------|
| `getTaskDetail(taskId)` | Get task detail |
| `submitTask(taskId, data)` | Submit task data |
| `getTaskList(params)` | Get paginated task list |
| `getSubmissionList(params)` | Get paginated submission list |
| `getFrontierInfo(frontierId)` | Get Frontier detail |
| `getSubmissionDetail(submissionId)` | Get submission detail |
| `uploadFile(file, onProgress?)` | Upload a file |
| `getSpecTaskInfo(taskId)` | Get single spec task info |
| `getSpecTaskInfos(taskIds)` | Get multiple spec tasks info |
| `submitSpecTask(taskId, content?, status?)` | Submit or update a spec task |
| `getVerificationCode(params)` | Request a verification code |
| `checkEmail(params)` | Verify email against a task requirement |

### Method Details

#### `getTaskList(params)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `frontier_id` | `string` | Yes | The frontier to query tasks for |
| `page_num` | `number` | Yes | Page number (1-based) |
| `page_size` | `number` | Yes | Number of tasks per page |
| `task_types` | `string` | No | Comma-separated task type filter (e.g. `'submission,validation'`) |

#### `getSubmissionList(params)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_num` | `number` | Yes | Page number (1-based) |
| `page_size` | `number` | Yes | Number of items per page |
| `frontier_id` | `string` | No | Filter by frontier ID |
| `task_ids` | `string` | No | Comma-separated list of task IDs to filter by |

#### `submitSpecTask(taskId, content?, status?)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | `string` | Yes | Unique task ID |
| `content` | `string` | No | Optional freeform content to attach |
| `status` | `1 \| 2` | No | `1` = reject, `2` = accept (default `2`) |

#### `getVerificationCode(params)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_type` | `string` | No | Account type: `'email'` (default) \| `'block_chain'` |
| `email` | `string` | No | Target email address. Required when `account_type` is `'email'` |
| `opt` | `string` | No | Operation type: `'verify'` (default) \| `'vivolight'` |

Returns the verification code string. Pass it to `checkEmail` to complete verification.

#### `checkEmail(params)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | `string` | Yes | Email address to verify |
| `code` | `string` | Yes | Verification code from `getVerificationCode` |
| `task_id` | `string` | Yes | The task ID requiring email verification |

Returns `{ flag: boolean; info: string }` — `flag: true` if verification passed; `flag: false` with a reason in `info` otherwise.

## Types

Key types exported from `codatta-frontier-sdk`:

| Type | Description |
|------|-------------|
| `Response<T>` | Standard API response wrapper |
| `PaginationResponse<T>` | Paginated response wrapper |
| `TPagination` | Common pagination parameters (`page_num`, `page_size`) |
| `TaskDetail` | Full details of a frontier task, including display data, submission state, and reward info |
| `FrontierItemType` | Frontier metadata, configuration, and reward structure |
| `SubmissionRecord` | Historical submission record returned by the submission list / detail endpoints |
| `TaskInfo` | Spec task info used by the `/v2/spec/task/*` endpoints |
| `TaskRewardInfo` | Reward configuration attached to a task |
| `RankingGrade` | Quality grade: `'S' \| 'A' \| 'B' \| 'C' \| 'D'` |
| `TaskType` | Task category: `'submission' \| 'validation'` |
| `ActiveStatus` | Frontier status: `'ACTIVE' \| 'INACTIVE' \| 'COMPLETED'` |
| `MediaName` | Social media identifiers used in frontier media links |

## Build

```bash
npm run build
```

Outputs ESM (`dist/index.mjs`), CJS (`dist/index.cjs`), and type declaration files.
