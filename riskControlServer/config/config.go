package config

type Config struct {
	MongoDBUrl            string   `toml:"mongodb_url"`
	Database              string   `toml:"database"`
	LoginBlockCategory    []string `toml:"login_block_category"`
	WithdrawBlockCategory int      `toml:"withdraw_block_category"`
}

var GlobalConfig *Config
