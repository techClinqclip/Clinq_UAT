import json
from insights_engine import SocialInsightsEngine

def run_test():
    # 1. Provide test URLs across platforms
    test_urls = [
        "https://www.instagram.com/reel/Db5fMzXMLfS/?igsh=MWxsZmV1bWgyZWUyeA==",
        "https://www.instagram.com/reel/Db25fcSM3AZ/?igsh=b3gzMmcyOGY2bjU=",
        "https://www.instagram.com/reel/Db0VlJMT1k6/?igsh=czI3ZXB1eTk3N2k1",
        "https://www.instagram.com/reel/DbvMb22zcI4/?igsh=MTh3ZnE5ejdkNTA5bw==",
        "https://www.instagram.com/reel/Dbsm-9csGEC/?igsh=YWdqYmNlM2d2ZXBt",
        "https://www.instagram.com/reel/DbqCLHosDRn/?igsh=MTg5aXQ4ZHlhemFpZQ==",
        "https://www.instagram.com/reel/DblNtVKTRLA/?igsh=cWh1OG1zOW9hdTJj",
        "https://www.instagram.com/reel/DbndPp1MvFy/?igsh=MXFsYW1lZGplMThieA==",
        "https://www.instagram.com/reel/DbiUWBHzVbF/?igsh=MWY5MTMzYXJwZDJ4Mw==",
        "https://www.instagram.com/reel/DbfbN9xMKOz/?igsh=bDhvdmV3NHMzOHRt",
        "https://www.instagram.com/reel/DbdJ4y0M1AW/?igsh=cW1idmdrNDBxeXNx",
        "https://www.instagram.com/reel/DbaqqKEMme9/?igsh=anJqZHp6NGY1OTVk",
        "https://www.instagram.com/reel/DbYBHdKT8ld/?igsh=ZTltZDg2cHBzZ290",
        "https://www.instagram.com/reel/DbVctoyT5fc/?igsh=NDE2bjVqcGRvcmIx",
        "https://www.instagram.com/reel/DbS34k2z0x0/?igsh=emRkY3ZnNW8yNzV2",
        "https://www.instagram.com/reel/DbQRvSqzfxP/?igsh=ZWNydDliYWhoZGVn",
        "https://www.instagram.com/reel/DbLIw1aMBO7/?igsh=MXJ4dDNqcXc0Nms1NQ==",
        "https://www.instagram.com/reel/DbGA9H8sVr-/?igsh=bXRqdTBycHQ5N3U5",
        "https://www.instagram.com/reel/DbDasjAMCx-/?igsh=MWxsdTQzajV3c29qdA==",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.instagram.com/p/Db5fMzXMLfS/",
        "https://www.facebook.com/reel/1137009575037474/"
    ]

    print("Initializing Social Insights Engine...")
    engine = SocialInsightsEngine()

    print("Fetching metrics...")
    results = engine.get_metrics_report(test_urls)

    print("\n================ FINAL INSIGHTS REPORT ================")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    run_test()