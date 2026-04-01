
from __future__ import annotations

import requests


def test_get_posts_returns_json_list(session: requests.Session, base_url: str) -> None:
    r = session.get(f"{base_url}/api/posts")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    for post in data:
        assert "id" in post
        assert "author" in post
        assert "content" in post
        assert "createdAt" in post
