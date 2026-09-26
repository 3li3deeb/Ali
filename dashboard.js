// ===== الاستيراد من supabase-config =====
import {
    supabase,
    uploadImage,
    fetchAll,
    insertItem,
    updateItem,
    deleteItem
} from './supabase-config.js';

// ===== متغيرات عامة =====
let currentEditType = null;
let currentEditId = null;
let pendingDelete = { table: null, id: null };
let quill = null;
let selectedImageFile = null;
let existingImageUrl = null;

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
const imageInput = document.getElementById('imageInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const changeImageBtn = document.getElementById('changeImageBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const editorSummary = document.getElementById('editorSummary');
const summaryCounter = document.getElementById('summaryCounter');

// ============================================
//   التهيئة الأولية
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileMenu();
    initLogout();
    initImageUpload();
    initSummaryCounter();
    initSearch();
    loadAllData();
    loadUserInfo();
});

// ===== معلومات المستخدم (من localStorage) =====
function loadUserInfo() {
    const email = localStorage.getItem('mendocino_admin_email') || 'admin@mendocino.com';
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const emailEl = document.getElementById('settingsEmail');

    if (nameEl) nameEl.textContent = email.split('@')[0];
    if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();
    if (emailEl) emailEl.value = email;
}

// ============================================
//   التنقل بين الأقسام
// ============================================

function initNavigation() {
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

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ===== القائمة على الهاتف =====
function initMobileMenu() {
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
}

// ===== تسجيل الخروج =====
function initLogout() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (!confirm('هل تريد تسجيل الخروج؟')) return;
            localStorage.removeItem('mendocino_admin_email');
            window.location.href = 'login.html';
        });
    }
}

// ============================================
//   رفع الصور
// ============================================

function initImageUpload() {
    if (!imageUploadArea) return;

    // فتح نافذة اختيار الملف
    imageUploadArea.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-image') || e.target.closest('.btn-change-image')) return;
        if (imagePreviewContainer.style.display === 'none' || !selectedImageFile && !existingImageUrl) {
            imageInput.click();
        } else {
            imageInput.click();
        }
    });

    // عند اختيار ملف
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // التحقق من النوع
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار ملف صورة');
            return;
        }

        // التحقق من الحجم (5 ميجا)
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
            return;
        }

        selectedImageFile = file;

        // معاينة فورية
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            uploadPlaceholder.style.display = 'none';
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // زر إزالة الصورة
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedImageFile = null;
        existingImageUrl = null;
        imageInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
    });

    // زر تغيير الصورة
    changeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageInput.click();
    });
}

// ===== عدّاد أحرف الموجز =====
function initSummaryCounter() {
    if (!editorSummary || !summaryCounter) return;

    editorSummary.addEventListener('input', () => {
        const len = editorSummary.value.length;
        summaryCounter.textContent = `${len} / 150`;
        if (len > 130) {
            summaryCounter.style.color = '#EF4444';
        } else {
            summaryCounter.style.color = '';
        }
    });
}

// ============================================
//   البحث العام
// ============================================

function initSearch() {
    const globalSearch = document.getElementById('globalSearch');
    if (!globalSearch) return;

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

// ============================================
//   تحميل البيانات من Supabase
// ============================================

async function loadAllData() {
    try {
        await Promise.all([
            loadTable('articles', 'articlesTable', renderRow, 'statArticles'),
            loadTable('news', 'newsTable', renderRow, 'statNews'),
            loadTable('diseases', 'diseasesTable', renderDiseaseMedicineRow, 'statDiseases'),
            loadTable('medicines', 'medicinesTable', renderDiseaseMedicineRow, 'statMedicines'),
            loadComments(),
            loadCategories(),
            loadRecentArticles()
        ]);
    } catch (error) {
        console.error('خطأ التحميل:', error);
    }
}

async function loadTable(table, tableId, renderFn, statId) {
    const tbody = document.getElementById(tableId);
    const statEl = document.getElementById(statId);
    if (!tbody) return;

    try {
        const items = await fetchAll(table);

        if (statEl) animateNumber(statEl, items.length);

        const colCount = tbody.closest('table').querySelector('thead tr').children.length;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">لا توجد عناصر بعد</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => renderFn(table, item)).join('');

        // أحداث التعديل والحذف
        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const item = items.find(i => i.id === id);
                if (item) openEditorForEdit(table, item);
            });
        });

        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                openDeleteModal(table, id);
            });
        });

    } catch (error) {
        console.error(`خطأ تحميل ${table}:`, error);
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color: #EF4444;">خطأ في التحميل</td></tr>`;
    }
}

