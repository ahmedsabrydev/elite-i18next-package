import { i18n } from '@/lib/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: 'English' },
    ar: {
      displayName: 'العربية',
      'Search(search dialog)': 'بحث',
      'Search(search trigger)': 'بحث',
      'No results found(search dialog)': 'لا توجد نتائج',
      'On this page(table of contents)': 'في هذه الصفحة',
      'Table of Contents(inline table of contents)': 'جدول المحتويات',
      'Last updated on(page footer)': 'آخر تحديث',
      'Previous Page(pagination)': 'السابق',
      'Next Page(pagination)': 'التالي',
      'Choose a language(language switcher)': 'اختر اللغة',
      'Edit on GitHub(edit page)': 'عدّل على GitHub',
      'Toggle Theme(theme switcher)(aria-label)': 'تبديل المظهر',
    },
  });

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: { title: locale === 'ar' ? 'أفانغ i18n' : '@faang/i18n' },
    githubUrl: 'https://github.com/ahmedsabrydev/elite-i18next-package',
  };
}
