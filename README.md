# Заказ тетрадей — GitHub Pages + Firebase

Готовые статические файлы для репозитория `books`.

1. Загрузите все файлы из этой папки в корень репозитория.
2. В Firebase откройте Authentication → Sign-in method и включите Email/Password.
3. В Authentication → Users создайте пользователя `lukshaolga1982@gmail.com` и задайте пароль.
4. Откройте Firestore Database и создайте базу.
5. В Firestore → Rules вставьте содержимое `firestore.rules` и нажмите Publish.
6. В GitHub откройте Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.

Данные доступны только авторизованному пользователю с указанным адресом.
