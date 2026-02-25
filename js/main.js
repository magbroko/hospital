/**
 * MediCare Hospital - Main JavaScript
 * Handles testimonials slider, FAQ toggle, and general interactions
 */

document.addEventListener('DOMContentLoaded', function() {
  initTestimonialsSlider();
  initSmoothScroll();
});

/**
 * Testimonials Slider
 */
function initTestimonialsSlider() {
  const testimonials = [
    {
      name: 'Margaret Johnson',
      role: 'Cardiology Patient',
      rating: 5,
      text: '"The care I received at this hospital was exceptional. The entire team was professional, compassionate, and made me feel at ease during a challenging time. Highly recommended!"',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face'
    },
    {
      name: 'David Chen',
      role: 'Orthopedics Patient',
      rating: 5,
      text: '"From diagnosis to recovery, the orthopedic team was outstanding. The rehabilitation program helped me get back to my active lifestyle in record time."',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Pediatrics Parent',
      rating: 5,
      text: '"As a parent, finding a hospital that treats children with such care and expertise was a relief. My daughter actually looks forward to her checkups!"',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face'
    }
  ];

  let currentIndex = 0;
  const slider = document.querySelector('.testimonials-slider');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  if (!slider || !prevBtn || !nextBtn) return;

  function renderTestimonial(index) {
    const t = testimonials[index];
    const stars = '<i class="fas fa-star text-warning"></i>'.repeat(t.rating);
    slider.innerHTML = `
      <div class="testimonial-card">
        <div class="card">
          <div class="d-flex align-items-center mb-3">
            <img src="${t.image}" alt="${t.name}" class="rounded-circle me-3" style="width: 60px; height: 60px; object-fit: cover;">
            <div>
              <h4 class="mb-0 fw-semibold">${t.name}</h4>
              <p class="mb-0 small text-secondary">${t.role}</p>
            </div>
          </div>
          <div class="mb-3">${stars}</div>
          <p class="text-secondary fst-italic mb-0">${t.text}</p>
        </div>
      </div>
    `;
  }

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
    renderTestimonial(currentIndex);
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % testimonials.length;
    renderTestimonial(currentIndex);
  });

  renderTestimonial(0);
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
