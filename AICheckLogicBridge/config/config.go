package config

type Config struct {
	CheckGrpcEndpoint string `toml:"checkGrpcEndpoint"`
	HttpEndpoint      string `toml:"httpEndpoint"`
	GrpcEndpoint      string `toml:"grpcEndpoint"`
	LogLevel          string `toml:"logLevel"`
	TraceKey string `toml:"traceKey"`
}

var GlobalConf = &Config{}
