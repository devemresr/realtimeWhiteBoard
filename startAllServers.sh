# for dev purposes

PORTS="3000 3002 3003 3004"

for PORT in $PORTS; do
  osascript -e "tell application \"Terminal\" to do script \"cd $(pwd); npx nodemon --exec tsx server/index.ts -- $PORT\""
done
