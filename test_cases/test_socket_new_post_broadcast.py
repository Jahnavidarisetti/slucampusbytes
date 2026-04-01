from __future__ import annotations

import os
import threading
import time

import pytest
import requests

from http_utils import JSON_HEADERS


@pytest.mark.skipif(os.environ.get("SKIP_SOCKET_TEST") == "1", reason="SKIP_SOCKET_TEST=1")
def test_new_post_event_matches_http_response(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    pytest.importorskip("socketio", reason="pip install 'python-socketio[client]'")
    import socketio

    received: list[dict] = []
    done = threading.Event()

    sio = socketio.Client(reconnection=False, logger=False, engineio_logger=False)

    @sio.on("new_post")
    def on_new_post(data: dict) -> None:
        received.append(data)
        done.set()

    sio.connect(base_url, wait_timeout=5)
    try:
        r = session.post(
            f"{base_url}/api/posts",
            json={
                "user_id": require_profile_user_id,
                "content": f"socket broadcast {unique_suffix}",
            },
            headers=JSON_HEADERS,
        )
        assert r.status_code == 201, r.text
        expected = r.json()
        assert done.wait(timeout=8), "Timed out waiting for new_post"
        assert len(received) == 1
        assert received[0]["id"] == expected["id"]
        assert received[0]["content"] == expected["content"]
    finally:
        if sio.connected:
            sio.disconnect()


@pytest.mark.skipif(os.environ.get("SKIP_SOCKET_TEST") == "1", reason="SKIP_SOCKET_TEST=1")
def test_new_post_payload_has_same_fields_as_api(
    session: requests.Session,
    base_url: str,
    require_profile_user_id: str,
    unique_suffix: str,
) -> None:
    pytest.importorskip("socketio", reason="pip install 'python-socketio[client]'")
    import socketio

    received: list[dict] = []
    done = threading.Event()

    sio = socketio.Client(reconnection=False, logger=False, engineio_logger=False)

    @sio.on("new_post")
    def on_new_post(data: dict) -> None:
        received.append(data)
        done.set()

    sio.connect(base_url, wait_timeout=5)
    try:
        r = session.post(
            f"{base_url}/api/posts",
            json={
                "user_id": require_profile_user_id,
                "content": f"socket payload {unique_suffix}",
            },
            headers=JSON_HEADERS,
        )
        assert r.status_code == 201, r.text
        assert done.wait(timeout=8)
        http_body = r.json()
        payload = received[0]
        for key in ("id", "author", "content", "createdAt"):
            assert key in payload
        assert payload["id"] == http_body["id"]
        assert payload["author"] == http_body["author"]
        assert payload["content"] == http_body["content"]
    finally:
        if sio.connected:
            sio.disconnect()


@pytest.mark.skipif(os.environ.get("SKIP_SOCKET_TEST") == "1", reason="SKIP_SOCKET_TEST=1")
def test_no_new_post_on_validation_error(
    session: requests.Session, base_url: str, require_profile_user_id: str
) -> None:
    pytest.importorskip("socketio", reason="pip install 'python-socketio[client]'")
    import socketio

    received: list[dict] = []

    sio = socketio.Client(reconnection=False, logger=False, engineio_logger=False)

    @sio.on("new_post")
    def on_new_post(data: dict) -> None:
        received.append(data)

    sio.connect(base_url, wait_timeout=5)
    try:
        r = session.post(
            f"{base_url}/api/posts",
            json={"user_id": require_profile_user_id},
            headers=JSON_HEADERS,
        )
        assert r.status_code == 400, r.text
        time.sleep(1.5)
        assert len(received) == 0
    finally:
        if sio.connected:
            sio.disconnect()
