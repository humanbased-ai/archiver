package claude3

import (
	"bytes"
	"context"
	"encoding/json"
	"evidenceCheckServer/conf"
	"evidenceCheckServer/log"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"

	match "github.com/alexpantyukhin/go-pattern-match"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrock"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/oriser/regroup"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/uptrace/opentelemetry-go-extra/otelzap"
)

var (
	modelId              string
	bedrockruntimeClient *bedrockruntime.Client
	logger               *otelzap.SugaredLogger

	claude3ExceptCounter = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "claude3_except_total",
		Help: "The total number of claude3 exception.",
	})
)

func Init() {
	logger = log.InitLogger(conf.GlobalConf.LogLevel)

	region := conf.GlobalConf.Claude3Region
	sdkConfig, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))

	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "claude3", "loadConfig", "failure", err.Error(), 0))

		return
	}

	bedrockClient := bedrock.NewFromConfig(sdkConfig)
	result, err := bedrockClient.ListFoundationModels(context.TODO(), &bedrock.ListFoundationModelsInput{})

	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "claude3", "listModels", "failure", err.Error(), 0))
		return
	}

	if len(result.ModelSummaries) == 0 {
		logger.Fatalf(log.FmtLog("", "", "claude3", "listModels", "failure", "no models avaliable", 0))
	}

	for _, modelSummary := range result.ModelSummaries {
		if strings.HasPrefix(*modelSummary.ModelId, "anthropic.claude-3-haiku-20240307-v1:0") {
			modelId = *modelSummary.ModelId
			fmt.Println(*modelSummary.ModelId)
		}
		//if strings.HasPrefix(*modelSummary.ModelId, "anthropic.claude-3-opus-20240229-v1:0") { //}"anthropic.claude-3-haiku-20240307-v1:0") {
		//	modelId = *modelSummary.ModelId
		//	fmt.Println(*modelSummary.ModelId)
		//}
	}
	var client = &http.Client{}
	_, to := match.Match(conf.GlobalConf.AWSTimeouts).
		When(0, 20).
		When(match.ANY, conf.GlobalConf.AWSTimeouts).Result()

	client.Timeout = time.Duration(to.(int)) * time.Second
	sdkConfig.HTTPClient = client
	bedrockruntimeClient = bedrockruntime.NewFromConfig(sdkConfig)
}

