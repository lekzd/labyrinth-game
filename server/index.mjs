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
        channels[channel] = { clients: new Set(), state: {} }
        ws.send(JSON.stringify({ init: true }))
    }

    const { clients, state } = channels[channel];

    ws.send(JSON.stringify(state))

    clients.add(ws)

    ws.on('message', (message) => {
        message = message.toString()

        clients.forEach(client => {
            if (client !== ws)
                client.send(message)
        });
        try {
            const newState = JSON.parse(message);
            mergeDeep(state, newState);
        } catch (e) {}
    });

    ws.on('close', () => {
        clients.delete(ws);
        if (clients.size === 0) delete channels[channel];
    });
});

// TODO: вынести в генерацию из utils.ts

export const isObject = (item) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export const mergeDeep = (target, ...sources) => {

    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
                target[key].push(...source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    } else if (Array.isArray(target) && Array.isArray(source)) {
        target.push(...source);
    }

    return mergeDeep(target, ...sources);
}