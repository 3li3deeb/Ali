// ===== الاستيراد من ملف Firebase =====
import {
    auth,
    db,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

// ===== متغيرات عامة =====
let currentUser = null;
let currentEditType = null;   // article / news / disease / medicine
let currentEditId = null;      // معرّف العنصر أثناء التعديل
let pendingDelete = { type: null, id: null };
let quill = null;              // محرر النصوص

// ===== عناصر الواجهة =====
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuToggle = document.getElementById('menuToggle');
const logoutBtn = document.getElementById('logoutBtn');
const editorModal = document.getElementById('editorModal');
const deleteModal = document.getElementById('deleteModal');
const modalTitle = document.getElementById('modalTitle');
const saveModalBtn = document.getElementById('saveModalBtn');
const saveModalText = document.getElementById('saveModalText');
const modalSpinner = document.getElementById('modalSpinner');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// ===== حماية الصفحة: لا يدخل إلا المسجّل =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;

    // عرض بيانات المستخدم
    const email = user.email || '';
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const settingsEmailEl = document.getElementById('settingsEmail');

    if (userNameEl) userNameEl.textContent = email.split('@')[0];
    if (userAvatarEl) userAvatarEl.textContent = email.charAt(0).toUpperCase();
    if (settingsEmailEl) settingsEmailEl.value = email;

    // تحميل البيانات
    loadAllData();
});

// ===== تهيئة محرر Quill =====
function initQuill() {
    if (quill) return;

    quill = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: 'اكتب محتوى المقال هنا...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
}

// ===== تبديل الأقسام =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        const targetSection = item.getAttribute('data-section');
        const targetTitle = item.getAttribute('data-title');
        const targetSubtitle = item.getAttribute('data-subtitle');

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

        item.classList.add('active');
        const section = document.getElementById(targetSection);
        if (section) section.classList.add('active');

        document.getElementById('pageTitle').textContent = targetTitle;
        document.getElementById('pageSubtitle').textContent = targetSubtitle;

        if (history.pushState) {
            history.pushState(null, null, '#' + targetSection);
        }

        // إغلاق القائمة على الهاتف
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ===== القائمة الجانبية على الهاتف =====
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

// ===== تسجيل الخروج =====
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('هل تريد تسجيل الخروج؟')) return;
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('خطأ تسجيل الخروج:', error);
            alert('فشل تسجيل الخروج: ' + error.message);
        }
    });
}

// ============================================
//   تحميل البيانات من Firebase
// ============================================

async function loadAllData() {
    try {
        await Promise.all([
            loadCollection('articles', 'articlesTable', renderArticleRow, 'statArticles'),
            loadCollection('news', 'newsTable', renderNewsRow, 'statNews'),
            loadCollection('diseases', 'diseasesTable', renderDiseaseRow, 'statDiseases'),
            loadCollection('medicines', 'medicinesTable', renderMedicineRow, 'statMedicines'),
            loadComments(),
            loadCategories()
        ]);

        // تحميل أحدث المقالات في الصفحة الرئيسية
        loadRecentArticles();

    } catch (error) {
        console.error('خطأ التحميل:', error);
    }
}

async function loadCollection(collectionName, tableId, renderFn, statId) {
    const tableBody = document.getElementById(tableId);
    const statEl = document.getElementById(statId);
    if (!tableBody) return;

    try {
        const snapshot = await getDocs(collection(db, collectionName));
        const items = [];
        snapshot.forEach(docSnap => {
            items.push({ id: docSnap.id, ...docSnap.data() });
        });

        // ترتيب حسب التاريخ (الأحدث أولاً)
        items.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
        });

        // تحديث العداد
        if (statEl) {
            animateNumber(statEl, items.length);
        }

        // رسم الجدول
        if (items.length === 0) {
            const colCount = tableBody.closest('table').querySelector('thead tr').children.length;
            tableBody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">لا توجد عناصر بعد</td></tr>`;
        } else {
            tableBody.innerHTML = items.map(item => renderFn(item)).join('');
        }

        // تفعيل أزرار التعديل والحذف
        tableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const item = items.find(i => i.id === id);
                if (item) openEditorForEdit(collectionName.replace(/s$/, ''), item);
            });
        });

        tableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openDeleteModal(collectionName, id);
            });
        });

    } catch (error) {
        console.error(`خطأ تحميل ${collectionName}:`, error);
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: #EF4444;">خطأ في التحميل</td></tr>`;
    }
}

