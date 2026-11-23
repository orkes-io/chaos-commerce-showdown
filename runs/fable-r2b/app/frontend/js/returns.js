// Returns: the paperwork (asked here), then the live tracker for the returns
// workflow with its six checks, the Returns Oath and the decision letter.

import { api, h, money, newToken, remember, sleep, state } from "./lib.js";

const MOON_PHASES = ["New moon", "Waxing gibbous", "Full moon", "Waning (emotionally)", "I did not look up", "There were two moons"];
const REGRET_SQUARES = ["🧦", "💸", "📦", "🕯️", "😬", "🧾", "🪜", "💨", "🤝"];

export function returnsFormView(catalog, navigate, params) {
  const orders = state.orders;
  const preselected = orders.find((order) => order.workflowId === params.get("order")) ?? null;
  const orderSelect = h("select", { id: "rt-order", name: "order" },
    orders.map((order) => h("option", { value: order.workflowId, selected: order === preselected }, `${order.orderId} (${money(order.totalCents)})`)),
    h("option", { value: "", selected: !preselected && orders.length === 0 }, "I don't have an order number (we won't check)"),
  );
  const itemSelect = h("select", { id: "rt-item", name: "item" });

  function fillItems() {
    const order = orders.find((entry) => entry.workflowId === orderSelect.value);
    const choices = order?.lines?.length
      ? order.lines.map((line) => ({ id: line.id, label: `${line.emoji} ${line.name}` }))
      : catalog.products.map((product) => ({ id: product.id, label: `${product.emoji} ${product.name}` }));
    itemSelect.replaceChildren(...choices.map((choice) =>
      h("option", { value: choice.id, selected: choice.id === params.get("item") }, choice.label)));
  }
  fillItems();
  orderSelect.addEventListener("change", fillItems);

  const picked = new Set();
  const captchaNote = h("p", { class: "form-note", role: "status" }, "0 squares selected.");
  const captcha = h("div", { class: "captcha", role: "group", "aria-label": "Select all squares containing regret" },
    REGRET_SQUARES.map((emoji, index) =>
      h("button", {
        type: "button",
        class: "captcha-square",
        "aria-pressed": "false",
        "aria-label": `Square ${index + 1}: ${emoji}`,
        onClick: (event) => {
          picked.has(index) ? picked.delete(index) : picked.add(index);
          event.currentTarget.setAttribute("aria-pressed", String(picked.has(index)));
          captchaNote.textContent = `${picked.size} square(s) selected. The correct answer is "all of them", but we accept any.`;
        },
      }, emoji)),
  );

  const keepOutput = h("output", { for: "rt-keep" }, "100%");
  const status = h("p", { class: "form-note", role: "status" });
  const submit = h("button", { type: "submit", class: "btn btn-buy btn-big" }, "Submit return for processing");
  let token = newToken();

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const order = orders.find((entry) => entry.workflowId === data.get("order"));
    submit.disabled = true;
    status.textContent = "⏳ Filing your paperwork...";
    try {
      const result = await api("/returns", {
        method: "POST",
        body: {
          clientToken: token,
          orderRef: order?.workflowId ?? null,
          orderId: order?.orderId ?? "",
          itemId: data.get("item"),
          reason: data.get("reason"),
          affidavit: {
            boxSmell: data.get("smell"),
            moonPhase: data.get("moon"),
            regretSquares: picked.size,
            keepWillingness: Number(data.get("keep")),
          },
        },
      });
      remember("returns", {
        workflowId: result.workflowId,
        returnId: result.returnId,
        itemName: result.item?.name ?? "Something",
        filedAt: new Date().toISOString(),
      });
      token = newToken();
      navigate(`#/return/${result.workflowId}`);
    } catch (error) {
      submit.disabled = false;
      status.textContent = `💥 ${error.message} Your answers are still here; press the button to try again.`;
    }
  }

  return h("section", {},
    h("h1", {}, "Returns Department"),
    h("p", { class: "panel" }, "Returning an item is easy! Simply complete Form 27-B below, pass six independent checks, swear the Returns Oath and await our decision. Every return gets a decision. We did not say which one."),
    h("form", { class: "returns-form", onSubmit },
      h("div", { class: "panel" },
        h("h2", {}, "Section 1 of 4 (of 11): The item"),
        h("label", { for: "rt-order" }, "Order"), orderSelect,
        h("label", { for: "rt-item" }, "Item to return"), itemSelect,
        h("label", { for: "rt-reason" }, "Reason for return"),
        h("select", { id: "rt-reason", name: "reason" }, catalog.returnReasons.map((reason) => h("option", { value: reason }, reason))),
      ),
      h("div", { class: "panel" },
        h("h2", {}, "Section 2 of 4 (of 11): The box"),
        h("label", { for: "rt-smell" }, "Describe the smell of the box"),
        h("input", { id: "rt-smell", name: "smell", maxLength: 200, placeholder: "e.g. cardboard, with notes of disappointment" }),
        h("label", { for: "rt-moon" }, "Phase of the moon at the time of purchase"),
        h("select", { id: "rt-moon", name: "moon" }, MOON_PHASES.map((phase) => h("option", { value: phase }, phase))),
      ),
      h("div", { class: "panel" },
        h("h2", {}, "Section 3 of 4 (of 11): Prove you are not a pigeon"),
        h("p", { class: "label" }, "Select all squares containing regret"),
        captcha,
        captchaNote,
      ),
      h("div", { class: "panel" },
        h("h2", {}, "Section 4 of 4 (of 11): Reflection"),
        h("label", { for: "rt-keep" }, "How willing are you to just keep it? "),
        h("input", { id: "rt-keep", name: "keep", type: "range", min: 0, max: 100, value: 100, onInput: (event) => { keepOutput.textContent = `${event.target.value}%`; } }),
        keepOutput,
      ),
      submit,
      status,
    ),
  );
}

