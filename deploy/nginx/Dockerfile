FROM nginx:1.27-alpine

RUN apk add --no-cache curl gettext

COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
