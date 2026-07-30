from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
from typing import List
import json

router = APIRouter(prefix="/ws/presence", tags=["Presence"])

class PresenceManager:
    def __init__(self):
        # Maps user_id to their WebSocket connection
        self.active_users: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, uid: str):
        await websocket.accept()
        self.active_users[uid] = websocket
        
        # Broadcast to all others that this user is online
        message = json.dumps({"type": "presence_update", "uid": uid, "status": "online"})
        await self.broadcast_except(message, uid)

        # Send the current list of online users to the newly connected user
        online_list = list(self.active_users.keys())
        await websocket.send_text(json.dumps({"type": "sync", "online_users": online_list}))

    def disconnect(self, uid: str):
        if uid in self.active_users:
            del self.active_users[uid]

    async def broadcast_except(self, message: str, exclude_uid: str):
        for uid, connection in list(self.active_users.items()):
            if uid != exclude_uid:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

    async def broadcast(self, message: str):
        for uid, connection in list(self.active_users.items()):
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = PresenceManager()

@router.websocket("/{uid}")
async def presence_endpoint(websocket: WebSocket, uid: str):
    await manager.connect(websocket, uid)
    try:
        while True:
            # Keep the connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(uid)
        await manager.broadcast(json.dumps({"type": "presence_update", "uid": uid, "status": "offline"}))
    except Exception as e:
        print(f"Presence WS Error for {uid}: {e}")
        manager.disconnect(uid)
        await manager.broadcast(json.dumps({"type": "presence_update", "uid": uid, "status": "offline"}))