// ---- tracker ---------------------------------------------------------------

function decisionLetter(result) {
  const decision = result.decision;
  const tone = decision.code === "DENIED" ? "denied" : "approved";
  const breakdown = decision.refund?.breakdown ?? [];
  return h("div", { class: `panel decision decision-${tone}` },
    h("p", { class: "stamp" }, decision.code.replaceAll("_", " ")),
    h("h2", {}, decision.headline),
    h("p", {}, `Dear ${decision.customerName},`),
    h("p", {}, `Regarding your return of ${decision.item?.name} (${decision.returnId}), filed against ${decision.orderFound ? `order ${decision.orderId}` : "an order we could not find, which is normal for us"}:`),
    h("p", {}, h("strong", {}, decision.explanation)),
    decision.refund
      ? h("div", {},
          h("table", { class: "charges" }, h("tbody", {},
            breakdown.map((line) => h("tr", {}, h("td", {}, line.label), h("td", {}, money(line.amountCents)))),
            h("tr", { class: "grand-total" }, h("td", {}, "REFUND"), h("td", {}, money(decision.refund.refundCents))))),
          h("p", {}, `To be paid to ${decision.refund.paidTo}.`))
      : null,
    decision.credit
      ? h("div", {},
          h("p", {}, "Store credit: ", h("strong", {}, money(decision.credit.creditCents)), " - code ", h("code", {}, decision.credit.creditCode)),
          h("p", { class: "fine-print" }, decision.credit.terms))
      : null,
    decision.denial ? h("p", { class: "fine-print" }, decision.denial.appeal) : null,
    h("p", {}, decision.oath?.received
      ? (decision.oath.exact ? "Your Returns Oath was received and found to be word-perfect. It made no difference." : "Your Returns Oath was received. It contained deviations from the approved wording, which we noticed.")
      : "No Returns Oath was received before the window closed."),
    h("p", { class: "fine-print" }, decision.footnote),
    h("p", { class: "fine-print" }, "No refund, credit or denial here is real. This is a parody store."),
    result.conductorUrl
      ? h("p", { class: "fine-print" }, h("a", { href: result.conductorUrl, target: "_blank", rel: "noopener" }, "See how this return was processed (Conductor workflow)"))
      : null,
  );
}

