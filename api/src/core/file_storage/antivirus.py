"""Optional ClamAV antivirus integration via pyclamd."""

import logging

from ..config import settings

logger = logging.getLogger(__name__)


async def scan_file(file_data: bytes) -> tuple[str, str | None]:
    """Scan file data with ClamAV.

    Returns:
        (status, detail) where status is one of:
        - "clean": no virus detected
        - "infected": virus detected, detail contains the virus name
        - "error": scan failed, detail contains the error message
        - "skipped": antivirus is disabled
    """
    if not settings.ANTIVIRUS_ENABLED:
        return ("skipped", None)

    try:
        import pyclamd

        cd = pyclamd.ClamdNetworkSocket(
            host=settings.ANTIVIRUS_HOST,
            port=settings.ANTIVIRUS_PORT,
            timeout=30,
        )

        if not cd.ping():
            logger.warning("ClamAV is not responding, skipping scan")
            return ("error", "ClamAV not responding")

        result = cd.scan_stream(file_data)

        if result is None:
            return ("clean", None)

        # result format: {'stream': ('FOUND', 'virus_name')}
        status_info = result.get("stream", ())
        if len(status_info) >= 2 and status_info[0] == "FOUND":
            virus_name = status_info[1]
            logger.warning("Virus detected: %s", virus_name)
            return ("infected", virus_name)

        return ("clean", None)

    except ImportError:
        logger.warning("pyclamd not installed, skipping virus scan")
        return ("error", "pyclamd not installed")
    except Exception as e:
        logger.error("ClamAV scan error: %s", str(e))
        return ("error", str(e))
