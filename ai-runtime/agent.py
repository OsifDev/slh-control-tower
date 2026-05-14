import asyncio
import redis.asyncio as redis
from typing import TypedDict
from langgraph.graph import StateGraph, END

# ---- State ----
class AgentState(TypedDict):
    event: dict
    response: str

# ---- Node: process ----
def process_event(state: AgentState) -> AgentState:
    event = state["event"]
    etype = event.get("event_type", "")
    payload = event.get("payload", "")
    # Simple rule-based logic (no LLM needed)
    if "bot" in etype:
        response = f"Bot event acknowledged: {payload}"
    elif "system" in etype:
        response = f"System status update: {payload}"
    else:
        response = f"Unknown event type '{etype}' handled."
    return {"response": response}

# ---- Build graph ----
builder = StateGraph(AgentState)
builder.add_node("process", process_event)
builder.set_entry_point("process")
builder.add_edge("process", END)
graph = builder.compile()

# ---- Redis listener ----
async def main():
    r = redis.Redis(host='redis', port=6379, db=0)
    last_id = "0"
    while True:
        try:
            events = await r.xread({"slh:events": last_id}, block=5000)
            for stream, messages in events:
                for msg_id, msg in messages:
                    data = {k.decode(): v.decode() for k, v in msg.items()}
                    print(f"AI received: {data}")
                    result = graph.invoke({"event": data})
                    response_text = result["response"]
                    # Publish response
                    await r.xadd("slh:responses", {"event_id": msg_id.decode(), "response": response_text, "timestamp": "now"})
                    print(f"AI responded: {response_text}")
                    last_id = msg_id
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())