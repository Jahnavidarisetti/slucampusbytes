from __future__ import annotations

import time

import requests

from http_utils import JSON_HEADERS


def test_post_missing_content_400(
    session: requests.Session, base_url: str, require_profile_user_id: str
) -> None:
    r = session.post(
        f"{base_url}/api/posts",
        json={"user_id": require_profile_user_id},
        headers=JSON_HEADERS,
    )
    assert r.status_code == 400
    assert "message" in r.json()


def test_post_empty_content_400(
    session: requests.Session, base_url: str, require_profile_user_id: str
) -> None:
    r = session.post(
        f"{base_url}/api/posts",
        json={"user_id": require_profile_user_id, "content": "   "},
        headers=JSON_HEADERS,
    )
    assert r.status_code == 400


def test_post_valid_201_and_response_shape(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    r = session.post(
        f"{base_url}/api/posts",
        json={
            "user_id": require_profile_user_id,
            "content": f"post create test {unique_suffix}",
        },
        headers=JSON_HEADERS,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content"] == f"post create test {unique_suffix}"
    assert body["id"]
    assert "author" in body
    assert "createdAt" in body


def test_feed_lists_newest_post_first(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    marker = unique_suffix
    older = f"order-older-{marker}"
    newer = f"order-newer-{marker}"
    uid = require_profile_user_id
    r1 = session.post(
        f"{base_url}/api/posts",
        json={"user_id": uid, "content": older},
        headers=JSON_HEADERS,
    )
    r2 = session.post(
        f"{base_url}/api/posts",
        json={"user_id": uid, "content": newer},
        headers=JSON_HEADERS,
    )
    assert r1.status_code == 201, r1.text
    assert r2.status_code == 201, r2.text
    time.sleep(0.05)
    r = session.get(f"{base_url}/api/posts", params={"limit": 100, "offset": 0})
    assert r.status_code == 200
    contents = [p["content"] for p in r.json()]
    assert newer in contents and older in contents
    assert contents.index(newer) < contents.index(older)
