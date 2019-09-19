export CRAWLERS=`tr '\n' '|' < /home/nginx/crawlers.txt` &&
echo "$CRAWLERS" &&
envsubst '$$APP_URL $$ACCESS_TOKEN $$CRAWLERS' < /home/nginx/nginx.template > /etc/nginx/conf.d/default.conf &&
exec nginx -g 'daemon off;'