// ===== رسم صف المقالات والأخبار =====
function renderRow(table, item) {
    const date = formatDate(item.created_at);
    const status = getStatusBadge(item.status);
    const img = item.image_url
        ? `<img src="${item.image_url}" alt="" class="table-thumb">`
        : `<div class="table-thumb-empty">📷</div>`;

    const extraCell = table === 'news'
        ? `<td>${escapeHtml(item.source || '-')}</td>`
        : `<td>${escapeHtml(item.category || '-')}</td>`;

    return `
        <tr>
            <td>${img}</td>
            <td>${escapeHtml(item.title || 'بدون عنوان')}</td>
            ${extraCell}
            <td>${date}</td>
            <td>${status}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}" title="تعديل">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}" title="حذف">🗑️</button>
            </td>
        </tr>
    `;
}

// ===== رسم صفوف الأمراض والأدوية =====
function renderDiseaseMedicineRow(table, item) {
    const img = item.image_url
        ? `<img src="${item.image_url}" alt="" class="table-thumb">`
        : `<div class="table-thumb-empty">📷</div>`;

    return `
        <tr>
            <td>${img}</td>
            <td>${escapeHtml(item.name || 'بدون اسم')}</td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>
                <button class="btn-mini" data-action="edit" data-id="${item.id}" title="تعديل">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}" title="حذف">🗑️</button>
            </td>
        </tr>
    `;
}

