import pytest
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_non_admin_blocked(async_client: AsyncClient, test_user: User, auth_headers):
    headers = auth_headers(test_user)
    
    # Target protected admin domain securely
    response = await async_client.get("/api/v1/admin/analytics", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Administrator tracking privileges required"

@pytest.mark.asyncio
async def test_analytics_returns_correct_counts(async_client: AsyncClient, test_admin: User, auth_headers):
    # Administrative access should crack open the tracking boundaries successfully 
    headers = auth_headers(test_admin)
    
    response = await async_client.get("/api/v1/admin/analytics", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "total_users" in data
    assert "active_this_week" in data
    assert "vip_members" in data
    assert "total_revenue" in data
