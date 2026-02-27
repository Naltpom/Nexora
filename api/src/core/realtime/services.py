"""Realtime SSE broadcaster infrastructure.

Provides a generic broadcaster that any feature can use to push
events to connected users in real time over Server-Sent Events.

Usage:
    from ..realtime.services import sse_broadcaster
    await sse_broadcaster.push(user_id, event_type="notification", data={...})
    await sse_broadcaster.push(user_id, event_type="permission_change", data={...})
    await sse_broadcaster.broadcast_all(event_type="feature_toggle", data={...})
"""

import asyncio
import json
import logging
from typing import Any

from ..config import settings

logger = logging.getLogger(__name__)

# Max SSE events buffered per client before dropping (prevents memory leak on slow clients)
_QUEUE_MAX_SIZE = 256


# ---------------------------------------------------------------------------
#  SSE Broadcasters
# ---------------------------------------------------------------------------


class InMemorySSEBroadcaster:
    """In-memory SSE broadcaster (fallback).

    Stores per-user asyncio queues. Suitable for single-process deployments
    where Redis is not available.
    """

    def __init__(self) -> None:
        self._connections: dict[int, list[asyncio.Queue]] = {}

    async def subscribe(self, user_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAX_SIZE)
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(queue)
        logger.debug(
            "SSE subscribe: user_id=%d (total=%d)",
            user_id,
            len(self._connections[user_id]),
        )
        return queue

    async def unsubscribe(self, user_id: int, queue: asyncio.Queue) -> None:
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(queue)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.debug("SSE unsubscribe: user_id=%d", user_id)

    async def push(self, user_id: int, event_type: str, data: dict[str, Any]) -> None:
        """Push an event to a specific user."""
        queues = self._connections.get(user_id, [])
        payload = {"type": event_type, "data": data}
        for queue in queues:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning(
                    "SSE queue full for user_id=%d, dropping event type=%s",
                    user_id,
                    event_type,
                )

    async def broadcast_all(self, event_type: str, data: dict[str, Any]) -> None:
        """Push an event to ALL connected users."""
        payload = {"type": event_type, "data": data}
        for queues in self._connections.values():
            for queue in queues:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

    def get_connected_user_ids(self) -> set[int]:
        """Return the set of user IDs with active SSE connections."""
        return set(self._connections.keys())


class RedisSSEBroadcaster:
    """Redis pub/sub SSE broadcaster. Works across multiple API instances."""

    def __init__(self) -> None:
        import redis.asyncio as aioredis

        self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        self._tasks: dict[int, list[tuple[asyncio.Queue, asyncio.Task]]] = {}

    async def subscribe(self, user_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAX_SIZE)
        task = asyncio.create_task(self._listen(user_id, queue))
        if user_id not in self._tasks:
            self._tasks[user_id] = []
        self._tasks[user_id].append((queue, task))
        logger.debug("SSE subscribe: user_id=%d", user_id)
        return queue

    async def _listen(self, user_id: int, queue: asyncio.Queue) -> None:
        user_channel = f"sse:{user_id}"
        broadcast_channel = "sse:broadcast"
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(user_channel, broadcast_channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        queue.put_nowait(data)
                    except (json.JSONDecodeError, asyncio.QueueFull):
                        pass
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(user_channel, broadcast_channel)
            await pubsub.aclose()

    async def unsubscribe(self, user_id: int, queue: asyncio.Queue) -> None:
        if user_id in self._tasks:
            task_to_cancel: asyncio.Task | None = None
            for q, t in self._tasks[user_id]:
                if q is queue:
                    task_to_cancel = t
                    break
            if task_to_cancel is not None:
                task_to_cancel.cancel()
            self._tasks[user_id] = [
                (q, t) for q, t in self._tasks[user_id] if q is not queue
            ]
            if not self._tasks[user_id]:
                del self._tasks[user_id]
        logger.debug("SSE unsubscribe: user_id=%d", user_id)

    async def push(self, user_id: int, event_type: str, data: dict[str, Any]) -> None:
        """Push an event to a specific user via Redis pub/sub."""
        channel = f"sse:{user_id}"
        payload = {"type": event_type, "data": data}
        await self._redis.publish(channel, json.dumps(payload, default=str))

    async def broadcast_all(self, event_type: str, data: dict[str, Any]) -> None:
        """Broadcast an event to ALL connected users via Redis pub/sub."""
        payload = {"type": event_type, "data": data}
        await self._redis.publish("sse:broadcast", json.dumps(payload, default=str))

    def get_connected_user_ids(self) -> set[int]:
        """Return user IDs with local connections (not cluster-wide)."""
        return set(self._tasks.keys())


# Singleton — Redis when available, in-memory fallback
def _create_broadcaster() -> InMemorySSEBroadcaster | RedisSSEBroadcaster:
    try:
        broadcaster = RedisSSEBroadcaster()
        logger.info("SSE broadcaster: Redis (%s)", settings.REDIS_URL)
        return broadcaster
    except Exception as e:
        logger.warning("Redis SSE broadcaster init failed (%s) — fallback to in-memory", e)
        return InMemorySSEBroadcaster()


sse_broadcaster = _create_broadcaster()
