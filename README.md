# Shadows website

Plain HTML, CSS and JS. No build step. Open `index.html` in a browser, or push this folder to GitHub Pages.

## Files
- `index.html`  all content (English). Arabic text is in `js/i18n.js`.
- `css/style.css`  styles (colors are CSS variables at the top).
- `js/main.js`  language toggle, owl intro, embers, nav highlight, FAQ-free scroll reveals, contact form.
- FAQ and manifesto wording is in `index.html` (English) and `js/i18n.js` (Arabic). It is team-review wording.
- `assets/`  owl, wordmark, textures from the original site.

## Before launch
1. Contact form: set `FORM_ENDPOINT` (and `FORM_ACCESS_KEY` for Web3Forms) at the top of `js/main.js`.
2. Domain: the site currently points to `https://yassin-alrashidi.github.io/shadows-website/` in `index.html`, `robots.txt`, `sitemap.xml`. For a custom domain, replace that address in those three files and add a `CNAME` file.
3. Go public (flip indexability). Right now the site is hidden from search on purpose. To launch:
   - `index.html`: delete the line `<meta name="robots" content="noindex, nofollow">`.
   - `robots.txt`: delete the `User-agent: *` and `Disallow: /` lines at the top, then uncomment the `Allow: /` and `Sitemap:` lines.
   - Commit and push. GitHub Pages republishes in a minute or two.
4. Work section: replace the sample tiles (instructions in a comment inside `index.html`).

## Deploy on GitHub Pages
Create a repo, upload these files, then Settings > Pages > Deploy from branch (main, root).

## Rules baked in
No music or sound anywhere. No imagery of non-hijabi women. Descriptor: Digital Marketing & Creative Studio.
