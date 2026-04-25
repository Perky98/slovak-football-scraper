# Club configurations for Slovak football leagues.
# news_url: starting page for article discovery
# active: set False to skip a club without deleting it

NIKE_LIGA_CLUBS = [
    {
        "name": "ŠK Slovan Bratislava",
        "short_name": "slovan",
        "base_url": "https://www.skslovan.com",
        "news_url": "https://www.skslovan.com/spravy/",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "FC DAC 1904 Dunajská Streda",
        "short_name": "dac",
        "base_url": "https://www.dac1904.sk",
        "news_url": "https://www.dac1904.sk/sk/archiv.asp",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "MŠK Žilina",
        "short_name": "zilina",
        "base_url": "https://www.mskzilina.sk",
        "news_url": "https://www.mskzilina.sk/archiv.asp?id_date=&id_category_1=101&search=&page=1",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "FC Spartak Trnava",
        "short_name": "spartak",
        "base_url": "https://fcspartaktrnava.com",
        "news_url": "https://fcspartaktrnava.com/sk/novinky",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "FK Železiarne Podbrezová",
        "short_name": "podbrezova",
        "base_url": "https://fkzp.sk",
        "news_url": "https://fkzp.sk/aktuality",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "MFK Zemplín Michalovce",
        "short_name": "michalovce",
        "base_url": "https://mfkzemplin.sk",
        "news_url": "https://mfkzemplin.sk/spravy",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "MFK Ružomberok",
        "short_name": "ruzomberok",
        "base_url": "https://www.mfkruzomberok.sk",
        "news_url": "https://www.mfkruzomberok.sk/archiv.asp",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "AS Trenčín",
        "short_name": "trencin",
        "base_url": "https://www.astrencin.sk",
        "news_url": "https://www.astrencin.sk/novinky.asp",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "FC Košice",
        "short_name": "kosice",
        "base_url": "https://www.fckosice.sk",
        "news_url": "https://www.fckosice.sk/aktuality",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "KFC Komárno",
        "short_name": "komarno",
        "base_url": "https://kfckomarno.sk",
        "news_url": "https://kfckomarno.sk/novinky",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "FC Tatran Prešov",
        "short_name": "presov",
        "base_url": "https://www.fctatran.sk",
        "news_url": "https://www.fctatran.sk/news",
        "league": "nike_liga",
        "active": True,
    },
    {
        "name": "MFK Skalica",
        "short_name": "skalica",
        "base_url": "https://www.mfkskalica.sk",
        "news_url": "https://www.mfkskalica.sk/",
        "league": "nike_liga",
        "active": True,
    },
]

# MONACObet liga (2. slovenská futbalová liga) 2025/2026 — 16 clubs
# Add clubs incrementally as you verify their websites
MONACOBET_LIGA_CLUBS = [
    # {
    #     "name": "FK Inter Bratislava",
    #     "short_name": "inter",
    #     "base_url": "https://fkinter.sk",
    #     "news_url": "https://fkinter.sk/aktuality",
    #     "league": "monacobet_liga",
    #     "active": True,
    # },
]

ALL_CLUBS = NIKE_LIGA_CLUBS + MONACOBET_LIGA_CLUBS
