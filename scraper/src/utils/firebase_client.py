import hashlib
import logging
import os
import firebase_admin
from firebase_admin import credentials, firestore, messaging
from google.cloud.firestore_v1 import Client

logger = logging.getLogger(__name__)

_db: Client | None = None

COLLECTION = "articles"
FCM_TOKENS_COLLECTION = "fcm_tokens"


def get_db() -> Client:
    global _db
    if _db is None:
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _db = firestore.client()
        logger.info("Firebase initialized")
    return _db


def article_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def article_exists(db: Client, url: str) -> bool:
    return db.collection(COLLECTION).document(article_id(url)).get().exists


def save_article(db: Client, article) -> str:
    doc_id = article_id(article.url)
    db.collection(COLLECTION).document(doc_id).set(article.to_dict())
    return doc_id


def get_fcm_tokens(db: Client) -> list[str]:
    docs = db.collection(FCM_TOKENS_COLLECTION).stream()
    tokens = []
    for doc in docs:
        token = doc.to_dict().get("token")
        if token:
            tokens.append(token)
    return tokens


def send_push_notification(title: str, body: str, tokens: list[str]) -> None:
    if not tokens:
        return
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "FCM sent: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )
    except Exception as e:
        logger.warning("FCM notification failed: %s", e)
