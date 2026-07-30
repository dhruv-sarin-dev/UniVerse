import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # We need a project ID. I saw IKmrEm9xTF0tE9FTY2AR in the log.
        res = await client.post("http://localhost:8000/api/projects/IKmrEm9xTF0tE9FTY2AR/generate_mom", json={
            "transcripts": ["Alice: Hello", "Bob: Hi"]
        })
        print(res.status_code)
        print(res.text)

asyncio.run(test())
