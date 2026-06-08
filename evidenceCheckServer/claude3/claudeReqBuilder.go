package claude3

import (
	"errors"
	"fmt"
	"strings"

	"github.com/oriser/regroup"
)

func buildBedrockRequestBody(base64_image string, imageMediaType string, prompt string) *BedrockReq {
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
	requestBody := &BedrockReq{
		AnthropicVersion: "bedrock-2023-05-31",
		MaxTokens:        1024,
		Messages:         []OneMessage{oneMessage},
	}
	return requestBody
}

//nolint:all
func buildClaude3RequestBody(base64_image string, imageMediaType string, prompt string) *Cluade3Req {
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
		MaxTokens: 1024,
		Messages:  []OneMessage{oneMessage},
	}
	return requestBody
}

func prepareRequestParameters(base64_image string) (string, string, error) {
	imageMediaType := "image/png"
	if strings.HasPrefix(base64_image, "data:image") {
		base64ImageArr := strings.Split(base64_image, ",")
		var re = regroup.MustCompile(`(?P<data>.*):(?P<media_type>.*);(?P<base64>.*)`)
		matches, err := re.Groups(base64ImageArr[0])
		if err != nil {
			return "", "", err
		}
		base64_image = base64ImageArr[1]
		imageMediaType := matches["media_type"]
		return base64_image, imageMediaType, nil
	} else {
		return base64_image, imageMediaType, errors.New("base64 image has no prefix data:image")
	}
}

func buildBedrockTranslateRequestBody(text string, prompt string) *BedrockReq {
	var contentPrompt = OneContent{
		Type: "text",
		Text: fmt.Sprintf(prompt, text),
	}
	var oneMessage = OneMessage{
		Role:    "user",
		Content: []OneContent{contentPrompt},
	}
	requestBody := &BedrockReq{
		AnthropicVersion: "bedrock-2023-05-31",
		MaxTokens:        1024,
		Messages:         []OneMessage{oneMessage},
	}
	return requestBody
}
