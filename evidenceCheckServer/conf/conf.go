package conf

type Config struct {
	MistickThreshold   int     `toml:"mistickThreshold"`
	Claude3APIUrl      string  `toml:"claude3apiUrl"`
	GrpcEndpoint       string  `toml:"grpcEndpoint"`
	HttpEndpoint       string  `toml:"httpEndpoint"`
	Env                string  `toml:"env"`
	DownloadImage      bool    `toml:"downloadImage"`
	PromEndpoint       string  `toml:"promEndpoint"`
	UseClaude3         bool    `toml:"useClaude3"`
	CheckImageRepeated bool    `toml:"checkImageRepeated"`
	CheckWebpageInfo   bool    `toml:"checkWebpageInfo"`
	LogLevel           string  `toml:"logLevel"`
	Claude3Region      string  `toml:"claude3Region"`
	AWSTimeouts        int     `toml:"awsTimeouts"`
	Claude3Prompt      string  `toml:"claude3Prompt"`
	SimilarThreshold   float64 `toml:"similarThreshold"`
}

var GlobalConf = &Config{}
