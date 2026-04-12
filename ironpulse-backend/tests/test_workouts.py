import pytest
import math
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_epley_formula():
    """Direct unit test of the backend math engine representing 1 Rep Max Epley bounds."""
    # formula: weight * (1 + reps / 30)
    weight = 100
    reps = 5
    expected = weight * (1 + reps / 30) # 116.666...
    
    # Assuming this logic exists securely in app.core.workout_math but for now we write the test checking integration manually 
    from app.services.workout_service import calculate_one_rep_max
    
    result = calculate_one_rep_max(weight, reps)
    assert math.isclose(result, expected, rel_tol=1e-2)

@pytest.mark.asyncio
async def test_start_session(async_client: AsyncClient, test_user: User, auth_headers):
    # Mock template initiation
    headers = auth_headers(test_user)
    payload = {"template_id": "mock_template_123"}
    
    response = await async_client.post("/api/v1/sessions/start", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["status"] == "active"

@pytest.mark.asyncio
async def test_log_set_and_accumulate_volume(async_client: AsyncClient, test_user: User, auth_headers):
    headers = auth_headers(test_user)
    session_id = "test_session_xyz"
    
    payload_1 = {"exercise_id": "test_bench", "reps": 10, "weight": 100, "rpe": 8}
    payload_2 = {"exercise_id": "test_bench", "reps": 10, "weight": 100, "rpe": 8}
    payload_3 = {"exercise_id": "test_bench", "reps": 10, "weight": 100, "rpe": 9}

    res1 = await async_client.post(f"/api/v1/sessions/{session_id}/log-set", json=payload_1, headers=headers)
    await async_client.post(f"/api/v1/sessions/{session_id}/log-set", json=payload_2, headers=headers)
    await async_client.post(f"/api/v1/sessions/{session_id}/log-set", json=payload_3, headers=headers)
    
    assert res1.status_code == 200
    
    # Fetch summary tracking total volume accumulation
    summary_res = await async_client.get(f"/api/v1/sessions/{session_id}/summary", headers=headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["total_volume_kg"] == 3000  # 3 * 10 * 100

@pytest.mark.asyncio
async def test_log_set_triggers_pr(async_client: AsyncClient, test_user: User, auth_headers, override_get_db):
    headers = auth_headers(test_user)
    session_id = "test_session_xyz"
    
    # Send a massive set to force a PR condition assuming default is 0
    payload = {"exercise_id": "test_deadlift", "reps": 1, "weight": 500, "rpe": 10}
    response = await async_client.post(f"/api/v1/sessions/{session_id}/log-set", json=payload, headers=headers)
    
    assert response.status_code == 200
    assert response.json()["is_pr"] is True

@pytest.mark.asyncio
async def test_complete_session_streak(async_client: AsyncClient, test_user: User, auth_headers):
    headers = auth_headers(test_user)
    
    # Complete same day 
    await async_client.post("/api/v1/sessions/test_session_1/complete", headers=headers)
    res_1 = await async_client.get("/api/v1/users/me/analytics", headers=headers)
    
    await async_client.post("/api/v1/sessions/test_session_2/complete", headers=headers)
    res_2 = await async_client.get("/api/v1/users/me/analytics", headers=headers)
    
    assert res_1.json()["streak"] == res_2.json()["streak"] # Should remain 1 because it's the exact same day natively.