// ===== رسم صفوف الجداول =====

function renderArticleRow(item) {
    const date = formatDate(item.createdAt);
    const status = getStatusBadge(item.status);
    return `
        <tr>
            <td>${escapeHtml(item.title || 'بدون عنوان')}</td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>${date}</td>
            <td>${status}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}" title="تعديل">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}" title="حذف">🗑️</button>
            </td>
        </tr>
    `;
}

function renderNewsRow(item) {
    const date = formatDate(item.createdAt);
    const status = getStatusBadge(item.status);
    return `
        <tr>
            <td>${escapeHtml(item.title || 'بدون عنوان')}</td>
            <td>${escapeHtml(item.source || '-')}</td>
            <td>${date}</td>
            <td>${status}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}">🗑️</button>
            </td>
        </tr>
    `;
}

function renderDiseaseRow(item) {
    const desc = (item.content || '').replace(/<[^>]*>/g, '').substring(0, 60) + '...';
    return `
        <tr>
            <td>${escapeHtml(item.title || 'بدون اسم')}</td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>${escapeHtml(desc)}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}">🗑️</button>
            </td>
        </tr>
    `;
}

function renderMedicineRow(item) {
    const desc = (item.content || '').replace(/<[^>]*>/g, '').substring(0, 60) + '...';
    return `
        <tr>
            <td>${escapeHtml(item.title || 'بدون اسم')}</td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>${escapeHtml(desc)}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}">🗑️</button>
            </td>
        </tr>
    `;
}

// ===== أحدث المقالات =====
async function loadRecentArticles() {
    const tbody = document.getElementById('recentArticles');
    if (!tbody) return;

    try {
        const snapshot = await getDocs(collection(db, 'articles'));
        const items = [];
        snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));

        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        const latest = items.slice(0, 5);
        if (latest.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">لا توجد مقالات بعد. ابدأ بإضافة مقال جديد.</td></tr>';
            return;
        }

        tbody.innerHTML = latest.map(item => `
            <tr>
                <td>${escapeHtml(item.title || 'بدون عنوان')}</td>
                <td>${escapeHtml(item.category || '-')}</td>
                <td>${formatDate(item.createdAt)}</td>
                <td>${getStatusBadge(item.status)}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('خطأ تحميل أحدث المقالات:', error);
    }
}

// ===== التعليقات =====
async function loadComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;

    try {
        const snapshot = await getDocs(collection(db, 'comments'));
        const items = [];
        snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));

        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (items.length === 0) {
            list.innerHTML = '<div class="empty-state">لا توجد تعليقات بعد.</div>';
            return;
        }

        list.innerHTML = items.map(c => `
            <div class="comment-item" data-id="${c.id}">
                <div class="comment-avatar">${(c.name || 'ز').charAt(0)}</div>
                <div class="comment-body">
                    <div class="comment-header">
                        <strong>${escapeHtml(c.name || 'زائر')}</strong>
                        <span class="comment-date">${formatDate(c.createdAt)}</span>
                    </div>
                    <p>${escapeHtml(c.text || '')}</p>
                    <div class="comment-actions">
                        <button class="btn-mini" data-comment-action="approve" data-id="${c.id}" style="width:auto;padding:0 0.8rem;font-size:0.75rem;font-weight:700;">✓ موافقة</button>
                        <button class="btn-mini danger" data-comment-action="reject" data-id="${c.id}" style="width:auto;padding:0 0.8rem;font-size:0.75rem;font-weight:700;">✗ حذف</button>
                    </div>
                </div>
            </div>
        `).join('');

        // أحداث الموافقة/الحذف
        list.querySelectorAll('[data-comment-action="approve"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    await updateDoc(doc(db, 'comments', id), { approved: true });
                    btn.textContent = '✓ تمت الموافقة';
                    btn.style.background = '#10B981';
                    btn.style.color = 'white';
                } catch (e) { alert('خطأ: ' + e.message); }
            });
        });

        list.querySelectorAll('[data-comment-action="reject"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!confirm('حذف التعليق؟')) return;
                try {
                    await deleteDoc(doc(db, 'comments', id));
                    btn.closest('.comment-item').remove();
                } catch (e) { alert('خطأ: ' + e.message); }
            });
        });

    } catch (error) {
        console.error('خطأ تحميل التعليقات:', error);
        list.innerHTML = '<div class="empty-state">خطأ في تحميل التعليقات</div>';
    }
}

// ===== التصنيفات =====
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    try {
        const snapshot = await getDocs(collection(db, 'articles'));
        const counts = {};
        snapshot.forEach(d => {
            const cat = d.data().category;
            if (cat) counts[cat] = (counts[cat] || 0) + 1;
        });

        const entries = Object.entries(counts);
        if (entries.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد تصنيفات بعد. أضف مقالات لإنشاء تصنيفات تلقائياً.</div>';
            return;
        }

        const icons = {
            'علمية': '🔬',
            'تغذية': '🥗',
            'صحة القلب': '❤️',
            'الصحة النفسية': '🧠',
            'صحة الأطفال': '👶',
            'الأمراض المزمنة': '💉'
        };

        grid.innerHTML = entries.map(([name, count]) => `
            <div class="category-item">
                <span class="category-item-icon">${icons[name] || '📁'}</span>
                <h4>${escapeHtml(name)}</h4>
                <span class="category-item-count">${count} مقال</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('خطأ التصنيفات:', error);
    }
}

