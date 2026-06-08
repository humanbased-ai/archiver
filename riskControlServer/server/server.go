package server

import (
	"context"
	"fmt"
	"riskControlServer/config"
	"riskControlServer/dao"
	pb "riskControlServer/pb/gateway/riskcontrol"
	"time"
)

const (
	LOGIN_24H_10   = "LOGIN_24H_10"
	LOGIN_2H_5     = "LOGIN_2H_5"
	WITHDRAW_24H   = "WITHDRAW_24H"
	INVALID_ARGS   = "INVALID_ARGS"
	INTERNAL_ERROR = "INTERNAL_ERROR"
	FORBIDDEN      = "FORBIDDEN"
	OK             = "OK"
)

type RiskControlServer struct {
	pb.UnimplementedRiskControlServerServer
}

func (s *RiskControlServer) LoginAuth(ctx context.Context, in *pb.LoginAuthRequest) (*pb.LoginAuthResponse, error) {
	if in.UserID == "" || (in.Status != 0 && in.Status != 1) {
		return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_INVALID_ARGS), Detail: INVALID_ARGS, Message: "Provided parameters invalid"}, nil
	}

	//如果登陆密码失败，直接返回
	optStatus := dao.StatusFailure
	defer func(status int) {
		dao.InsertUserOperation(&dao.UserOperation{
			AuthUUID:  in.AuthorizeUUID,
			UserID:    in.UserID,
			Operation: dao.OptLogin,
			OptStatus: status,
			CreateAt:  time.Now(),
		})
	}(optStatus)

	if in.Status == pb.LoginAuthRequest_FAILED {
		optStatus = dao.StatusFailure
		return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_FORBIDDEN), Message: "", Detail: FORBIDDEN}, nil
	}

	//TODO: 写入库 optstatus 要区分失败 ,未授权，授权
	//	config.GlobalConfig.LoginBlockCategory
	loginCates := parseLoginCategory(config.GlobalConfig)
	for _, cate := range loginCates {
		fmt.Printf("%s,%s\n",cate.Duration,cate.RetryCount)
		count, err := dao.CountUserOpt(in.UserID, time.Now().Add(-time.Duration(cate.Duration)*time.Second), time.Now(), dao.OptLogin, dao.StatusFailure)
		if err != nil {
			fmt.Printf("count user opt failed %s ,opt: %v\n", err, dao.OptLogin)
			optStatus = dao.StatusAuthFailed
			return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_INTERNAL_ERROR), Message: err.Error(), Detail: INTERNAL_ERROR}, nil
		}
		fmt.Printf("count user opt failed %d \n", count)
		if in.Status == pb.LoginAuthRequest_SUCCEEDED && count > int64(cate.RetryCount) {
			optStatus = dao.StatusAuthFailed
			return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_FORBIDDEN), Message: fmt.Sprintf("User login failed more than %d times", cate.RetryCount), BlockDuration: int64(cate.Duration), Detail: fmt.Sprintf("LOGIN_%dH_%d", cate.Duration/int(3600), cate.RetryCount)}, nil
		}
		if in.Status == pb.LoginAuthRequest_FAILED && count > int64(cate.RetryCount)-1 {
			optStatus = dao.StatusAuthFailed
			return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_FORBIDDEN), Message: fmt.Sprintf("User login failed more than %d times", cate.RetryCount), BlockDuration: int64(cate.Duration), Detail: fmt.Sprintf("LOGIN_%dH_%d", cate.Duration/int(3600), cate.RetryCount)}, nil
		}
	}

	//24h over 10 failed

	//2h over 5 failed
	//	count, err = dao.CountUserOpt(in.UserID, time.Now().Add(-2*time.Hour), time.Now(), dao.OptLogin, dao.StatusFailure)
	//	if err != nil {
	//		fmt.Printf("count user opt failed %s ,opt: %v\n", err, dao.OptLogin)
	//		optStatus = dao.StatusAuthFailed
	//		return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_INTERNAL_ERROR), Message: err.Error()}, nil
	//	}
	//	fmt.Printf("count user opt failed %d \n", count)
	//	if in.Status == 0 && count > 5 {
	//		optStatus = dao.StatusAuthFailed
	//		return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_FORBIDDEN), Message: "user login failed more than 5 times", BlockDuration: int64(2*time.Hour) / int64(time.Second)}, nil
	//	}
	//	if in.Status == 1 && count > 4 {
	//		optStatus = dao.StatusAuthFailed
	//		return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_FORBIDDEN), Message: "user login failed more than 5 times", BlockDuration: int64(24*time.Hour) / int64(time.Second)}, nil
	//	}

	return &pb.LoginAuthResponse{Code: int32(pb.HttpCode_ACTION_OK), BlockDeviceID: ""}, nil
}

func (s *RiskControlServer) WithDrawAuth(ctx context.Context, in *pb.WithdrawAuthRequest) (*pb.WithdrawAuthResponse, error) {

	if len(in.UserID) == 0 {
		return &pb.WithdrawAuthResponse{Code: int32(pb.HttpCode_INVALID_ARGS), Message: "User id is empty", Detail: INVALID_ARGS}, nil
	}
	findOne := dao.QueryUserOperation(in.UserID, time.Now().Add(-time.Duration(config.GlobalConfig.WithdrawBlockCategory)*time.Second), time.Now(), dao.OptChangePasswd, dao.StatusSuccess)
	if findOne == nil {
		return &pb.WithdrawAuthResponse{Code: int32(pb.HttpCode_ACTION_OK)}, nil
	}
	resp := &pb.WithdrawAuthResponse{}
	resp.BlockDuration = int64(time.Until(findOne.CreateAt.Add(time.Duration(config.GlobalConfig.WithdrawBlockCategory)*time.Second))) / int64(time.Second)
	resp.Code = int32(pb.HttpCode_ACTION_FORBIDDEN)
	resp.Detail = fmt.Sprintf("WITHDRAW_%dH", config.GlobalConfig.WithdrawBlockCategory/int(3600))
	return resp, nil
}

func (s *RiskControlServer) ChangePasswdNotify(ctx context.Context, in *pb.ChangePasswdNotifyRequest) (*pb.ChangePasswdNotifyResponse, error) {
	err := dao.InsertUserOperation(&dao.UserOperation{
		AuthUUID:  in.AuthorizeUUID,
		UserID:    in.UserID,
		Operation: dao.OptChangePasswd,
		OptStatus: int(in.Status),
		CreateAt:  time.Now(),
	})
	if err != nil {
		fmt.Errorf("write changepasswd event failed %s \n", err)
	}
	return &pb.ChangePasswdNotifyResponse{}, nil
}

func (s *RiskControlServer) DeviceInfo(ctx context.Context, in *pb.DeviceInfoRequest) (*pb.DeviceInfoResponse, error) {
	//TODO: add exception
	return &pb.DeviceInfoResponse{}, nil
}
