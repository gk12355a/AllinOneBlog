import json
from datetime import datetime
from flask import request
from app.extensions import db
from app.models import AuditLog
from app.utils.device_detector import get_client_ip, parse_user_agent

class AuditService:
    @staticmethod
    def log(
        action: str,
        feature: str,
        status: str,
        user_id: int = None,
        username: str = None,
        failure_reason: str = "",
        target_type: str = "",
        target_id: str = "",
        target_name: str = "",
        details: dict = None,
        req=None,
        commit: bool = True
    ):
        """
        Ghi nhật ký Audit Log tập trung, an toàn.
        Tự động bóc tách IP, User-Agent, Device, OS, Browser.
        """
        if req is None:
            req = request

        try:
            ip_address = get_client_ip(req)
        except Exception:
            ip_address = "127.0.0.1"

        try:
            raw_ua = req.headers.get("User-Agent", "")[:255]
            ua_info = parse_user_agent(raw_ua)
        except Exception:
            raw_ua = ""
            ua_info = {
                "device_type": "Unknown",
                "os_name": "Unknown",
                "browser_name": "Unknown",
                "is_bot": False
            }

        details_str = json.dumps(details or {}) if isinstance(details, dict) else "{}"

        log_entry = AuditLog(
            user_id=user_id,
            username=username or "",
            action=action,
            feature=feature,
            status=status,
            failure_reason=failure_reason or "",
            target_type=target_type or "",
            target_id=str(target_id) if target_id else "",
            target_name=target_name or "",
            details_json=details_str,
            ip_address=ip_address,
            user_agent=raw_ua,
            device_type=str(ua_info.get("device_type", "Unknown")),
            os_name=str(ua_info.get("os_name", "Unknown")),
            browser_name=str(ua_info.get("browser_name", "Unknown")),
            is_bot=bool(ua_info.get("is_bot", False)),
            created_at=datetime.utcnow()
        )  # type: ignore

        db.session.add(log_entry)
        if commit:
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"[AuditService Error] Failed to commit audit log: {e}")

        return log_entry
