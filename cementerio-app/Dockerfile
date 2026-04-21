FROM nginx:alpine

# Config SPA fallback (expo-router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Web build export (se genera con `npx.cmd expo export --platform web`)
COPY dist/ /usr/share/nginx/html/

