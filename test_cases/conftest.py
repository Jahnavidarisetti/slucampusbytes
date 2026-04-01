
from __future__ import annotations

import os

import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.environ.get("TEST_API_BASE_URL", "http://localhost:5000").rstrip("/")


@pytest.fixture(scope="session")
def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def require_live_server(base_url: str) -> None:
    """Skip only if the API process is unreachable (not on HTTP 500 from Supabase)."""
    try:
        requests.get(f"{base_url}/api/posts", timeout=5)
    except requests.RequestException as exc:
        pytest.skip(f"Backend not reachable at {base_url}: {exc}")


@pytest.fixture
def unique_suffix() -> str:
    import time

    return str(time.time_ns())


@pytest.fixture(scope="session")
def profile_user_id() -> str | None:
    return (
        os.environ.get("ADMIN_POST_USER_ID")
        or os.environ.get("PROFILE_USER_ID")
        or None
    )


@pytest.fixture(scope="session")
def require_profile_user_id(profile_user_id: str | None) -> str:
    if not profile_user_id:
        pytest.skip(
            "Set ADMIN_POST_USER_ID (or PROFILE_USER_ID) to a valid profiles.id UUID "
            "for POST and Socket.io tests."
        )
    return profile_user_id
