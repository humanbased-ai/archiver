# IFSCI Server

Backend service for IFS (Intermittent Fasting Science) - A scientific platform for intermittent fasting research and management.

## Features

- User authentication and authorization
- Rate limiting
- Redis caching
- Scheduler support
- OpenAI integration
- Lark (Feishu) webhook integration
- Scientific data management
- Fasting schedule tracking
- Research data analysis

## Prerequisites

- Python 3.9+
- MySQL
- Redis (single node or cluster)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/codatta/ifsci-server.git
cd ifsci-server
```

2. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up database:
```bash
# Create database and user (contact administrator for the root password)
mysql -u root -p
```

In MySQL prompt, run:
```sql
CREATE DATABASE IF NOT EXISTS ifsci_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'your_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ifsci_db.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

5. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` file with your configuration, especially:
- Database connection string (DB_URL)
- Redis configuration
- API keys and external service URLs

## Configuration

All configuration is done through environment variables. See `.env.example` for available options:

- `ENV`: Environment (dev/prod)
- `DB_URL`: MySQL database URL
- `REDIS_TYPE`: Redis mode (1 for single node, 2 for cluster)
- `REDIS_URL`: Redis connection URL
- `OPEN_AI_KEY`: OpenAI API key
- `LARK_SERVER_URL`: Lark webhook URL

## Running the Server

### Development
```bash
python server.py
```

### Production
```bash
uvicorn server:app --host 0.0.0.0 --port 8080
```

### Docker
```bash
docker build -t ifsci-server .
docker run -p 8080:8080 ifsci-server
```

## API Documentation

The API documentation is available at `/docs` or `/redoc` when the server is running.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
