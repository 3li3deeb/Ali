// ===== تأثير الهيدر عند التمرير =====
const headerTop = document.getElementById('headerTop');
let lastScrollY = window.scrollY;

function handleScroll() {
    if (!headerTop) return;

    const currentScrollY = window.scrollY;

    // عند التمرير لأسفل أكثر من 150 بكسل
    if (currentScrollY > 150) {
        headerTop.classList.add('scrolled');
    } else {
        headerTop.classList.remove('scrolled');
    }

    lastScrollY = currentScrollY;
}

// تشغيل عند التمرير
window.addEventListener('scroll', handleScroll, { passive: true });

// تشغيل عند تحميل الصفحة (لتفادي حالة التمرير المحفوظة)
window.addEventListener('load', handleScroll);

// ===== تأثير التمرير (Scroll Reveal) =====
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    const revealPoint = 100;

    revealElements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        
        if (elementTop < windowHeight - revealPoint) {
            el.classList.add('active');
        }
    });
};

window.addEventListener('scroll', revealOnScroll, { passive: true });
window.addEventListener('load', revealOnScroll);
