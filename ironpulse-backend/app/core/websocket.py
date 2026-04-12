"""
WebSocket connection manager — tracks online users and provides
targeted + broadcast messaging for real-time events.

Events emitted across the platform:
  pr_achieved, new_message, challenge_received, post_liked, lounge_message
"""

import logging
from fastapi import WebSocket

logger = logging.getLogger("ironpulse.ws")


class ConnectionManager:
    """In-memory WebSocket registry keyed by user_id."""

    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[user_id] = ws
        logger.info("WS connected: %s  (online: %d)", user_id[:8], len(self.active))

    def disconnect(self, user_id: str) -> None:
        self.active.pop(user_id, None)
        logger.info("WS disconnected: %s  (online: %d)", user_id[:8], len(self.active))

    async def send_to_user(self, user_id: str, event: str, data: dict) -> None:
        """Send a JSON message to a specific user if they are online."""
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, event: str, data: dict) -> None:
        """Send a JSON message to every connected client."""
        disconnected: list[str] = []
        for uid, ws in self.active.items():
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(uid)


# Singleton — imported across the app
manager = ConnectionManager()
