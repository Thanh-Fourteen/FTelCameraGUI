
import asyncio
import websockets
import json

async def test():
    uri = "ws://192.168.2.130:1345"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"cmd": "start"}))

        while True:
            msg = await ws.recv()
            print("Received:", msg[:200]) 

asyncio.run(test())