func CallBedrock(ctx context.Context, base64_image string) (pb.SubmissionCheckResult_Status, *ImageOcrInfo) {
	//prompt := "you are http server that returns only json without any other words. json include Keys: 1.sendAddrs:[](addr is hash string) 2.sendEntity:(entity length bigger than 4 words, near address,empty if not find or low confident) 3.recvAddrs:[] 4.recvEntity 5.network(bitcoin,ethereum,polygan and so on) "
	prompt := "you are http server that returns only in JSON format without any other words. json include Keys: 1.sendAddrs:[](addr is hash string,must have one) 2.sendEntity:(entity length bigger than 4 words, near address,empty if not find or low confident) 3.recvAddrs:[hash string, must have one] 4.recvEntity 5.network(bitcoin,ethereum,polygan and so on) 6.edited(address/entity/network information in the image has been manipulated with high confidence , true or false),7.phoneScreenSnap(image from phone,true or false) "
	if conf.GlobalConf.Claude3Prompt != "" {
		prompt = conf.GlobalConf.Claude3Prompt
	}

	startTime := time.Now()
	logStatus := "success"
	logReason := ""
	req := ""
	resp := ""
	defer func() {
		if logStatus == "failure" {
			logger.Infof(log.FmtBedrockLog(ctx.Value("traceid").(string), ctx.Value("submissionid").(string), "checkEvidence", "checkImage", logStatus, logReason, int(time.Since(startTime)/time.Millisecond), req, resp))
		}
	}()
	/* demo:
	{
	    "model": "claude-3-opus-20240229",
	    "max_tokens": 1024,
	    "messages": [
	        {"role": "user", "content": [
	            {"type": "image", "source": {
	                "type": "base64",
	                "media_type": "'$IMAGE_MEDIA_TYPE'",
	                "data": "'$IMAGE_BASE64'"
	            }},
	            {"type": "text", "text": "What is in the above image?"}
	        ]}
	    ]
	}'*/
	// 构建请求体
	//data:image/jpeg;base64,/9j/4AA
	base64_image, imageMediaType, err := prepareRequestParameters(base64_image)
	if err != nil {
		logReason = err.Error()
		logStatus = "failure"
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
	}
	// 将请求体序列化为 JSON
	requestBody := buildBedrockRequestBody(base64_image, imageMediaType, prompt)
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		logReason = err.Error()
		logStatus = "failure"
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
	}
	// 发送请求
	var claude3Response = &Claude3Response{}
	modelInput := &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(modelId),
		Accept:      aws.String("*/*"),
		ContentType: aws.String("application/json"),
		Body:        jsonData,
	}
	result, err := bedrockruntimeClient.InvokeModel(context.TODO(), modelInput)
	if err != nil {
		logReason = err.Error()
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE, nil
	}
	//logger.Sugar().Debugf("claude3 response %s", result.Body)

	resp = string(result.Body)
	err = json.Unmarshal(result.Body, &claude3Response)
	if err != nil {
		logReason = err.Error()
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}

	var imageInfo = &ImageOcrInfo{}
	if len(claude3Response.Content) == 0 || (claude3Response.Content[0].Text == "") {
		logReason = "claude3 response content empty"
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}

	err = json.Unmarshal([]byte(claude3Response.Content[0].Text), imageInfo)
	if err != nil {
		logReason = err.Error()
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}
	//如果任何一个信息都不对,
	if !imageInfo.CoinRelated {
		logReason = "image not web3 related"
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
	}

	if len(imageInfo.SendAddrs) == 0 || len(imageInfo.RecvAddrs) == 0 {
		claude3ExceptCounter.Inc()
		logReason = "image address recognize failed"
		logStatus = "failure"
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}

	if !validateAddres(imageInfo.SendAddrs) || !validateAddres(imageInfo.RecvAddrs) {
		logReason = "image address not valid"
		logStatus = "failure"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}
	return pb.SubmissionCheckResult_OK, imageInfo //claude3Response.Content[0].Text
}
func CallClaude3(base64_image string, webpage string) (status pb.SubmissionCheckResult_Status, info *ImageOcrInfo) {
	imageMediaType := "image/png"
	prompt := "you are http server that returns only in JSON format without any other words. json include Keys: 1.sendAddrs:[](addr is hash string) 2.sendEntity:(entity length bigger than 4 words, near address,empty if not find or low confident) 3.recvAddrs:[] 4.recvEntity 5.network(bitcoin,ethereum,polygan and so on) 6. address/entity/network information in the image has been manipulated (true or false) "
	/* demo:
	{
	    "model": "claude-3-opus-20240229",
	    "max_tokens": 1024,
	    "messages": [
	        {"role": "user", "content": [
	            {"type": "image", "source": {
	                "type": "base64",
	                "media_type": "'$IMAGE_MEDIA_TYPE'",
	                "data": "'$IMAGE_BASE64'"
	            }},
	            {"type": "text", "text": "What is in the above image?"}
	        ]}
	    ]
	}'*/
	// 构建请求体
	//data:image/jpeg;base64,/9j/4AA
	if strings.HasPrefix(base64_image, "data:image") {
		base64ImageArr := strings.Split(base64_image, ",")
		var re = regroup.MustCompile(`(?P<data>.*):(?P<media_type>.*);(?P<base64>.*)`)
		matches, err := re.Groups(base64ImageArr[0])
		if err != nil {
			return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
		}
		base64_image = base64ImageArr[1]
		imageMediaType = matches["media_type"]
	} else {
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
	}
	var contentImage = OneContent{
		Type: "image",
		ImageSource: &Source{
			ContentType: "base64",
			MediaType:   imageMediaType,
			Data:        base64_image,
		},
	}
	var contentPrompt = OneContent{
		Type: "text",
		Text: prompt,
	}
	var oneMessage = OneMessage{
		Role:    "user",
		Content: []OneContent{contentImage, contentPrompt},
	}
	requestBody := &Cluade3Req{
		Model:     "claude-3-opus-20240229",
		MaxTokens: 3072,
		Messages:  []OneMessage{oneMessage},
	}
	// 将请求体序列化为 JSON
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
	}

	// 发送请求
	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, nil
		//wont happen here
	}
	req.Header.Set("x-api-key", os.Getenv("ANTHROPIC_API_KEY"))
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE, nil
	}
	defer resp.Body.Close()

	var claude3Response = &Claude3Response{}
	/*{
		"usage": {
			"input_tokens": 1728,
			"output_tokens": 117
		},
		"content": [
			{
				"type": "text",
				"text": "{\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
			}
		],
	}*/
	datas, err := io.ReadAll(resp.Body)
	if err != nil {
		return pb.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE, nil
	}

	// 打印响应
	err = json.Unmarshal(datas, claude3Response)
	if err != nil || claude3Response.Content == nil || len(claude3Response.Content) == 0 {
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}

	var imageInfo = &ImageOcrInfo{}
	err = json.Unmarshal([]byte(claude3Response.Content[0].Text), imageInfo)
	if err != nil {
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, nil
	}
	return pb.SubmissionCheckResult_OK, imageInfo //claude3Response.Content[0].Text
}

