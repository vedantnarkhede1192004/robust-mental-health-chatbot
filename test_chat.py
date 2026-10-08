"""Quick manual test for the chatbot API. Start app_free.py first, then run:  python test_chat.py"""
import requests

BASE = "http://localhost:5000"
SESSION = "test-user-1"


def send(message, topic=None, mood=None):
    r = requests.post(f"{BASE}/chat", json={"session_id": SESSION, "message": message, "topic": topic, "mood": mood}, timeout=180)
    print(f"\nYOU:  {message}\nHTTP: {r.status_code}")
    data = r.json()
    print("BOT: ", data.get("reply") or data.get("error"))
    if "risk" in data:
        print("RISK:", data["risk"])


if __name__ == "__main__":
    print("Health:", requests.get(f"{BASE}/health").json())

    # normal conversation + memory across turns
    requests.post(f"{BASE}/mood", json={"session_id": SESSION, "score": 2})
    send("Hi, I have been feeling very stressed about my exams.", topic="stress", mood=2)
    send("I cannot sleep properly because of it.")
    send("What did I say was making me stressed?")  # tests conversation memory

    # validation
    send("")  # should return 400

    # safety layer (check that risk is 'crisis' and helplines are shown)
    send("I feel like there is no reason to live anymore.")

    requests.post(f"{BASE}/reset", json={"session_id": SESSION})
    print("\nSession cleared.")