# FFS Admin

<div align="center">

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.5-green)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![API Documentation](https://img.shields.io/badge/api-reference-yellow.svg)](https://github.com/Eating-Wisely-Labs/IFScience-API/tree/main/docs)

</div>

An innovative food sharing and healthy eating management platform that helps users track and share their healthy eating habits, receive professional nutritional advice, and motivate each other through social media interaction, AI-powered analysis, and a rewarding point system.

## Key Features

- **Social Media Integration**
  - Twitter integration for food sharing and community interaction
  - AI-powered food image analysis and nutritional advice
  - Automated response system for dietary queries

- **Health Tracking**
  - Daily meal tracking and check-in system
  - Nutritional analysis and recommendations
  - Personalized dietary goals and progress monitoring

- **Community & Rewards**
  - Point-based reward system for healthy eating habits
  - Community challenges and achievements
  - Social interaction and mutual encouragement

- **Smart Analysis**
  - AI-powered food recognition
  - Nutritional content analysis
  - Personalized dietary recommendations

## Quick Start

### Prerequisites

- Python 3.9+
- MySQL 5.7+
- Redis 6.0+
- AWS S3 or Compatible Object Storage
- Twitter Developer Account (for social media features)
- OpenAI API Key (for AI analysis features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ffs-server.git
cd ffs-server
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
Create a `.env` file in the root directory and set the following variables:
```env
# Database Configuration
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Redis Configuration
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port

# AWS S3 Configuration
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_BUCKET=your_bucket_name

# Social Media Configuration
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key
```

## Project Structure

```
ffs-server/
├── asyncdb.py           # Async database operations
├── constants/          # System constants and configurations
│   ├── error_code.py   # Error code definitions
│   └── config.py       # System configurations
├── dao/               # Data Access Objects
│   ├── account_dao.py  # User account data operations
│   ├── checkin_dao.py  # Check-in system data operations
│   └── reward_dao.py   # Reward system data operations
├── framework/         # Core framework components
├── models/           # Data models and schemas
├── route/            # API routes and endpoints
│   ├── ffs_account.py # Account management routes
│   ├── ffs_twitter.py # Twitter integration routes
│   └── score_reward.py # Scoring system routes
├── scheduler/        # Task scheduler for automated operations
├── service/          # Business logic services
│   ├── account/      # Account management services
│   └── bot/          # AI bot services
├── static/           # Static files and web resources
├── utils/            # Utility functions and helpers
├── server.py         # Main application entry
└── setting.py        # Application settings
```

## Deployment

### Development Mode
```bash
python server.py
```

### Production Mode with Docker
```bash
# Build the Docker image
docker build -t ffs-server .

# Run the container
docker run -d \
  -p 8080:8080 \
  --name ffs-server \
  --env-file .env \
  ffs-server
```

## API Documentation

For detailed API documentation, please refer to [API.md](API.md).

## Contributing

We welcome contributions to the FFS Server project! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and adhere to our coding standards.

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped shape FFS Server
- Special thanks to the FastAPI community for the excellent framework
- Powered by OpenAI's GPT models for intelligent food analysis

## Contact & Support

- Project Link: https://github.com/yourusername/ffs-server
- Report Issues: https://github.com/yourusername/ffs-server/issues
- Documentation: [API.md](API.md)

For support or inquiries, please open an issue in the GitHub repository.
