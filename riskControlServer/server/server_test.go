package server

import (
	"fmt"
	"testing"

	"github.com/oriser/regroup"
)

func TestParseCategory(t *testing.T) {
	var category = &Category{}
	var re = regroup.MustCompile(`(?P<Duration>\d+)-(?P<RetryCount>\d+)`)
	err := re.MatchToTarget("86400-5", category)
	if err != nil {
		println(err.Error())
	}
	fmt.Printf("category:%d, %d", category.Duration, category.RetryCount)
}
