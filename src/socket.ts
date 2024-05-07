const { protocol } = window.location;

const host = 'channel.frontende.ru'
const channel = ''; // TODO: from url

const handlers = new Map(), path = `ws${protocol === 'https:' ? 's' : ''}://${host}/ws?channel=${channel}`;

handlers.set((item) => {
  console.group('UPDATE')
  console.log(item);
  console.groupEnd();
}, [])

let requests: any[] = [], timeout: NodeJS.Timeout;

export let ws: WebSocket;

export enum socketType {
  open = 'open',
  connect = 'connect',
  close = 'close',
}

const connect = () => {
  ws = new WebSocket(path);

  ws.onopen = () => {
    if (timeout) clearTimeout(timeout);

    for (const req of requests) onSend(req);

    requests = [];
  };

  ws.onclose = () => {
    timeout = setTimeout(connect, 5000);
  };

  ws.onmessage = async evt => {
    const item = JSON.parse(evt.data);

    for (const handler of handlers.keys()) {
      handler(item);
    }
  };
}

export const send = (next = null) => {
  if (!ws) connect();

  if (!next) return;

  if (!ws || ws.readyState !== ws.OPEN) return requests.push(next);

  console.group('SEND');
  console.log(next);
  console.groupEnd();

  setTimeout(() => ws.send(JSON.stringify(next)), 500)
}

export const onUpdate = (handle) => {

  if (typeof handle !== 'function') return;

  handlers.set(handle, []);

  return () => {
    handlers.delete(handle);
  };
}