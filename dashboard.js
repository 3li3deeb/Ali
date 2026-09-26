// ===== إعدادات Supabase مباشرة داخل الملف =====
const SUPABASE_URL = 'https://lkfzibeuyurqkatexhzf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bDRpST47zs7WWTJP1N1Q9w_SkJCRBPx';

// ===== الوصول إلى supabase من النافذة (تم تحميله من CDN في HTML) =====
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== دوال Supabase =====
async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await sb.storage
        .from('article-images')
        .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = sb.storage
        .from('article-images')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

async function fetchAll(table) {
    const { data, error } = await sb
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function insertItem(table, item) {
    const { data, error } = await sb.from(table).insert([item]).select();
    if (error) throw error;
    return data[0];
}

async function updateItem(table, id, updates) {
    const { data, error } = await sb.from(table).update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
}

async function deleteItem(table, id) {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ===== متغيرات عامة =====
let currentEditType = null;
let currentEditId = null;
let pendingDelete = { table: null, id: null };
let quill = null;
let selectedImageFile = null;
let existingImageUrl = null;

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
    handleHashOnLoad();
});

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
//   التنقل
// ============================================

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            const title = item.getAttribute('data-title');
            const subtitle = item.getAttribute('data-subtitle');

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const el = document.getElementById(section);
            if (el) el.classList.add('active');

            document.getElementById('pageTitle').textContent = title;
            document.getElementById('pageSubtitle').textContent = subtitle;

            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('overlay').classList.remove('active');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function handleHashOnLoad() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const nav = document.querySelector(`.nav-item[data-section="${hash}"]`);
        if (nav) nav.click();
    }
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!menuToggle) return;

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
}

function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!confirm('هل تريد تسجيل الخروج؟')) return;
        localStorage.removeItem('mendocino_admin_email');
        window.location.href = 'login.html';
    });
}

// ============================================
//   رفع الصور
// ============================================

function initImageUpload() {
    const area = document.getElementById('imageUploadArea');
    const input = document.getElementById('imageInput');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const changeBtn = document.getElementById('changeImageBtn');

    if (!area) return;

    area.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-image') || e.target.closest('.btn-change-image')) return;
        input.click();
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('الرجاء اختيار ملف صورة'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت'); return; }

        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            placeholder.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedImageFile = null;
        existingImageUrl = null;
        input.value = '';
        preview.src = '';
        previewContainer.style.display = 'none';
        placeholder.style.display = 'flex';
    });

    changeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.click();
    });
}

function initSummaryCounter() {
    const ta = document.getElementById('editorSummary');
    const counter = document.getElementById('summaryCounter');
    if (!ta || !counter) return;
    ta.addEventListener('input', () => {
        const len = ta.value.length;
        counter.textContent = `${len} / 150`;
        counter.style.color = len > 130 ? '#EF4444' : '';
    });
}

// ============================================
//   البحث
// ============================================

function initSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const q = e.target.value.trim().toLowerCase();
        if (!q) return;
        const section = document.querySelector('.content-section.active');
        if (!section) return;
        const rows = section.querySelectorAll('.data-table tbody tr');
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
    });
}

// ============================================
//   تحميل البيانات
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
    } catch (e) {
        console.error('خطأ عام:', e);
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
        bindRowActions(tbody, items, table);

    } catch (error) {
        console.error(`خطأ ${table}:`, error);
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:#EF4444;">خطأ في التحميل: ${error.message}</td></tr>`;
    }
}

function bindRowActions(tbody, items, table) {
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            const item = items.find(i => i.id === id);
            if (item) openEditorForEdit(table, item);
        });
    });
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            openDeleteModal(table, id);
        });
    });
}

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
                <button class="btn-mini" data-action="edit" data-id="${item.id}">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}">🗑️</button>
            </td>
        </tr>
    `;
}

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
                <button class="btn-mini" data-action="edit" data-id="${item.id}">✏️</button>
                <button class="btn-mini danger" data-action="delete" data-id="${item.id}">🗑️</button>
            </td>
        </tr>
    `;
}

async function loadRecentArticles() {
    const tbody = document.getElementById('recentArticles');
    if (!tbody) return;
    try {
        const items = await fetchAll('articles');
        const latest = items.slice(0, 5);
        if (latest.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">لا توجد مقالات بعد.</td></tr>';
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
    } catch (e) { console.error(e); }
}

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
                    btn.textContent = '✓ تم';
                    btn.style.background = '#10B981';
                    btn.style.color = 'white';
                } catch (e) { alert(e.message); }
            });
        });
        list.querySelectorAll('[data-comment-action="reject"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'));
                if (!confirm('حذف التعليق؟')) return;
                try {
                    await deleteItem('comments', id);
                    btn.closest('.comment-item').remove();
                } catch (e) { alert(e.message); }
            });
        });
    } catch (e) { console.error(e); }
}

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
    } catch (e) { console.error(e); }
}

