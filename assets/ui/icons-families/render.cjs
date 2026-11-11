const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1060, height: 900 } });
  await p.goto('file://' + process.argv[2]);
  await p.screenshot({ path: process.argv[3], fullPage: true });
  if (process.argv[4]) {
    const figs = await p.$$('figure');
    for (const f of figs) {
      const id = await f.getAttribute('data-id');
      const s = await f.$('svg');
      await p.evaluate((el) => { el.style.width = '256px'; el.style.height = '256px'; document.body.style.background = 'transparent'; }, s);
      await s.screenshot({ path: process.argv[4] + '/' + id + '.png', omitBackground: true });
    }
  }
  await b.close();
})();
