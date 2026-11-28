"""Run the standalone B24 V3 study in local headless Chromium."""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    executable = os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium")
    browser = playwright.chromium.launch(executable_path=executable, args=["--disable-gpu"])
    page = browser.new_page()
    page.on("pageerror", lambda exc: print(exc))
    page.set_content(Path(__file__).with_name("bench.html").read_text())
    report = json.loads(page.locator("#result").inner_text())
    print(json.dumps(report, ensure_ascii=False, indent=2))
    browser.close()
