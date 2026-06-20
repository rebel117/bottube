// Pi Network login + Pi-Browser gating (testnet). Load after https://sdk.minepi.com/pi-sdk.js
// PI-ONLY UI: give any element class="pi-only" — it is hidden everywhere EXCEPT inside
// Pi Browser (revealed only after Pi.authenticate() succeeds, which only works in Pi Browser).
(function () {
  // hide Pi-only UI by default; revealed when we confirm we are in Pi Browser
  var st = document.createElement("style");
  st.textContent = ".pi-only{display:none !important} body.pi-browser .pi-only{display:revert !important}";
  (document.head || document.documentElement).appendChild(st);

  var _init;
  function piInit() { if (!_init) { _init = Promise.resolve(Pi.init({ version: "2.0", sandbox: true })); } return _init; }

  async function piSignIn() {
    if (typeof Pi === "undefined") { console.warn("Pi SDK not loaded"); return; }
    await piInit();
    var auth = await Pi.authenticate(["username"], onIncompletePaymentFound);
    var res = await fetch("/pi/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: auth.accessToken })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) { console.error("Pi auth failed:", data); throw new Error(data.error || ("server " + res.status)); }
    document.body.classList.add("pi-browser");   // confirmed Pi Browser -> reveal pi-only UI
    console.log("Pi signed in as:", data.username);
    document.dispatchEvent(new CustomEvent("pi:authenticated", { detail: data }));
    return data;
  }
  function onIncompletePaymentFound(p) { console.log("Incomplete Pi payment:", p && p.identifier); }

  window.piSignIn = piSignIn;
  window.isPiBrowser = function () { return document.body.classList.contains("pi-browser"); };

  window.addEventListener("load", function () {
    if (window.PI_AUTO_SIGNIN === false) return;
    if (typeof Pi === "undefined") return;  // not in Pi Browser context
    piSignIn().catch(function (e) { console.error("Pi auto sign-in:", e); });
  });
})();
