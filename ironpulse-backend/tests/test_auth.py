import pytest
from httpx import AsyncClient
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

@pytest.mark.asyncio
async def test_register_success(async_client: AsyncClient, override_get_db: AsyncSession):
    payload = {
        "email": "new_agent@ironpulse.com",
        "username": "Zero_Cool",
        "password": "Password123!"
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == payload["email"]

@pytest.mark.asyncio
async def test_register_duplicate_email(async_client: AsyncClient, test_user: User):
    payload = {
        "email": test_user.email,
        "username": "Clone",
        "password": "Password123!"
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "Email or username already completely registered"

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient, test_user: User):
    payload = {
        "username": test_user.email,
        "password": "password123" # Must match unhashed version from fixture
    }
    response = await async_client.post("/api/v1/auth/login", data=payload) # Form data for OAuth2
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient, test_user: User):
    payload = {
        "username": test_user.email,
        "password": "WRONG_PASSWORD"
    }
    response = await async_client.post("/api/v1/auth/login", data=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

@pytest.mark.asyncio
async def test_refresh_token(async_client: AsyncClient, test_user: User):
    # First login to get a valid refresh
    payload = {"username": test_user.email, "password": "password123"}
    res1 = await async_client.post("/api/v1/auth/login", data=payload)
    refresh_token = res1.json()["refresh_token"]

    # Now refresh
    res2 = await async_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res2.status_code == 200
    assert "access_token" in res2.json()

@pytest.mark.asyncio
async def test_logout_blacklists_token(async_client: AsyncClient, test_user: User, auth_headers):
    # 1. Login
    payload = {"username": test_user.email, "password": "password123"}
    login_res = await async_client.post("/api/v1/auth/login", data=payload)
    refresh_token = login_res.json()["refresh_token"]
    
    # 2. Logout using access token
    headers = auth_headers(test_user)
    logout_res = await async_client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # 3. Attempt Refresh
    refresh_res = await async_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 401