// ===== أحدث المقالات =====
async function loadRecentArticles() {
    const tbody = document.getElementById('recentArticles');
    if (!tbody) return;

    try {
        const items = await fetchAll('articles');
        const latest = items.slice(0, 5);

        if (latest.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">لا توجد مقالات بعد. ابدأ بإضافة مقال جديد.</td></tr>';
            return;
        }

        tbody.innerHTML = latest.map(item => `
            <tr>
                <td>${escapeHtml(item.title || 'بدون عنوان')}</td>
                <td>${escapeHtml(item.category || '-')}</td>
                <td>${formatDate(item.created_at)}</td>
                <td>${getStatusBadge(item.status)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('خطأ أحدث المقالات:', error);
    }
}

// ===== التعليقات =====
async function loadComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;

    try {
        const items = await fetchAll('comments');

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
                        <span class="comment-date">${formatDate(c.created_at)}</span>
                    </div>
                    <p>${escapeHtml(c.text || '')}</p>
                    <div class="comment-actions">
                        <button class="btn-mini" data-comment-action="approve" data-id="${c.id}" style="width:auto;padding:0 0.8rem;font-size:0.75rem;font-weight:700;">✓ موافقة</button>
                        <button class="btn-mini danger" data-comment-action="reject" data-id="${c.id}" style="width:auto;padding:0 0.8rem;font-size:0.75rem;font-weight:700;">✗ حذف</button>
                    </div>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('[data-comment-action="approve"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'));
                try {
                    await updateItem('comments', id, { approved: true });
                    btn.textContent = '✓ تمت الموافقة';
                    btn.style.background = '#10B981';
                    btn.style.color = 'white';
                } catch (e) { alert('خطأ: ' + e.message); }
            });
        });

        list.querySelectorAll('[data-comment-action="reject"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'));
                if (!confirm('حذف التعليق؟')) return;
                try {
                    await deleteItem('comments', id);
                    btn.closest('.comment-item').remove();
                } catch (e) { alert('خطأ: ' + e.message); }
            });
        });

    } catch (error) {
        console.error('خطأ التعليقات:', error);
        list.innerHTML = '<div class="empty-state">خطأ في تحميل التعليقات</div>';
    }
}

// ===== التصنيفات =====
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    try {
        const items = await fetchAll('articles');
        const counts = {};
        items.forEach(item => {
            const cat = item.category;
            if (cat) counts[cat] = (counts[cat] || 0) + 1;
        });

        const entries = Object.entries(counts);
        if (entries.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد تصنيفات بعد.</div>';
            return;
        }

        const icons = {
            'علمية': '🔬', 'تغذية': '🥗', 'صحة القلب': '❤️',
            'الصحة النفسية': '🧠', 'صحة الأطفال': '👶', 'الأمراض المزمنة': '💉'
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

window.openEditor = function(table) {
    currentEditType = table;
    currentEditId = null;
    selectedImageFile = null;
    existingImageUrl = null;

    initQuill();

    const titles = {
        articles: 'إضافة مقال جديد',
        news: 'إضافة خبر جديد',
        diseases: 'إضافة مرض جديد',
        medicines: 'إضافة دواء جديد'
    };
    modalTitle.textContent = titles[table] || 'إضافة';

    const articleFields = document.getElementById('articleFieldsOnly');
    const diseaseMedicineFields = document.getElementById('diseaseMedicineFields');

    if (table === 'articles' || table === 'news') {
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
    document.getElementById('editorStatus').value = 'published';
    editorSummary.value = '';
    summaryCounter.textContent = '0 / 150';
    summaryCounter.style.color = '';
    quill.root.innerHTML = '';

    // إعادة ضبط الصورة
    selectedImageFile = null;
    existingImageUrl = null;
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    uploadPlaceholder.style.display = 'flex';
    uploadProgress.style.display = 'none';

    saveModalText.textContent = 'حفظ ونشر';
    editorModal.classList.add('active');
};

function openEditorForEdit(table, item) {
    window.openEditor(table);

    currentEditId = item.id;
    modalTitle.textContent = 'تعديل: ' + (item.title || item.name || '');
    saveModalText.textContent = 'حفظ التعديلات';

    if (table === 'articles' || table === 'news') {
        document.getElementById('editorTitle').value = item.title || '';
        document.getElementById('editorCategory').value = item.category || '';
        document.getElementById('editorSource').value = item.source || '';
    } else {
        document.getElementById('editorTitle').value = item.name || '';
        document.getElementById('editorCategoryField').value = item.category || '';
    }

    document.getElementById('editorStatus').value = item.status || 'published';

    // الموجز
    if (item.summary) {
        editorSummary.value = item.summary;
        summaryCounter.textContent = `${item.summary.length} / 150`;
    }

    // الصورة الموجودة
    if (item.image_url) {
        existingImageUrl = item.image_url;
        imagePreview.src = item.image_url;
        uploadPlaceholder.style.display = 'none';
        imagePreviewContainer.style.display = 'block';
    }

    if (quill && item.content) {
        quill.root.innerHTML = item.content;
    }
}

window.closeEditor = function() {
    editorModal.classList.remove('active');
    currentEditType = null;
    currentEditId = null;
    selectedImageFile = null;
    existingImageUrl = null;
    saveModalText.textContent = 'حفظ ونشر';
};

// ===== تهيئة Quill =====
function initQuill() {
    if (quill) return;
    quill = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: 'اكتب المحتوى الكامل هنا...',
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

// ============================================
//   حفظ العنصر (مع رفع الصورة)
// ============================================

saveModalBtn.addEventListener('click', async () => {
    if (!currentEditType || !quill) return;

    const table = currentEditType;

    // الحصول على البيانات
    const titleEl = document.getElementById('editorTitle');
    const title = titleEl.value.trim();
    const content = quill.root.innerHTML.trim();
    const status = document.getElementById('editorStatus').value;
    const summary = editorSummary.value.trim();

    if (!title) { alert('الرجاء إدخال العنوان'); return; }
    if (!content || content === '<p><br></p>') { alert('الرجاء إدخال المحتوى'); return; }

    // البيانات حسب الجدول
    let data = {
        status,
        summary,
        content
    };

    if (table === 'articles' || table === 'news') {
        const category = document.getElementById('editorCategory').value;
        const source = document.getElementById('editorSource').value.trim();
        if (!category) { alert('الرجاء اختيار التصنيف'); return; }
        data.title = title;
        data.category = category;
        data.source = source;
    } else {
        const category = document.getElementById('editorCategoryField').value.trim();
        data.name = title;
        data.category = category;
        data.description = content;
    }

    // تعطيل الزر
    saveModalBtn.disabled = true;
    modalSpinner.classList.add('show');
    saveModalText.textContent = 'جارٍ الحفظ...';

    try {
        // رفع الصورة إذا اختار صورة جديدة
        if (selectedImageFile) {
            uploadProgress.style.display = 'block';
            progressFill.style.width = '30%';
            progressText.textContent = '30%';

            const imageUrl = await uploadImage(selectedImageFile);
            data.image_url = imageUrl;

            progressFill.style.width = '100%';
            progressText.textContent = '100%';
        } else if (existingImageUrl) {
            data.image_url = existingImageUrl;
        }

        // الحفظ أو التحديث
        if (currentEditId) {
            await updateItem(table, currentEditId, data);
        } else {
            await insertItem(table, data);
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
        uploadProgress.style.display = 'none';
        saveModalText.textContent = 'حفظ ونشر';
    }
});

// ============================================
//   الحذف
// ============================================

function openDeleteModal(table, id) {
    pendingDelete = { table, id };
    deleteModal.classList.add('active');
}

window.closeDeleteModal = function() {
    deleteModal.classList.remove('active');
    pendingDelete = { table: null, id: null };
};

confirmDeleteBtn.addEventListener('click', async () => {
    if (!pendingDelete.table || !pendingDelete.id) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'جارٍ الحذف...';

    try {
        await deleteItem(pendingDelete.table, pendingDelete.id);
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
//   الإعدادات
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
    const date = new Date(timestamp);
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
    if (!text) return '';
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

// ===== تحميل القسم من الهاش =====
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const targetNav = document.querySelector(`.nav-item[data-section="${hash}"]`);
        if (targetNav) targetNav.click();
    }
});
