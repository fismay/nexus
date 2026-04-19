"""Ручной E2E против Docker API (http://localhost:8000)."""
import json
import subprocess
import uuid
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def req(
    method: str,
    url: str,
    data: dict | None = None,
    headers: dict | None = None,
) -> dict | list:
    h = dict(headers or {})
    body = json.dumps(data).encode() if data is not None else None
    if body is not None and "Content-Type" not in h:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, headers=h, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    sfx = str(uuid.uuid4())[:8]
    r1 = req(
        "POST",
        f"{BASE}/api/v1/auth/register",
        {
            "email": f"dockp1_{sfx}@example.com",
            "password": "password12",
            "tag": f"d{sfx}a",
            "display_name": "P1",
        },
    )
    r2 = req(
        "POST",
        f"{BASE}/api/v1/auth/register",
        {
            "email": f"dockp2_{sfx}@example.com",
            "password": "password12",
            "tag": f"d{sfx}b",
            "display_name": "P2",
        },
    )
    id1 = r1["user"]["id"]
    id2 = r2["user"]["id"]
    tok1 = r1["access_token"]
    tok2 = r2["access_token"]
    print("OK register", id1, id2)

    try:
        req(
            "GET",
            f"{BASE}/api/friends/{id2}/match-schedule?date=2026-06-01",
            headers={"Authorization": f"Bearer {tok1}"},
        )
    except urllib.error.HTTPError as e:
        print("OK no-friendship ->", e.code)

    u1, u2 = sorted([id1, id2])
    sql = (
        f"INSERT INTO friendships (id, user_id_1, user_id_2, status) "
        f"VALUES (gen_random_uuid(), '{u1}'::uuid, '{u2}'::uuid, 'accepted');"
    )
    subprocess.run(
        ["docker", "exec", "planer360v3-db-1", "psql", "-U", "postgres", "-d", "nexus", "-c", sql],
        check=True,
        capture_output=True,
        text=True,
    )
    print("OK friendship insert")

    m = req(
        "GET",
        f"{BASE}/api/friends/{id2}/match-schedule?date=2026-06-01",
        headers={"Authorization": f"Bearer {tok1}"},
    )
    print("OK empty-day slots count", len(m["free_slots"]))

    req(
        "POST",
        f"{BASE}/api/tasks",
        {
            "title": "Busy A",
            "start_time": "2026-06-01T10:00:00+00:00",
            "end_time": "2026-06-01T11:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {tok1}"},
    )
    req(
        "POST",
        f"{BASE}/api/tasks",
        {
            "title": "Busy B",
            "start_time": "2026-06-01T10:30:00+00:00",
            "end_time": "2026-06-01T11:30:00+00:00",
        },
        headers={"Authorization": f"Bearer {tok2}"},
    )
    print("OK tasks created")

    m2 = req(
        "GET",
        f"{BASE}/api/friends/{id2}/match-schedule?date=2026-06-01",
        headers={"Authorization": f"Bearer {tok1}"},
    )
    print("OK slots with overlaps:", len(m2["free_slots"]))
    print(json.dumps(m2["free_slots"][:5], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
