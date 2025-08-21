import time
import concurrent.futures
import requests
from decimal import Decimal, ROUND_HALF_UP


def call_with_budget(fn, budget_seconds=35):
    """Run ``fn`` with a time budget.

    If ``fn`` exceeds ``budget_seconds`` or raises an error, log and return ``None``.
    Always logs elapsed time.
    """
    start = time.time()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            future = ex.submit(fn)
            result = future.result(timeout=budget_seconds)
        elapsed = time.time() - start
        print(f"[budget] ok elapsed={elapsed:.2f}s")
        return result
    except concurrent.futures.TimeoutError:
        elapsed = time.time() - start
        print(f"[budget] timeout after {elapsed:.2f}s (limit {budget_seconds}s)")
        return None
    except requests.Timeout as e:
        elapsed = time.time() - start
        print(f"[budget] requests timeout after {elapsed:.2f}s: {e}")
        return None
    except requests.RequestException as e:
        elapsed = time.time() - start
        print(f"[budget] request error after {elapsed:.2f}s: {e}")
        return None
    except Exception as e:
        elapsed = time.time() - start
        print(f"[budget] error after {elapsed:.2f}s: {e}")
        return None


def as_money(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def to_json_number(x):
    if x is None:
        return None
    return float(as_money(x))
