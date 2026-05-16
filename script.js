// Mobile navigation toggle for the shared site header.
document.querySelectorAll("[data-site-header]").forEach((header) => {
  const toggle = header.querySelector("[data-menu-toggle]");
  const menu = header.querySelector("[data-menu]");

  if (!toggle || !menu) {
    return;
  }

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
    menu.classList.remove("is-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.classList.toggle("is-open", !isOpen);
    menu.classList.toggle("is-open", !isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeMenu();
    }
  });
});

// Lightweight client-side filtering for the writing archive.
document.querySelectorAll("[data-filter-controls]").forEach((controls) => {
  const filterKey = controls.getAttribute("data-filter-controls");
  const list = document.querySelector(`[data-filter-list="${filterKey}"]`);

  if (!list) {
    return;
  }

  const buttons = controls.querySelectorAll("[data-filter]");
  const items = list.querySelectorAll("[data-category]");

  const applyFilter = (activeFilter) => {
    buttons.forEach((button) => {
      const isActive = button.getAttribute("data-filter") === activeFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    items.forEach((item) => {
      const categories = (item.getAttribute("data-category") || "").split(" ");
      const isVisible = activeFilter === "all" || categories.includes(activeFilter);
      item.hidden = !isVisible;
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter(button.getAttribute("data-filter") || "all");
    });
  });

  applyFilter("all");
});
