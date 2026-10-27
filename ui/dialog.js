// The opener cannot activate a choice: wait for all inputs to release and a quiet period,
// then require a fresh pointer/key gesture to select AND a separate gesture to confirm.
export class Dialog {
  constructor(element) {
    this.element = element;
    this.body = element.querySelector(".dialog-body");
    this.held = new Set();
    this.epoch = 0;
    this.readyAt = 0;
    this.lastInput = 0;
    this.gestures = new WeakMap();
    document.addEventListener(
      "pointerdown",
      (e) => {
        this.held.add("p" + e.pointerId);
        this.lastInput = performance.now();
        const b = e.target.closest("button");
        if (b && this.ready()) this.gestures.set(b, this.epoch);
      },
      true,
    );
    const release = (e) => {
      this.held.delete("p" + e.pointerId);
      this.lastInput = performance.now();
    };
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    document.addEventListener(
      "keydown",
      (e) => {
        if (["Space", "Enter"].includes(e.code)) {
          const b = e.target.closest("button");
          if (!e.repeat && b && this.ready()) this.gestures.set(b, this.epoch);
          this.held.add(e.code);
          this.lastInput = performance.now();
        }
      },
      true,
    );
    document.addEventListener(
      "keyup",
      (e) => {
        this.held.delete(e.code);
        this.lastInput = performance.now();
      },
      true,
    );
    window.addEventListener("blur", () => {
      this.held.clear();
      this.disarm();
    });
    element.addEventListener("cancel", (e) => e.preventDefault());
    element.addEventListener(
      "click",
      (e) => {
        const button = e.target.closest("button");
        if (!button) return;
        if (this.gestures.get(button) !== this.epoch || button.disabled) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        this.gestures.delete(button);
      },
      true,
    );
    this.tryArm = () => {
      if (
        this.element.open &&
        !this.armed &&
        performance.now() >= this.readyAt &&
        !this.held.size &&
        performance.now() - this.lastInput > 450
      ) {
        this.armed = true;
        clearInterval(this.timer);
        this.timer = null;
        this.body
          .querySelectorAll("[data-guard]")
          .forEach((b) => (b.disabled = b.dataset.unavailable === "true"));
        const hint = this.body.querySelector(".input-hint");
        if (hint)
          hint.textContent =
            "Choose an option, then confirm. Your project is paused.";
      }
    };
  }
  startGuardTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(this.tryArm, 80);
  }
  ready() {
    return this.armed && performance.now() >= this.readyAt;
  }
  disarm() {
    this.epoch++;
    this.armed = false;
    this.readyAt = performance.now() + 650;
    if (this.element.open) this.startGuardTimer();
    this.body
      .querySelectorAll("[data-guard]")
      .forEach((b) => (b.disabled = true));
  }
  show(html) {
    this.body.innerHTML = html;
    this.disarm();
    if (!this.element.open) this.element.showModal();
    this.startGuardTimer();
    const heading = this.body.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }
  close() {
    clearInterval(this.timer);
    this.timer = null;
    this.element.close();
    this.epoch++;
    this.armed = false;
  }
  button(label, action, unavailable = false, className = "primary") {
    const b = document.createElement("button");
    b.textContent = label;
    b.className = className;
    b.dataset.guard = "";
    b.dataset.unavailable = String(unavailable);
    b.disabled = true;
    b.onclick = action;
    return b;
  }
  choices({ eyebrow, title, description, items, onConfirm, extra }) {
    this.show(
      `<p class="eyebrow">${eyebrow}</p><h2 tabindex="-1">${title}</h2><p>${description}</p><p class="input-hint" role="status">Release controls and take a moment to read.</p><div class="choices"></div><div class="dialog-actions"></div>`,
    );
    let selected = null;
    const grid = this.body.querySelector(".choices"),
      actions = this.body.querySelector(".dialog-actions");
    const confirm = this.button(
      "Select an option first",
      () => {
        if (selected === null) return;
        const id = selected;
        selected = null;
        confirm.disabled = true;
        onConfirm(id);
      },
      true,
    );
    items.forEach((item, i) => {
      const b = this.button(
        "",
        () => {
          selected = item.id;
          grid.querySelectorAll("button").forEach((x) => {
            x.classList.remove("selected");
            x.setAttribute("aria-pressed", "false");
          });
          b.classList.add("selected");
          b.setAttribute("aria-pressed", "true");
          confirm.textContent = `Confirm: ${item.name}`;
          confirm.dataset.unavailable = "false";
          this.disarm();
        },
        item.disabled,
        "choice",
      );
      b.innerHTML = `<span class="choice-number">0${i + 1}</span><strong>${item.name}</strong><span>${item.description}</span>${item.meta ? `<small>${item.meta}</small>` : ""}`;
      b.setAttribute("aria-pressed", "false");
      grid.append(b);
    });
    actions.append(confirm);
    extra?.(actions);
  }
}