// ============================================
//   المحرر
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
    document.getElementById('modalTitle').textContent = titles[table] || 'إضافة';

    const articleFields = document.getElementById('articleFieldsOnly');
    const dmFields = document.getElementById('diseaseMedicineFields');

    if (table === 'articles' || table === 'news') {
        articleFields.style.display = 'grid';
        dmFields.style.display = 'none';
    } else {
        articleFields.style.display = 'none';
        dmFields.style.display = 'grid';
    }

    document.getElementById('editorTitle').value = '';
    document.getElementById('editorCategory').value = '';
    document.getElementById('editorSource').value = '';
    document.getElementById('editorCategoryField').value = '';
    document.getElementById('editorStatus').value = 'published';
    document.getElementById('editorSummary').value = '';
    document.getElementById('summaryCounter').textContent = '0 / 150';
    quill.root.innerHTML = '';

    selectedImageFile = null;
    existingImageUrl = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
    document.getElementById('uploadProgress').style.display = 'none';

    document.getElementById('saveModalText').textContent = 'حفظ ونشر';
    document.getElementById('editorModal').classList.add('active');
};

function openEditorForEdit(table, item) {
    window.openEditor(table);
    currentEditId = item.id;
    document.getElementById('modalTitle').textContent = 'تعديل: ' + (item.title || item.name || '');
    document.getElementById('saveModalText').textContent = 'حفظ التعديلات';

    if (table === 'articles' || table === 'news') {
        document.getElementById('editorTitle').value = item.title || '';
        document.getElementById('editorCategory').value = item.category || '';
        document.getElementById('editorSource').value = item.source || '';
    } else {
        document.getElementById('editorTitle').value = item.name || '';
        document.getElementById('editorCategoryField').value = item.category || '';
    }

    document.getElementById('editorStatus').value = item.status || 'published';

    if (item.summary) {
        document.getElementById('editorSummary').value = item.summary;
        document.getElementById('summaryCounter').textContent = `${item.summary.length} / 150`;
    }

    if (item.image_url) {
        existingImageUrl = item.image_url;
        document.getElementById('imagePreview').src = item.image_url;
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('imagePreviewContainer').style.display = 'block';
    }

    if (quill && item.content) {
        quill.root.innerHTML = item.content;
    }
}

window.closeEditor = function() {
    document.getElementById('editorModal').classList.remove('active');
    currentEditType = null;
    currentEditId = null;
    selectedImageFile = null;
    existingImageUrl = null;
};

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

// ===== حفظ =====
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveModalBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        if (!currentEditType || !quill) return;

        const table = currentEditType;
        const title = document.getElementById('editorTitle').value.trim();
        const content = quill.root.innerHTML.trim();
        const status = document.getElementById('editorStatus').value;
        const summary = document.getElementById('editorSummary').value.trim();

        if (!title) { alert('الرجاء إدخال العنوان'); return; }
        if (!content || content === '<p><br></p>') { alert('الرجاء إدخال المحتوى'); return; }

        let data = { status, summary, content };

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

        saveBtn.disabled = true;
        document.getElementById('modalSpinner').classList.add('show');
        document.getElementById('saveModalText').textContent = 'جارٍ الحفظ...';

        try {
            if (selectedImageFile) {
                document.getElementById('uploadProgress').style.display = 'block';
                document.getElementById('progressFill').style.width = '50%';
                document.getElementById('progressText').textContent = '50%';
                const url = await uploadImage(selectedImageFile);
                data.image_url = url;
                document.getElementById('progressFill').style.width = '100%';
                document.getElementById('progressText').textContent = '100%';
            } else if (existingImageUrl) {
                data.image_url = existingImageUrl;
            }

            if (currentEditId) {
                await updateItem(table, currentEditId, data);
            } else {
                await insertItem(table, data);
            }

            document.getElementById('saveModalText').textContent = '✓ تم الحفظ';
            document.getElementById('modalSpinner').classList.remove('show');

            setTimeout(() => {
                window.closeEditor();
                loadAllData();
                saveBtn.disabled = false;
            }, 800);

        } catch (error) {
            console.error(error);
            alert('فشل الحفظ: ' + error.message);
            saveBtn.disabled = false;
            document.getElementById('modalSpinner').classList.remove('show');
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('saveModalText').textContent = 'حفظ ونشر';
        }
    });
});

// ===== الحذف =====
function openDeleteModal(table, id) {
    pendingDelete = { table, id };
    document.getElementById('deleteModal').classList.add('active');
}

window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('active');
    pendingDelete = { table: null, id: null };
};

document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (!confirmBtn) return;
    confirmBtn.addEventListener('click', async () => {
        if (!pendingDelete.table || !pendingDelete.id) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'جارٍ الحذف...';
        try {
            await deleteItem(pendingDelete.table, pendingDelete.id);
            window.closeDeleteModal();
            loadAllData();
        } catch (e) {
            alert('فشل الحذف: ' + e.message);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'حذف نهائياً';
        }
    });
});

// ===== الإعدادات =====
document.addEventListener('DOMContentLoaded', () => {
    const save = document.getElementById('saveSettings');
    if (!save) return;
    save.addEventListener('click', () => {
        const orig = save.textContent;
        save.textContent = '✓ تم الحفظ';
        save.style.background = '#10B981';
        setTimeout(() => {
            save.textContent = orig;
            save.style.background = '';
        }, 1800);
    });
});

// ===== أدوات مساعدة =====
function formatDate(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    const start = performance.now();
    function update(t) {
        const elapsed = t - start;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = Math.floor(target * eased);
        el.textContent = cur.toLocaleString('ar-EG');
        if (p < 1) requestAnimationFrame(update);
        else el.textContent = target.toLocaleString('ar-EG');
    }
    requestAnimationFrame(update);
}
