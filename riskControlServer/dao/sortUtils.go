package dao

type UserLogs []*UserOperation

// Len 方法返回切片的长度
func (a UserLogs) Len() int {
	return len(a)
}

// Swap 在索引 i 和 j 之间交换元素
func (a UserLogs) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

// Less 报告第 i 个元素是否应该排在第 j 个元素之前
func (a UserLogs) Less(i, j int) bool {
	return a[i].CreateAt.After(a[j].CreateAt) // 按时间排序，晚的在前
}