// ============================================
//   المحرر (إضافة / تعديل)
// ============================================

window.openEditor = function(type) {
    currentEditType = type;
    currentEditId = null;
    pendingDelete = { type: null, id: null };

    initQuill();

    // ضبط العنوان
    const titles = {
        article: 'إضافة مقال جديد',
        news: 'إضافة خبر جديد',
        disease: 'إضافة مرض جديد',
        medicine: 'إضافة دواء جديد'
    };
    modalTitle.textContent = titles[type] || 'إضافة';

    // إظهار/إخفاء الحقول
    const articleFields = document.getElementById('articleFieldsOnly');
    const diseaseMedicineFields = document.getElementById('diseaseMedicineFields');

    if (type === 'article' || type === 'news') {
        articleFields.style.display = 'grid';
        diseaseMedicineFields.style.display = 'none';
    } else {
        articleFields.style.display = 'none';
        diseaseMedicineFields.style.display = 'grid';
    }

    // إعادة تعيين الحقول
    document.getElementById('editorTitle').value = '';
    document.getElementById('editorCategory').value = '';
    document.getElementById('editorSource').value = '';
    document.getElementById('editorCategoryField').value = '';
    document.getElementById('editorImage').value = '';
    document.getElementById('editorStatus').value = 'published';
    quill.root.innerHTML = '';

    // إظهار النافذة
    editorModal.classList.add('active');
};

function openEditorForEdit(type, item) {
    window.openEditor(type);
    currentEditId = item.id;
    modalTitle.textContent = 'تعديل: ' + (item.title || '');
    saveModalText.textContent = 'حفظ التعديلات';

    document.getElementById('editorTitle').value = item.title || '';
    document.getElementById('editorCategory').value = item.category || '';
    document.getElementById('editorSource').value = item.source || '';
    document.getElementById('editorCategoryField').value = item.category || '';
    document.getElementById('editorImage').value = item.image || '';
    document.getElementById('editorStatus').value = item.status || 'published';

    if (quill && item.content) {
        quill.root.innerHTML = item.content;
    }
}

window.closeEditor = function() {
    editorModal.classList.remove('active');
    currentEditType = null;
    currentEditId = null;
    saveModalText.textContent = 'حفظ ونشر';
};

