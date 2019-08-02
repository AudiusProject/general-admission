export CRAWLERS=`tr '\n' '|' < /home/crawlers.txt` &&
echo "$CRAWLERS" &&
envsubst '$$APP_URL $$CRAWLERS' < /etc/nginx/conf.d/nginx.template > /etc/nginx/conf.d/default.conf &&
cat /etc/nginx/conf.d/default.conf &&
exec nginx -g 'daemon off;'