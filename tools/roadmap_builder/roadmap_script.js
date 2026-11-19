// tools/roadmap_builder/roadmap_script.js
export const roadmapClientScript = `
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Botón Volver Arriba
    const backTopBtn = document.getElementById('backTopBtn');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backTopBtn.classList.add('visible');
      } else {
        backTopBtn.classList.remove('visible');
      }
    });

    backTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. Navegación por Ribbon con Scroll Activo
    const ribbonSteps = document.querySelectorAll('.ribbon-step');
    const phaseCards = document.querySelectorAll('.phase-card');

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0
    };

    const phaseObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          ribbonSteps.forEach(step => {
            if (step.getAttribute('href') === '#' + id) {
              step.classList.add('active');
            } else {
              step.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    phaseCards.forEach(card => phaseObserver.observe(card));

    // 3. Filtro Interactivo por Rol de Usuario
    const roleSelect = document.getElementById('roleFilterSelect');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const selectedRole = e.target.value;

        phaseCards.forEach(card => {
          const metaText = card.querySelector('.phase-meta-tags')?.textContent || '';
          if (selectedRole === 'ALL' || metaText.includes(selectedRole)) {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
            card.style.display = 'block';
          } else {
            card.style.opacity = '0.35';
            card.style.transform = 'scale(0.98)';
          }
        });

        // Filtrar también carriles swimlane
        const swimlanes = document.querySelectorAll('.swimlane');
        swimlanes.forEach(lane => {
          const laneRole = lane.querySelector('.lane-role')?.textContent || '';
          if (selectedRole === 'ALL' || laneRole.includes(selectedRole)) {
            lane.style.opacity = '1';
          } else {
            lane.style.opacity = '0.35';
          }
        });
      });
    }
  });
`;