func CallBedrockTranslate(ctx context.Context, text string) (pb.SubmissionCheckResult_Status, string, bool) {

	prompt := `
		you are a http server that returns only in JSON format without any other words. json includes only 2 keys, translation and web3_related.Please follow these steps:\n\t\t
		1. Clean the given text . Remove words that has no relation with blockchain or web3. \n\t\t
		2. Then translate the cleaned text into English. Then Fulfill the response key \"translation\" with the translated english text.\n\t\t
		3. Check if given text is web3 transaction or crypto topics related, true or false. \n\t\t
		4. Fulfill the response json with key \"web3_related\" true  if text is blockchain transaction or crypto  related.
		Response For example   text is "ttt"  , response is {\"translation\":\"", \"web3_related\": false} 
		
		The following is the given text 
		<text> %s <text> :`
	// 构建请求体
	//data:image/jpeg;base64,/9j/4AA
	// 将请求体序列化为 JSON

	startTime := time.Now()
	logStatus := "success"
	logReason := ""
	req := text
	resp := ""
	defer func() {
		logger.Infof(log.FmtBedrockLog(ctx.Value("traceid").(string), ctx.Value("submissionid").(string), "checkEvidence", "checkText", logStatus, logReason, int(time.Since(startTime)/time.Millisecond), req, resp))
	}()

	requestBody := buildBedrockTranslateRequestBody(text, prompt)
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		return pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID, "", false
	}
	// 发送请求
	var claude3Response = &Claude3Response{}
	modelInput := &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(modelId),
		Accept:      aws.String("*/*"),
		ContentType: aws.String("application/json"),
		Body:        jsonData,
	}
	result, err := bedrockruntimeClient.InvokeModel(context.TODO(), modelInput)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE, "", false
	}

	resp = string(result.Body)
	err = json.Unmarshal(result.Body, &claude3Response)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, "", false
	}

	var translation = &TextTranslation{}
	if len(claude3Response.Content) == 0 || (claude3Response.Content[0].Text == "") {
		logStatus = "failure"
		logReason = "claude3 response context empty"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, "", false
	}

	err = json.Unmarshal([]byte(claude3Response.Content[0].Text), translation)
	if err != nil {
		logStatus = "failure"
		logReason = "claude3 response context empty"
		claude3ExceptCounter.Inc()
		return pb.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA, "", false
	}
	//如果任何一个信息都不对,
	return pb.SubmissionCheckResult_OK, translation.Translation, translation.Web3Related //claude3Response.Content[0].Text
}

func isBlockAddr(addr string) bool {
	vali := `^[A-Za-z0-9+/=\.]{12,60}$`
	re := regexp.MustCompile(vali)
	return re.MatchString(addr)
}

func validateAddres(addr []string) bool {
	for i, _ := range addr {
		if !isBlockAddr(addr[i]) {
			return false
		}
	}
	return true
}
