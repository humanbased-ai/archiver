package core

import (
	"gorm.io/datatypes"
	"time"
)

type CfpTaskSubmission struct {
	Id               int            `json:"id,omitempty"`
	GmtCreate        time.Time      `json:"gmt_create,omitempty"`
	GmtModified      time.Time      `json:"gmt_modified,omitempty"`
	ExtInfo          datatypes.JSON `json:"ext_info,omitempty"`
	Env              string         `json:"env,omitempty"`
	Deleted          bool           `json:"deleted,omitempty"`
	SubmissionId     string         `json:"submission_id,omitempty"`
	UserId           string         `json:"user_id,omitempty"`
	TaskId           string         `json:"task_id,omitempty"`
	DataRequirements datatypes.JSON `json:"data_requirements,omitempty"`
	DataSubmission   datatypes.JSON `json:"data_submission,omitempty"`
	RewardInfo       datatypes.JSON `json:"reward_info,omitempty"`
	Status           string         `json:"status,omitempty"`
}

type CfpFrontierTask struct {
	Id               int            `json:"id,omitempty"`
	GmtCreate        time.Time      `json:"gmt_create,omitempty"`
	GmtModified      time.Time      `json:"gmt_modified,omitempty"`
	ExtInfo          datatypes.JSON `json:"ext_info,omitempty"`
	Env              string         `json:"env,omitempty"`
	Deleted          bool           `json:"deleted,omitempty"`
	FrontierId       string         `json:"frontier_id,omitempty"`
	TaskId           string         `json:"task_id,omitempty"`
	AssetInfo        string         `json:"asset_info,omitempty"`
	Name             string         `json:"name,omitempty"`
	DataDisplay      datatypes.JSON `json:"data_display,omitempty"`
	DataRequirements datatypes.JSON `json:"data_requirements,omitempty"`
	RewardInfo       datatypes.JSON `json:"reward_info,omitempty"`
	Status           string         `json:"status,omitempty"`
	LifecycleId      string         `json:"lifecycle_id,omitempty"`
}