export function returnTrackerView(workflowId) {
  const headline = h("p", { class: "tracker-headline", role: "status" }, "⏳ Locating your paperwork...");
  const checkList = h("ol", { class: "checks" });
  const oathSlot = h("div", {});
  const decisionSlot = h("div", {});
  const title = h("h1", {}, "Return in progress");
  const container = h("section", {},
    title,
    h("div", { class: "panel" }, headline, checkList),
    oathSlot,
    decisionSlot,
    h("a", { class: "btn", href: "#/regrets" }, "My regrets"),
  );

  let oathPanel = null;
  let secondsLeft = 0;
  let oathSent = false;
  const countdown = h("strong", { class: "oath-countdown" });

  function showChecks(result) {
    const done = result.checks ?? [];
    const items = [];
    for (let n = 1; n <= result.totalChecks; n++) {
      const check = done.find((entry) => entry.n === n);
      if (check) {
        items.push(h("li", { class: "check done" },
          h("strong", {}, `${check.department}: `), check.name,
          h("span", { class: `verdict ${check.verdict.startsWith("PASS") ? "pass" : "fail"}` }, check.verdict),
          h("small", {}, check.note)));
      } else if (n === done.length + 1 && result.state === "CHECKING") {
        items.push(h("li", { class: "check running" }, `Check ${n} of ${result.totalChecks} is under way... `, h("span", { class: "blink" }, "⚙️")));
      } else if (result.state === "CHECKING") {
        items.push(h("li", { class: "check queued" }, `Check ${n} of ${result.totalChecks}: waiting its turn.`));
      }
    }
    checkList.replaceChildren(...items);
  }

  function showOath(result) {
    if (result.state !== "AWAITING_OATH" || oathSent) {
      if (oathPanel && result.state !== "AWAITING_OATH") {
        oathPanel.remove();
        oathPanel = null;
      }
      return;
    }
    secondsLeft = result.oath.secondsLeft;
    countdown.textContent = `${secondsLeft}s`;
    if (oathPanel) return;
    const input = h("input", { id: "oath-input", maxLength: 300, autocomplete: "off", placeholder: "Type the oath exactly" });
    const note = h("p", { class: "form-note", role: "status" });
    const button = h("button", { type: "submit", class: "btn btn-buy" }, "I swear");
    oathPanel = h("form", {
      class: "panel oath",
      onSubmit: async (event) => {
        event.preventDefault();
        if (!input.value.trim()) {
          note.textContent = "An oath needs at least one word in it.";
          return;
        }
        button.disabled = true;
        try {
          const updated = await api(`/returns/${workflowId}/oath`, { method: "POST", body: { oath: input.value } });
          oathSent = true;
          oathPanel?.remove();
          oathPanel = null;
          update(updated);
        } catch (error) {
          button.disabled = false;
          note.textContent = error.code === "OATH_CLOSED"
            ? "Too late: the oath window has closed. Your return is being decided without it."
            : `${error.message} Try again.`;
        }
      },
    },
      h("h2", {}, "✋ Final step: the Returns Oath"),
      h("p", {}, "To complete your return, type the following oath. You have ", countdown, " left. If you do not, we decide without you."),
      h("blockquote", {}, result.oath.text),
      h("label", { for: "oath-input" }, "Your oath"),
      input, button, note,
    );
    oathSlot.replaceChildren(oathPanel);
    input.focus();
  }

  function update(result) {
    showChecks(result);
    showOath(result);
    if (result.state === "CHECKING") headline.textContent = `🔎 Running pointless check ${Math.min(result.checks.length + 1, result.totalChecks)} of ${result.totalChecks}. Please enjoy the mandatory contemplation period after each one.`;
    else if (result.state === "AWAITING_OATH") headline.textContent = "✋ All checks complete. Awaiting your Returns Oath.";
    else if (result.state === "DECIDING") headline.textContent = "⚖️ The committee is deciding...";
    else if (result.state === "DECIDED") {
      title.textContent = "Return decided";
      headline.textContent = "📬 A decision has been reached.";
      decisionSlot.replaceChildren(decisionLetter(result));
      const saved = state.returns.find((entry) => entry.workflowId === workflowId);
      if (saved && saved.code !== result.decision.code) remember("returns", { ...saved, code: result.decision.code });
    } else {
      headline.textContent = `🧯 This return could not be decided automatically and needs a person to look at it. Reference: ${result.workflowId}`;
    }
  }

  (async () => {
    let failures = 0;
    for (;;) {
      try {
        const result = await api(`/returns/${encodeURIComponent(workflowId)}`);
        failures = 0;
        if (!container.isConnected) return;
        update(result);
        if (result.state === "DECIDED" || result.state === "NEEDS_OPERATOR") return;
      } catch (error) {
        if (error.status === 404) {
          headline.textContent = "We have no record of that return, which is consistent with our record-keeping.";
          return;
        }
        failures++;
        headline.textContent = `😬 ${error.message} Your return carries on without this page; checking again shortly...`;
      }
      // Tick the oath countdown locally between polls.
      for (let tick = 0; tick < (failures > 0 ? 3 : 1); tick++) {
        await sleep(1000);
        if (secondsLeft > 0) countdown.textContent = `${--secondsLeft}s`;
      }
      if (!container.isConnected) return;
    }
  })();

  return container;
}
