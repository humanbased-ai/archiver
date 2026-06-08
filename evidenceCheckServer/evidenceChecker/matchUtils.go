package evidencechecker

import (
	"strings"

	"github.com/adrg/strutil"
	"github.com/adrg/strutil/metrics"
)

// 使用编辑距离来判定是否相似，
func someMatch(predicts []string, label string, threshold float64) bool {
	for _, predict := range predicts {
		similarity := strutil.Similarity(predict, label, metrics.NewJaroWinkler())
		checkLogger.Debugf("simi %s : %s, similarity: %f, threshold:%f", predict, label, similarity, threshold)
		if similarity > threshold {
			return true
		}
	}
	return false
}

func fuzzyMatchCaseInsentive(small string, big string, threshold float64) bool {
	if len(small) == 0 || len(big) == 0 {
		return false
	}
	lowersmall := strings.ToLower(small)
	lowerbig := strings.ToLower(big)
	if strings.Contains(lowerbig, lowersmall) {
		return true
	}
	//checkLogger.Sugar().Infof("lower small, %s, lower big: %s", lowersmall, lowerbig)
	similarity := strutil.Similarity(lowerbig, lowersmall, metrics.NewJaroWinkler())
	checkLogger.Debugf("simi %s : %s, similarity: %f, threshold:%f", lowerbig, lowersmall, similarity, threshold)
	return similarity > threshold
}