// ===== حفظ العنصر =====
saveModalBtn.addEventListener('click', async () => {
    if (!currentEditType || !quill) return;

    const title = document.getElementById('editorTitle').value.trim();
    const content = quill.root.innerHTML.trim();
    const image = document.getElementById('editorImage').value.trim();
    const status = document.getElementById('editorStatus').value;

    // التحقق
    if (!title) {
        alert('الرجاء إدخال العنوان');
        return;
    }

    if (!content || content === '<p><br></p>') {
        alert('الرجاء إدخال المحتوى');
        return;
    }

    // تحديد التصنيف حسب النوع
    let category = '';
    let source = '';

    if (currentEditType === 'article' || currentEditType === 'news') {
        category = document.getElementById('editorCategory').value;
        source = document.getElementById('editorSource').value.trim();
    } else {
        category = document.getElementById('editorCategoryField').value.trim();
    }

    if (!category) {
        alert('الرجاء إدخال التصنيف');
        return;
    }

    // تعطيل الزر
    saveModalBtn.disabled = true;
    modalSpinner.classList.add('show');
    saveModalText.textContent = 'جارٍ الحفظ...';

    // تحديد اسم المجموعة
    const collectionName = {
        article: 'articles',
        news: 'news',
        disease: 'diseases',
        medicine: 'medicines'
    }[currentEditType];

    try {
        const data = {
            title,
            content,
            category,
            source,
            image,
            status,
            updatedAt: serverTimestamp(),
            author: currentUser?.email || 'admin'
        };

        if (currentEditId) {
            // تعديل
            await updateDoc(doc(db, collectionName, currentEditId), data);
        } else {
            // جديد
            data.createdAt = serverTimestamp();
            data.views = 0;
            data.likes = 0;
            await addDoc(collection(db, collectionName), data);
        }

        // نجاح
        saveModalText.textContent = '✓ تم الحفظ';
        modalSpinner.classList.remove('show');

        setTimeout(() => {
            window.closeEditor();
            loadAllData();
            saveModalBtn.disabled = false;
        }, 800);

    } catch (error) {
        console.error('خطأ الحفظ:', error);
        alert('فشل الحفظ: ' + error.message);
        saveModalBtn.disabled = false;
        modalSpinner.classList.remove('show');
        saveModalText.textContent = 'حفظ ونشر';
    }
});

// ============================================
//   الحذف
// ============================================

function openDeleteModal(collectionName, id) {
    pendingDelete = { type: collectionName, id };
    deleteModal.classList.add('active');
}

window.closeDeleteModal = function() {
    deleteModal.classList.remove('active');
    pendingDelete = { type: null, id: null };
};

confirmDeleteBtn.addEventListener('click', async () => {
    if (!pendingDelete.type || !pendingDelete.id) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'جارٍ الحذف...';

    try {
        await deleteDoc(doc(db, pendingDelete.type, pendingDelete.id));
        window.closeDeleteModal();
        loadAllData();
    } catch (error) {
        console.error('خطأ الحذف:', error);
        alert('فشل الحذف: ' + error.message);
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'حذف نهائياً';
    }
});

// ============================================
//   إعدادات الحساب
// ============================================

const saveSettings = document.getElementById('saveSettings');
if (saveSettings) {
    saveSettings.addEventListener('click', () => {
        const original = saveSettings.textContent;
        saveSettings.textContent = '✓ تم الحفظ';
        saveSettings.style.background = '#10B981';
        setTimeout(() => {
            saveSettings.textContent = original;
            saveSettings.style.background = '';
        }, 1800);
    });
}

// ============================================
//   أدوات مساعدة
// ============================================

function formatDate(timestamp) {
    if (!timestamp) return '-';
    let date;
    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getStatusBadge(status) {
    const map = {
        published: '<span class="status-badge success">منشور</span>',
        draft: '<span class="status-badge warning">مسودة</span>',
        urgent: '<span class="status-badge danger">عاجل</span>'
    };
    return map[status] || map.published;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function animateNumber(el, target) {
    const duration = 1200;
    const startTime = performance.now();
    const startValue = 0;
    function update(t) {
        const elapsed = t - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (target - startValue) * eased);
        el.textContent = current.toLocaleString('ar-EG');
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target.toLocaleString('ar-EG');
    }
    requestAnimationFrame(update);
}

// ===== تحميل القسم من الهاش عند البدء =====
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const targetNav = document.querySelector(`.nav-item[data-section="${hash}"]`);
        if (targetNav) targetNav.click();
    }
});

// ===== البحث العام =====
const globalSearch = document.getElementById('globalSearch');
if (globalSearch) {
    globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = e.target.value.trim().toLowerCase();
            if (!q) return;
            const activeSection = document.querySelector('.content-section.active');
            if (!activeSection) return;
            const rows = activeSection.querySelectorAll('.data-table tbody tr');
            let found = 0;
            rows.forEach(row => {
                const match = row.textContent.toLowerCase().includes(q);
                row.style.display = match ? '' : 'none';
                if (match) found++;
            });
            if (found === 0) {
                alert('لا توجد نتائج لـ: ' + q);
                rows.forEach(r => r.style.display = '');
            }
        }
    });
}
