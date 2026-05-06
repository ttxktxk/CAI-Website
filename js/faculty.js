document.addEventListener("DOMContentLoaded", () => {
  const revealItems = document.querySelectorAll(".reveal-fac");

  if (!revealItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = [...revealItems].indexOf(entry.target);
        entry.target.style.transitionDelay = `${index * 90}ms`;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.16
  });

  revealItems.forEach(item => observer.observe(item));
});