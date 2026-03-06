# 📁 ТОЧНАЯ СТРУКТУРА ДЛЯ ВАШЕГО РЕПОЗИТОРИЯ

## ✅ ВАША ТЕКУЩАЯ СТРУКТУРА:

```
freedom-hire/
├── middleware.ts                     ← Корень проекта
├── src/
│   └── app/
│       ├── jobs/
│       │   └── [id]/
│       │       ├── ApplyButton.tsx   ← УЖЕ ЕСТЬ
│       │       ├── JobViewTracker.tsx ← УЖЕ ЕСТЬ  
│       │       └── page.tsx          ← ЗАМЕНИТЬ
│       │
│       └── company/
│           └── [slug]/
│               └── page.tsx          ← Редактирование (приватно)
```

## 🎯 ЧТО НУЖНО СДЕЛАТЬ:

### 1. Заменить страницу вакансии
Файл: `src/app/jobs/[id]/page.tsx`

**Windows команда:**
```cmd
copy jobs-id\page.tsx src\app\jobs\[id]\page.tsx
```

**Или вручную:**
- Откройте `src/app/jobs/[id]/page.tsx`
- Скопируйте содержимое из `jobs-id/page.tsx`
- Вставьте и сохраните

### 2. Создать новую папку для публичной страницы компании
**Важно:** Это НОВАЯ папка, не путайте с `/company/[slug]`!

**Windows команды:**
```cmd
mkdir src\app\companies
mkdir src\app\companies\[id]
copy companies-id\page.tsx src\app\companies\[id]\page.tsx
```

**Или вручную:**
1. Создайте папку `src/app/companies/`
2. Внутри создайте папку `[id]` (с квадратными скобками!)
3. Внутри `[id]` создайте файл `page.tsx`
4. Скопируйте содержимое из `companies-id/page.tsx`

### 3. Обновить middleware.ts

```cmd
copy middleware-FIXED.ts middleware.ts
```

## ✅ ИТОГОВАЯ СТРУКТУРА:

```
freedom-hire/
├── middleware.ts                     ← ОБНОВЛЕНО
├── src/
│   └── app/
│       ├── jobs/
│       │   └── [id]/
│       │       ├── ApplyButton.tsx
│       │       ├── JobViewTracker.tsx
│       │       └── page.tsx          ← ОБНОВЛЕНО
│       │
│       ├── company/                  ← СТАРОЕ (для редактирования)
│       │   └── [slug]/
│       │       └── page.tsx
│       │
│       └── companies/                ← НОВОЕ! (для просмотра)
│           └── [id]/
│               └── page.tsx          ← НОВЫЙ ФАЙЛ
```

## 📝 РАЗНИЦА МЕЖДУ /company И /companies:

| Путь | Назначение | Доступ | Параметр |
|------|------------|--------|----------|
| `/company/[slug]` | Редактирование компании | Приватный (требует авторизацию) | slug |
| `/companies/[id]` | Просмотр компании | Публичный | id |

## 🚀 ФИНАЛЬНЫЕ КОМАНДЫ:

```cmd
cd C:\Users\User\freedom-hire

# 1. Замените страницу вакансии
copy jobs-id\page.tsx src\app\jobs\[id]\page.tsx

# 2. Создайте страницу компании
mkdir src\app\companies
mkdir src\app\companies\[id]
copy companies-id\page.tsx src\app\companies\[id]\page.tsx

# 3. Обновите middleware
copy middleware-FIXED.ts middleware.ts

# 4. Проверьте что создалось
dir src\app\companies\[id]

# 5. Git
git add .
git status
git commit -m "fix: добавлена публичная страница компаний /companies/[id]"
git push
```

## ⚠️ ВАЖНО:

1. **НЕ УДАЛЯЙТЕ** `/company/[slug]` - это страница редактирования
2. **СОЗДАЙТЕ НОВУЮ** `/companies/[id]` - это страница просмотра
3. Обе папки должны существовать одновременно!

## ✅ ПРОВЕРКА:

После деплоя:

1. `/company/abc` → Редактирование (требует авторизацию) ✅
2. `/companies/d4176568-2af6-43d0-b9b8-3db37a80aafa` → Просмотр (публично) ✅

---

**Теперь структура 100% правильная!** 🎯
