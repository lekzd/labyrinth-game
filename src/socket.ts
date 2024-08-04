import { updateSeed } from "./utils/random";

const { protocol, search } = window.location;

const host = 'channel.frontende.ru'
const urlParams = new URLSearchParams(search);
const channel = urlParams.get('channel') || '';

updateSeed(channel)

export enum socketType {
  open = 'open',
  connect = 'connect',
  close = 'close',
}

export const socket = (logs) => {
  const handlers = new Map(), path = `ws${protocol === 'https:' ? 's' : ''}://${host}/ws?channel=${channel}`;

  handlers.set((item) => {
    if (logs?.update) {
      console.group(`${logs.name} UPDATE`)
      console.log(item);
      console.groupEnd();
    }
  }, [])

  let requests: any[] = [], timeout: NodeJS.Timeout;

  let ws: WebSocket;

  const connect = () => {
    if (ws && ws.readyState !== ws.CLOSED) return;

    ws = new WebSocket(path);

    ws.onopen = () => {
      if (timeout) clearTimeout(timeout);

      for (const req of requests) send(req);

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

  const send = (next = null) => {
    if (!ws) connect();

    if (!next) return;

    if (!ws || ws.readyState !== ws.OPEN) return requests.push(next);

    if (logs?.send) {
      console.group(`${logs.name} SEND`);
      console.log(next);
      console.groupEnd();
    }

    ws.send(JSON.stringify(next));
  }

  const onUpdate = (handle) => {

    if (typeof handle !== 'function') return;

    handlers.set(handle, []);

    return () => {
      handlers.delete(handle);
    };
  }

  return { send, connect, onUpdate }
}