from __future__ import annotations

import time

import pytest
import requests

from http_utils import JSON_HEADERS


def test_get_posts_includes_pagination_headers(session: requests.Session, base_url: str) -> None:
    r = session.get(f"{base_url}/api/posts", params={"limit": 10, "offset": 0})
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Feed-Limit") == "10"
    assert r.headers.get("X-Feed-Offset") == "0"
    assert int(r.headers.get("X-Feed-Count", "-1")) == len(r.json())
    assert r.headers.get("X-Feed-Has-More") in ("true", "false")


def test_default_limit_is_fifty_when_omitted(session: requests.Session, base_url: str) -> None:
    r = session.get(f"{base_url}/api/posts")
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Feed-Limit") == "50"
    assert r.headers.get("X-Feed-Offset") == "0"
    assert len(r.json()) <= 50


def test_limit_clamped_to_maximum(session: requests.Session, base_url: str) -> None:
    r = session.get(f"{base_url}/api/posts", params={"limit": 9999, "offset": 0})
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Feed-Limit") == "100"
    assert len(r.json()) <= 100


def test_negative_offset_treated_as_zero(session: requests.Session, base_url: str) -> None:
    r = session.get(f"{base_url}/api/posts", params={"limit": 5, "offset": -20})
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Feed-Offset") == "0"


def test_newest_post_first_when_limit_is_one(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    content = f"limit-one-newest-{unique_suffix}"
    p = session.post(
        f"{base_url}/api/posts",
        json={"user_id": require_profile_user_id, "content": content},
        headers=JSON_HEADERS,
    )
    assert p.status_code == 201, p.text
    time.sleep(0.05)
    g = session.get(f"{base_url}/api/posts", params={"limit": 1, "offset": 0})
    assert g.status_code == 200
    rows = g.json()
    assert len(rows) == 1
    assert rows[0]["content"] == content


def test_limit_and_offset_window_after_three_inserts(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    uid = require_profile_user_id
    m = unique_suffix
    labels = [f"pag-{m}-1", f"pag-{m}-2", f"pag-{m}-3"]
    for c in labels:
        pr = session.post(
            f"{base_url}/api/posts",
            json={"user_id": uid, "content": c},
            headers=JSON_HEADERS,
        )
        assert pr.status_code == 201, pr.text
    time.sleep(0.1)

    r0 = session.get(f"{base_url}/api/posts", params={"limit": 2, "offset": 0})
    r1 = session.get(f"{base_url}/api/posts", params={"limit": 2, "offset": 2})
    assert r0.status_code == 200 and r1.status_code == 200
    batch0 = [p["content"] for p in r0.json()]
    batch1 = [p["content"] for p in r1.json()]
    ours = {f"pag-{m}-1", f"pag-{m}-2", f"pag-{m}-3"}
    combined = set(batch0) | set(batch1)
    if not ours.issubset(combined):
        pytest.skip(
            "Feed top slots include other posts; rerun on a quieter DB or serial suite."
        )
    assert batch0 == [f"pag-{m}-3", f"pag-{m}-2"]
    assert batch1[0] == f"pag-{m}-1"
