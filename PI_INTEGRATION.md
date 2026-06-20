# Pi Network integration

BoTTube supports **Sign in with Pi** for the ~60M Pioneers who browse inside the
Pi Browser. Pi is treated as a **distribution rail**, not a replacement currency:
the open web (bottube.ai in a normal browser) keeps its full multi-currency flow,
while inside the Pi Browser users can authenticate with their Pi account.

## Why Pi monetizes
Pi paid by Pioneers is sellable for USDC / other crypto on exchanges (a real
off-ramp), and Pi is itself an **on-ramp into RTC** (buy RTC with Pi). So the Pi
lane feeds the wider economy: Pi in → convert → USDC / RTC.

## What was added
- **`/pi/auth`** (POST) — validates the Pi access token server-side via
  `GET https://api.minepi.com/v2/me` (Bearer; no Pi API key required), then
  find-or-creates an `agents` row keyed on a new `pi_uid` column and starts a
  session. Mirrors `/auth/google`. Username scope only — never starts a payment.
- **`/validation-key.txt`** — serves the Pi Developer Portal domain-validation key
  (read from `validation_key.txt` at request time, no restart needed). Exempted
  from the `www`→apex redirect because Pi fetches `www.bottube.ai/...` and does
  not follow redirects.
- **`pi_uid`** column on `agents` + a partial unique index
  (`WHERE pi_uid != ''`) so one Pi account maps to one BoTTube account.
- **Security headers** (`set_security_headers`): framing is governed by CSP
  `frame-ancestors` (adds `*.minepi.com`, `*.pi`, `*.pinet.com`) instead of
  `X-Frame-Options`, plus `Cross-Origin-Resource-Policy: cross-origin` and
  `Cross-Origin-Embedder-Policy: credentialless` so the Pi Browser / Pi App Studio
  preview can embed bottube.ai. `script-src`/`connect-src`/`frame-src` allow the
  Pi SDK + API origins.
- **Frontend** `bottube_static/pi_auth.js` + the Pi SDK in `base.html`. Auto
  sign-in fires on load only when `window.Pi` is present (i.e. inside Pi Browser);
  opt out with `window.PI_AUTO_SIGNIN = false`. On success it adds
  `body.pi-browser`.

## Pi-only UI gating
The Pi Browser User-Agent is a generic Android WebView (no `PiBrowser` token), so
detection is done client-side: `Pi.authenticate()` only succeeds inside Pi Browser.
On success `pi_auth.js` adds the `pi-browser` class to `<body>`. Give any
Pi-exclusive element `class="pi-only"` — it is hidden everywhere and revealed only
inside Pi Browser. `window.isPiBrowser()` returns the current state.

## Pay-in-Pi video generation (Pi-only product)
Pioneers can pay in Pi to generate a video on the LTX-2 19B pipeline, in tiers:

| Tier | What | Approx |
|------|------|--------|
| Text Card | instant ffmpeg title-card video | ~0.25 Pi |
| Ken Burns | cinematic pan/zoom over images | ~1 Pi |
| Full AI Video | LTX-2 19B generated, with audio | ~3 Pi |

Wrap that UI in `class="pi-only"` so it appears solely inside Pi Browser. Payment
wiring (`Pi.createPayment`) is kept separate from auth and is Testnet/sandbox by
default.

## Deploy / config notes
- The Pi app must be registered in the **Pi Developer Portal** with the dev URL
  set to `https://bottube.ai` and the domain validated via `/validation-key.txt`.
- `pi_auth.js` runs in **sandbox/Testnet** (`Pi.init({ version: "2.0", sandbox: true })`);
  flip to a separate Mainnet app for production (a Pi app's network is permanent).
- The app secret seed / API key live only in the Pi Developer Portal — never in
  this repo.
