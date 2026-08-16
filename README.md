# Заказ рабочих тетрадей

Готовый сайт для GitHub Pages и Firebase.

## Файлы

- `index.html` — главная страница;
- `style.css` — оформление;
- `app.js` — логика, авторизация и сохранение;
- `catalog.js` — 338 позиций из прайс-листа;
- `firestore.rules` — правила доступа к базе.

## Установка

1. Удалите из репозитория старые файлы и папки, не удаляя локальную `.git`.
2. Поместите пять файлов сайта и этот README в корень репозитория.
3. В Firebase Authentication включите Email/Password и создайте пользователя `lukshaolga1982@gmail.com`.
4. В Authentication → Settings → Authorized domains добавьте `lukshaolga1982-ship-it.github.io`.
5. Создайте Firestore Database, вставьте содержимое `firestore.rules` в Rules и опубликуйте.
6. В GitHub Settings → Pages выберите ветку `main` и папку `/ (root)`.
