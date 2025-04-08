export CRAWLERS=`tr '\n' '|' < /home/nginx/crawlers.txt` &&
echo "$CRAWLERS" &&
envsubst '$$APP_URL $$ACCESS_TOKEN $$CRAWLERS $$EMBED_PLAYER_URL' < /home/nginx/nginx.template > /etc/nginx/nginx.conf &&
exec nginx -g 'daemon off;'
