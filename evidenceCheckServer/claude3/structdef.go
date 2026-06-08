package claude3

type Source struct {
	ContentType string `json:"type"`
	MediaType   string `json:"media_type"`
	Data        string `json:"data"`
}
type OneContent struct {
	Type        string  `json:"type"`
	ImageSource *Source `json:"source,omitempty"`
	Text        string  `json:"text,omitempty"`
}
type OnePrompt struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type OneMessage struct {
	Role    string       `json:"role"`
	Content []OneContent `json:"content"`
}
type Cluade3Req struct {
	Model     string       `json:"model"`
	MaxTokens int          `json:"max_tokens"`
	Messages  []OneMessage `json:"messages"`
}
type BedrockReq struct {
	AnthropicVersion string       `json:"anthropic_version,omitempty"`
	MaxTokens        int          `json:"max_tokens,omitempty"`
	Temperature      float32      `json:"temperature,omitempty"`
	Messages         []OneMessage `json:"messages"`
}

type UsageInfo struct {
	InputToken  int `json:"input_tokens"`
	OutputToken int `json:"output_tokens"`
}

// "text": "{\n  \"sendAddrs\": [\n    \"0xe22434cca7f03cb4d3d26029e1df1648738f3ca1\"\n  ],\n  \"sendEntity\": \"Exchange: Bithumb\",\n  \"recvAddrs\": [\n    \"0xef1d3ed13a11126d638e15512419abb1fa1f829\"\n  ],\n  \"recvEntity\": \"\",\n  \"network\": \"polygon\"\n}"
type ImageOcrInfo struct {
	CoinRelated bool     `json:"coinRelated"`
	SendAddrs   []string `json:"sendAddrs"`
	SendEntity  string   `json:"sendEntity"`
	RecvAddrs   []string `json:"recvAddrs"`
	RecvEntity  string   `json:"recvEntity"`
	Network     string   `json:"network"`
	Edited      bool     `json:"edited"`
	FromPhone   bool     `json:"fromPhone"`
	GroundTruth bool     `json:"groundTruth"`
}
type TextTranslation struct {
	Web3Related bool   `json:"web3_related"`
	Translation string `json:"translation"`
}
type RespContent struct {
	Type string `json:"type"`
	//Text *ImageOcrInfo `json:"text"`
	Text string `json:"text"`
}
type Claude3Response struct {
	Usage   *UsageInfo    `json:"usage"`
	Content []RespContent `json:"content"`
}
