"""Database setup with SQLModel."""

from sqlmodel import SQLModel, create_engine, Session

from .. import config

engine = create_engine(config.DB_URL, echo=False)


def init_db():
    """Create all tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get a database session."""
    with Session(engine) as session:
        yield session
