import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Reusable session with retries and pooling
_session = requests.Session()

retry = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=0.8,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    raise_on_status=False,
)

adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
_session.mount("http://", adapter)
_session.mount("https://", adapter)

_session.headers.update({
    "User-Agent": "TideFly/worker",
    "Accept-Encoding": "gzip",
})

def get(url, params=None, timeout=(8, 20)):
    """GET request using the shared session.

    Args:
        url (str): Target URL.
        params (dict, optional): Query parameters.
        timeout (tuple, optional): (connect, read) timeouts in seconds.

    Returns:
        requests.Response: The HTTP response.
    """
    return _session.get(url, params=params, timeout=timeout)
