import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
import pymysql
pymysql.install_as_MySQLdb()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

# Async engine for runtime
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
Base = declarative_base()

# Synchronous engine for migrations / table creation
sync_engine = create_engine(
  DATABASE_URL.replace("+aiomysql", "+pymysql")
)

# Create tables if not exist
Base.metadata.create_all(bind=sync_engine)