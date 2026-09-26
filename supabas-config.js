// ===== إعدادات Supabase =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lkfzibeuyurqkatexhzf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bDRpST47zs7WWTJP1N1Q9w_SkJCRBPx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== دوال مساعدة =====

// رفع صورة إلى Storage
export async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
        .from('article-images')
        .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// جلب كل العناصر من جدول
export async function fetchAll(table, orderBy = 'created_at') {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending: false });

    if (error) throw error;
    return data;
}

// إضافة عنصر
export async function insertItem(table, item) {
    const { data, error } = await supabase
        .from(table)
        .insert([item])
        .select();

    if (error) throw error;
    return data[0];
}

// تحديث عنصر
export async function updateItem(table, id, updates) {
    const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

// حذف عنصر
export async function deleteItem(table, id) {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}
