package log

import (
	"fmt"
	"time"

	match "github.com/alexpantyukhin/go-pattern-match"
	"github.com/uptrace/opentelemetry-go-extra/otelzap"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// CustomFields struct to hold additional fields
type CustomFields struct {
	Module    string
	SubModule string
	Result    string
	Reason    string
	Duration  time.Duration
}

func InitLogger(logLevel string) *otelzap.SugaredLogger {
	encoder := getEncoder()
	_, level := match.Match(logLevel).When("debug", zap.DebugLevel).
		When("info", zap.InfoLevel).
		When("warn", zap.WarnLevel).
		When("error", zap.ErrorLevel).Result()
	//console := zapcore.Lock(os.Stdout)
	//core := zapcore.NewCore(encoder, console, level.(zapcore.Level))

	cfg := zap.Config{
		Encoding:      "console",                                   // 输出格式设置为 console
		Level:         zap.NewAtomicLevelAt(level.(zapcore.Level)), // 日志级别
		OutputPaths:   []string{"stdout"},                          // 输出位置
		EncoderConfig: encoder,
	}
	zapLogger, err := cfg.Build()
	if err != nil {
		panic(err)
	}

	//options := []otelzap.Option{otelzap.WithTraceIDField(true), otelzap.WithCaller(false)}
	return otelzap.New(zapLogger).Sugar()
}

func getEncoder() zapcore.EncoderConfig {
	//	encoderConfig := zap.NewProductionEncoderConfig()
	//	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder // 修改时间编码器
	//
	//	// 在日志文件中使用大写字母记录日志级别
	//	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:          "ts",
		LevelKey:         "level",
		NameKey:          "logger",
		CallerKey:        "caller",
		MessageKey:       "msg",
		StacktraceKey:    "stacktrace",
		LineEnding:       zapcore.DefaultLineEnding,
		EncodeLevel:      zapcore.LowercaseLevelEncoder, // 小写日志级别
		EncodeTime:       zapcore.ISO8601TimeEncoder,    // 时间戳格式
		EncodeDuration:   zapcore.SecondsDurationEncoder,
		EncodeCaller:     zapcore.ShortCallerEncoder,
		ConsoleSeparator: " | ",
	}

	return encoderConfig
	// NewConsoleEncoder 打印更符合人们观察的方式
	//return zapcore.NewConsoleEncoder(encoderConfig)
}

//func getLogWriter() zapcore.WriteSyncer {
//	file, _ := os.Create("./test.log")
//	return zapcore.AddSync(file)
//}

// CustomConsoleEncoderConfig 定义了自定义的 ConsoleEncoderConfig

func FmtLog(span string, submissionid string, operation string, catgory string, result string, reason string, duration int) string {
	return fmt.Sprintf(" traceid:%s | submissionid:%s | operation:%s |  catgory:%s | result:%s | reason:%s | duration:%dms ", span, submissionid, operation, catgory, result, reason, duration)
}

func FmtBedrockLog(span string, submissionid string, operation string, catgory string, result string, reason string, duration int, req string, resp string) string {
	return fmt.Sprintf(" traceid:%s | submissionid:%s | operation:%s |  catgory:%s | result:%s | reason:%s | duration:%dms | req:%s | resp:%s ", span, submissionid, operation, catgory, result, reason, duration, req, resp)
}
