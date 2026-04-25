import json
import logging
import os
from openai import OpenAI

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url="https://api.deepseek.com",
        )
    return _client


SYSTEM_PROMPT = (
    "Si asistent špecializovaný na analýzu slovenských futbalových správ. "
    "Vždy odpovedáš výhradne validným JSON objektom, žiadny iný text."
)

ANALYSIS_PROMPT = """\
Analyzuj nasledujúci futbalový článok a vráť JSON s presne týmito poliami:

- "summary": zhrnutie článku v 2–3 vetách po slovensky
- "category": jedna z hodnôt: transfer | predlzenie_zmluvy | trenerska_zmena | zapas | zranenie | tlacova_konferencia | mlad | trenink | ine
- "sentiment": jedna z hodnôt: positive | neutral | negative
- "key_players": pole max. 5 mien hráčov spomínaných v článku (prázdne pole ak žiadni)
- "tags": pole max. 5 kľúčových slov v slovenčine

Klub: {club_name}
Nadpis: {title}
Obsah:
{content}
"""


def analyze_article(title: str, content: str, club_name: str) -> dict:
    prompt = ANALYSIS_PROMPT.format(
        club_name=club_name,
        title=title,
        content=content[:4000],
    )
    try:
        response = get_client().chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=600,
            temperature=0.2,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"DeepSeek analysis failed: {e}")
        return {}
