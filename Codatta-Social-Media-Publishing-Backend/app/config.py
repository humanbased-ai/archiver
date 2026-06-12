from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Twitter — English account
    TWITTER_EN_API_KEY: str = ""
    TWITTER_EN_API_SECRET: str = ""
    TWITTER_EN_ACCESS_TOKEN: str = ""
    TWITTER_EN_ACCESS_SECRET: str = ""

    # Twitter — Chinese account
    TWITTER_ZH_API_KEY: str = ""
    TWITTER_ZH_API_SECRET: str = ""
    TWITTER_ZH_ACCESS_TOKEN: str = ""
    TWITTER_ZH_ACCESS_SECRET: str = ""

    # Twitter — Korean account
    TWITTER_KO_API_KEY: str = ""
    TWITTER_KO_API_SECRET: str = ""
    TWITTER_KO_ACCESS_TOKEN: str = ""
    TWITTER_KO_ACCESS_SECRET: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID_EN: str = ""
    TELEGRAM_CHAT_ID_ZH: str = ""
    TELEGRAM_CHAT_ID_KO: str = ""

    # Discord webhooks
    DISCORD_WEBHOOK_URL_EN: str = ""
    DISCORD_WEBHOOK_URL_ZH: str = ""
    DISCORD_WEBHOOK_URL_KO: str = ""

    # Operational
    RATE_LIMIT_DELAY_SECONDS: float = 1.0


settings = Settings()
