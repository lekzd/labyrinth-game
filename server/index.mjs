import { WebSocketServer } from 'ws';
import { parse } from 'url';

const wss = new WebSocketServer({ port: 8080 });

const channels = {};

/*
* ws://doma.in/?channel=[channelID]
*
* Первый вошедший в канал инициирует его, последующие получают обновления
* Если в
*
* */

wss.on('connection', (ws, { url }) => {
    const { channel } = parse(url, true).query;

    console.log('open', channel);

    if (!(channel in channels)) {
        channels[channel] = { clients: new Set(), stack: [] }
        ws.send(JSON.stringify({ init: true }))
    }

    const { clients, stack } = channels[channel];

    for (const item of stack)
        ws.send(item)

    clients.add(ws)

    ws.on('message', (message) => {
        clients.forEach(client => client.send(message));
        try {
            const { save } = JSON.parse(message.toString());
            if (save) stack.push()
        } catch (e) {}
    });

    ws.on('close', () => {
        clients.delete(ws);
        if (clients.size === 0) delete channels[channel];
    });
});

