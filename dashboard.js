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

        // تحديث الهاش في URL
        if (history.pushState) {
            history.pushState(null, null, '#' + targetSection);
        }

        // إغلاق القائمة على الهاتف
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        }

        // العودة لأعلى الصفحة
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // تشغيل العدّادات للقسم الجديد
        animateCounters();

        // إظهار البطاقات بتأثير متسلسل
        revealCards(targetEl);
    });
});

// ===== تشغيل الرابط حسب الهاش في URL عند التحميل =====
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
        const duration = 1500;
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

// تشغيل العدّادات عند تحميل الصفحة
window.addEventListener('load', () => {
    setTimeout(animateCounters, 300);
});

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

// ===== إظهار بطاقات القسم بتأثير متسلسل =====
function revealCards(section) {
    if (!section) return;
    
    setTimeout(() => {
        const cards = section.querySelectorAll('.stat-card, .dashboard-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 60);
        });
    }, 50);
}

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

// ===== أزرار "إضافة جديد" =====
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

// ===== أزرار تعديل/حذف في الجداول =====
document.querySelectorAll('.btn-mini').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // زر الحذف
        if (btn.classList.contains('danger')) {
            if (confirm('هل أنت متأكد من الحذف؟')) {
                const row = btn.closest('tr');
                if (row) {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-30px)';
                    setTimeout(() => row.remove(), 300);
                }
            }
        }
        // زر التعديل
        else {
            const originalText = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        }
    });
});

// ===== أزرار موافقة/رفض التعليقات =====
document.querySelectorAll('.comment-actions .btn-mini').forEach(btn => {
    btn.addEventListener('click', () => {
        const comment = btn.closest('.comment-item');
        if (!comment) return;
        
        if (btn.classList.contains('success')) {
            comment.style.transition = 'all 0.4s ease';
            comment.style.background = 'rgba(16, 185, 129, 0.15)';
            comment.style.borderColor = '#10B981';
            setTimeout(() => {
                comment.style.opacity = '0';
                comment.style.transform = 'translateX(-30px)';
                setTimeout(() => comment.remove(), 400);
            }, 500);
        } else if (btn.classList.contains('danger')) {
            comment.style.transition = 'all 0.4s ease';
            comment.style.background = 'rgba(239, 68, 68, 0.15)';
            comment.style.borderColor = '#EF4444';
            setTimeout(() => {
                comment.style.opacity = '0';
                comment.style.transform = 'translateX(30px)';
                setTimeout(() => comment.remove(), 400);
            }, 500);
        }
    });
});

// ===== البحث =====
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                // البحث في الجداول المعروضة حالياً
                const activeSection = document.querySelector('.content-section.active');
                if (activeSection) {
                    const rows = activeSection.querySelectorAll('.data-table tbody tr');
                    let found = 0;
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        if (text.includes(query.toLowerCase())) {
                            row.style.background = 'rgba(42, 157, 159, 0.15)';
                            row.style.transition = 'background 0.3s ease';
                            found++;
                            setTimeout(() => {
                                row.style.background = '';
                            }, 3000);
                        }
                    });
                    
                    if (found === 0) {
                        alert('لا توجد نتائج لـ: ' + query);
                    }
                }
            }
        }
    });
}

// ===== الإشعارات =====
const iconBtn = document.querySelector('.icon-btn');
if (iconBtn) {
    iconBtn.addEventListener('click', () => {
        alert('🔔 لديك 5 إشعارات جديدة:\n\n• 3 تعليقات جديدة\n• مقال واحد يحتاج مراجعة\n• تحديث في الأقسام');
    });
}

// ===== تفاعل أزرار الرسم البياني =====
document.querySelectorAll('.bar').forEach(bar => {
    bar.addEventListener('click', () => {
        const height = bar.style.height;
        const percent = parseInt(height);
        alert(`📊 نسبة المشاهدات: ${percent}%`);
    });
});

// ===== زر الإجراءات السريعة =====
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // إذا كان الرابط داخلياً (#) لا نمنع السلوك
        const href = btn.getAttribute('href');
        if (href && href.startsWith('#')) {
            // نسمح بالتنقل الطبيعي
            return;
        }
        e.preventDefault();
    });
});

// ===== عرض إشعار ترحيبي عند أول زيارة =====
window.addEventListener('load', () => {
    const hasVisited = sessionStorage.getItem('dashboardVisited');
    if (!hasVisited) {
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 2rem;
                left: 2rem;
                background: linear-gradient(135deg, #2A9D9F, #1E7B7D);
                color: #ffffff;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(42, 157, 159, 0.4);
                font-weight: 700;
                z-index: 2000;
                animation: slideInLeft 0.5s ease;
                font-family: 'Cairo', sans-serif;
                max-width: 300px;
            `;
            notification.innerHTML = '👋 مرحباً بك في لوحة التحكم!';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.transition = 'all 0.5s ease';
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-100%)';
                setTimeout(() => notification.remove(), 500);
            }, 3000);
            
            sessionStorage.setItem('dashboardVisited', 'true');
        }, 1000);
    }
});

// ===== إضافة أنيميشن slideInLeft =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);
