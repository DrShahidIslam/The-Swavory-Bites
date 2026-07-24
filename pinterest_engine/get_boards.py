import os
import requests
from dotenv import load_dotenv

load_dotenv(".env", override=True)

token = os.getenv("PINTEREST_ACCESS_TOKEN")

if not token:
    print("No PINTEREST_ACCESS_TOKEN found in .env file.")
    exit(1)

print(f"Using Token: {token[:10]}...{token[-5:]}")

url = "https://api-sandbox.pinterest.com/v5/boards"
headers = {"Authorization": f"Bearer {token}"}
res = requests.get(url, headers=headers)

if res.status_code == 200:
    boards = res.json().get("items", [])
    print("\n--- YOUR PINTEREST BOARDS ---")
    for b in boards:
        print(f"Name: {b.get('name')} | ID: {b.get('id')} | Privacy: {b.get('privacy')}")
    print("-----------------------------\n")
else:
    print(f"FAILED to fetch boards. HTTP {res.status_code}")
    print(res.text)
