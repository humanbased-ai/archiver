package evidencechecker

import pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"

type Message struct {
	Index  int
	Value  *pb.SubmissionCheckResult
	ToSave string
}

// 根据 sort.Interface 实现 Len 方法
func (a MessageArray) Len() int {
	return len(a)
}

// 根据 sort.Interface 实现 Less 方法，用于比较两个元素
// 这里我们根据 Index 字段进行比较
func (a MessageArray) Less(i, j int) bool {
	return a[i].Index < a[j].Index
}

// 根据 sort.Interface 实现 Swap 方法
func (a MessageArray) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

// MessageArray 是 Message 切片的一个别名，用于实现 sort.Interface
type MessageArray []Message
