// ===== تأثير شريط التنقل عند التمرير =====
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

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

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// ===== تأثير الكتابة (اختياري) =====
const typeWriter = (element, text, speed = 100) => {
    let i = 0;
    element.textContent = '';
    
    const type = () => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    };
    
    type();
};

// ===== مؤشر الماوس المتوهج (اختياري) =====
const createGlow = (e) => {
    const glow = document.createElement('div');
    glow.style.cssText = `
        position: fixed;
        pointer-events: none;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(212,160,23,0.1) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        z-index: 0;
        transition: opacity 0.3s;
    `;
    document.body.appendChild(glow);
    setTimeout(() => glow.remove(), 100);
};

document.addEventListener('mousemove', createGlow);

// ===== إزالة التنبيه القديم =====
// تم إزالة alert("مرحباً! موقعك يعمل الآن ") لأنه غير احترافي
