// ===== القائمة الجانبية على الهاتف =====
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

if (menuToggle && sidebar && overlay) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
}

// ===== التنقل بين الأقسام =====
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        const targetSection = item.getAttribute('data-section');
        const targetTitle = item.getAttribute('data-title') || 'لوحة التحكم';
        const targetSubtitle = item.getAttribute('data-subtitle') || '';

        // إزالة active من كل العناصر
        navItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(sec => sec.classList.remove('active'));

        // إضافة active للعنصر الحالي
        item.classList.add('active');

        // إظهار القسم المطلوب
        const targetEl = document.getElementById(targetSection);
        if (targetEl) {
            targetEl.classList.add('active');
        }

        // تحديث العنوان
        if (pageTitle) pageTitle.textContent = targetTitle;
        if (pageSubtitle) pageSubtitle.textContent = targetSubtitle;

        // إغلاق القائمة على الهاتف
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        }

        // العودة لأعلى الصفحة
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // تشغيل عدّادات القسم الجديد
        animateCounters();
    });
});

// ===== تشغيل الرابط حسب الهاش في URL =====
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const targetNav = document.querySelector(`.nav-item[data-section="${hash}"]`);
        if (targetNav) {
            targetNav.click();
        }
    }
});

// ===== عدّاد الأرقام المتحرك =====
function animateCounters() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;

    const counters = activeSection.querySelectorAll('[data-count]');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'), 10);
        const duration = 1200;
        const startTime = performance.now();
        const startValue = 0;

        function updateCount(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const currentValue = Math.floor(startValue + (target - startValue) * eased);
            counter.textContent = currentValue.toLocaleString('ar-EG');

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                counter.textContent = target.toLocaleString('ar-EG');
            }
        }

        requestAnimationFrame(updateCount);
    });
}

// تشغيل العدادات عند تحميل الصفحة
window.addEventListener('load', () => {
    setTimeout(animateCounters, 300);
});

// ===== إخفاء الشريط الجانبي عند التمرير على الهاتف =====
let lastScrollY = 0;
window.addEventListener('scroll', () => {
    if (window.innerWidth <= 768) return;
    lastScrollY = window.scrollY;
}, { passive: true });

// ===== تأثير دخول البطاقات عند التمرير =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.stat-card, .dashboard-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// إعادة إظهار البطاقات عند تبديل الأقسام
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        setTimeout(() => {
            document.querySelectorAll('.content-section.active .stat-card, .content-section.active .dashboard-card').forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 60);
            });
        }, 50);
    });
});

// ===== زر "حفظ التغييرات" =====
const btnSave = document.querySelector('.btn-save');
if (btnSave) {
    btnSave.addEventListener('click', () => {
        btnSave.textContent = '✓ تم الحفظ!';
        btnSave.style.background = '#10B981';
        setTimeout(() => {
            btnSave.textContent = 'حفظ التغييرات';
            btnSave.style.background = '';
        }, 2000);
    });
}

// ===== أزرار "إضافة" =====
document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
        const originalText = btn.textContent;
        btn.textContent = '✓ قريباً';
        btn.style.background = '#10B981';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
    });
});

// ===== البحث =====
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                alert('البحث عن: ' + query);
                // هنا يمكنك إضافة منطق البحث الفعلي
            }
        }
    });
}
