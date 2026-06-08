package server

import (
	"fmt"
	"riskControlServer/config"
	"strconv"
	"strings"
)

type Category struct {
	RetryCount int
	Duration   int
}

func parseLoginCategory(conf *config.Config) []*Category {
	var cates = make([]*Category, 0)
	for i := 0; i < len(conf.LoginBlockCategory); i++ {
		strArr := strings.Split(conf.LoginBlockCategory[i], "-")
		if len(strArr) != 2 {
			fmt.Println("invalid login block category")
			continue
		}
		var cate = &Category{}
		cate.Duration, _ = strconv.Atoi(strArr[0])
		cate.RetryCount, _ = strconv.Atoi(strArr[1])
		cates = append(cates, cate)
	}
	return cates
}
