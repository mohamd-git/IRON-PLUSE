import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import get_db, Base
from app.core.security import create_access_token
from app.models.user import User

# Configure asyncio loop for the pytest scope
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# In-memory SQLite Database for speed
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=None # Prevent connection pooling in sqlite memory to avoid transaction lockups
)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def setup_db():
    # Sync recreate metadata inside async engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup memory DB after test implicitly by test end, but drop as best practice
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testServer") as client:
        yield client

@pytest.fixture
async def test_user():
    async with TestingSessionLocal() as db:
        user = User(
            email="recruit@ironpulse.com",
            username="Operator_01",
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQG8INfO", # "password123"
            role="user",
            onboarding_complete=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest.fixture
async def test_vip_user():
    async with TestingSessionLocal() as db:
        user = User(
            email="elite@ironpulse.com",
            username="Vanguard_02",
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQG8INfO",
            role="vip",
            onboarding_complete=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest.fixture
async def test_admin():
    async with TestingSessionLocal() as db:
        user = User(
            email="root@ironpulse.com",
            username="SYSTEM_OVERSEER",
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQG8INfO",
            role="admin",
            onboarding_complete=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest.fixture
def auth_headers():
    def _auth_headers(user: User):
        access_token = create_access_token(data={"sub": user.id})
        return {"Authorization": f"Bearer {access_token}"}
    return _auth_headers

# Example generic factory format
@pytest.fixture
def create_exercise():
    async def _create_exercise(name="Deadlift"):
        # We simulate adding an exercise into the local scope
        pass
    return _create_exercise
