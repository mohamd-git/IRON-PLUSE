import pytest
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_create_post(async_client: AsyncClient, test_user: User, auth_headers):
    payload = {"content": "Engaging tactical protocols! #ironpulse", "post_type": "text"}
    response = await async_client.post("/api/v1/community/posts", json=payload, headers=auth_headers(test_user))
    assert response.status_code == 201
    assert response.json()["content"] == payload["content"]

@pytest.mark.asyncio
async def test_like_toggle(async_client: AsyncClient, test_user: User, auth_headers):
    headers = auth_headers(test_user)
    post_id = "test_post_1"
    
    # Toggle Like ON
    res1 = await async_client.post(f"/api/v1/community/posts/{post_id}/like", headers=headers)
    assert res1.status_code in [200, 201]
    assert res1.json()["is_liked"] is True

    # Toggle Like OFF
    res2 = await async_client.post(f"/api/v1/community/posts/{post_id}/like", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["is_liked"] is False

@pytest.mark.asyncio
async def test_challenge_flow(async_client: AsyncClient, test_user: User, auth_headers):
    # 1. Send Challenge
    payload = {"target_user_id": "rival_id_2", "exercise": "Squat", "reps": 5, "weight": 315}
    res_send = await async_client.post("/api/v1/challenges", json=payload, headers=auth_headers(test_user))
    assert res_send.status_code == 201
    challenge_id = res_send.json()["id"]

    # 2. Rival Accepts (Assume test_user receives it for test simplicity directly checking bounds)
    res_accept = await async_client.post(f"/api/v1/challenges/{challenge_id}/accept", headers=auth_headers(test_user))
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

@pytest.mark.asyncio
async def test_send_message(async_client: AsyncClient, test_user: User, auth_headers):
    payload = {"content": "Are you hitting legs today?"}
    response = await async_client.post("/api/v1/messages/target_user_id", json=payload, headers=auth_headers(test_user))
    assert response.status_code == 201
    assert response.json()["content"] == payload["content"]
