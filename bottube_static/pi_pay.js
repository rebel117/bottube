// Pi payment frontend for BoTTube. Pairs with the server pi_payments blueprint
// (/pi/approve, /pi/complete, /pi/health). Load the Pi SDK in <head> first.
//
// sandbox:true ONLY for the desktop Pi Sandbox (?pi_sandbox=1); the real Pi Browser
// must use false (same rule as pi_auth.js). This is the SDK env flag, NOT testnet/mainnet
// (that is the server's PI_SANDBOX).
let PI_CFG = { products: {} };
const _PAY_SANDBOX = /[?&]pi_sandbox=1/.test(location.search) || window.PI_SANDBOX === true;

function _payStatus(msg) {
  const el = document.getElementById("pi-setup-status");
  if (el) el.textContent = msg;
  console.log("[pi-pay]", msg);
}

async function piInit() {
  try {
    const cfg = await (await fetch("/pi/health")).json();
    PI_CFG.products = cfg.products || {};   // server-authoritative prices
  } catch (e) { /* prices fetched lazily in piBuy too */ }
  Pi.init({ version: "2.0", sandbox: _PAY_SANDBOX });
}

async function piBuy(product) {
  try {
    if (typeof Pi === "undefined") { _payStatus("Pi SDK not loaded — open in the Pi Browser."); return; }
    if (!PI_CFG.products[product]) { await piInit(); }
    const amount = PI_CFG.products[product];
    if (amount == null) { _payStatus("Unknown product: " + product); return; }

    _payStatus("Authorizing with Pi…");
    await Pi.authenticate(["username", "payments"], onIncompletePaymentFound);

    _payStatus("Opening Pi payment for " + amount + " Pi…");
    Pi.createPayment(
      { amount, memo: `BoTTube ${product}`, metadata: { product } },
      {
        onReadyForServerApproval: (paymentId) => {
          _payStatus("Approving payment…");
          return post("/pi/approve", { payment_id: paymentId })
            .catch((e) => _payStatus("Approve failed: " + e.message));
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          _payStatus("Finalizing payment…");
          return post("/pi/complete", { payment_id: paymentId, txid })
            .then(() => _payStatus("✅ Payment complete — checklist step done!"))
            .catch((e) => _payStatus("Complete failed: " + e.message));
        },
        onCancel: () => _payStatus("Payment cancelled."),
        onError: (err) => _payStatus("Pi payment error: " + (err && err.message ? err.message : err)),
      }
    );
  } catch (e) {
    _payStatus("Couldn't start payment: " + (e && e.message ? e.message : e) + " (open in Pi Browser / sandbox)");
  }
}

// Resume an incomplete payment. /pi/complete is resume-safe (reconstructs state from Pi).
function onIncompletePaymentFound(payment) {
  if (payment && payment.identifier && payment.transaction) {
    _payStatus("Resuming a pending payment…");
    return post("/pi/complete", {
      payment_id: payment.identifier,
      txid: payment.transaction.txid,
    }).then(() => _payStatus("✅ Pending payment finalized."))
      .catch((e) => _payStatus("Resume failed: " + e.message));
  }
}

async function post(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`Pi server error ${r.status} on ${path}:`, data);
    throw new Error(data.error || `server ${r.status}`);
  }
  return data;
}
