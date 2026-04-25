import hashlib
import logging
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client

logger = logging.getLogger(__name__)

_db: Client | None = None

COLLECTION = "articles"


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
