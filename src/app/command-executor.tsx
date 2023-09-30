import fetch from 'node-fetch';

const AsyncLock = require('async-lock');

interface HttpService {
    request(url: string): Promise<string>;
}

interface CommandExecutor {
    requestAsync(url: string, onResponse: (response: string) => void): Promise<void>;
}

class HttpServiceImpl implements HttpService {
    // @ts-ignore
    async request(url: string): Promise<string> {
        // здесь микросимуляция задержки в сети
        // @ts-ignore
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`fetch ${url}`);
        const result = fetch(url).then((response: { text: () => any; }) => response.text());
        console.log(`result: ${result}`);
        return result
    }
}

class CommandExecutorImpl implements CommandExecutor {
    private subscribers = new Map<string, Promise<string>>();
    private readonly lock = new AsyncLock();


    constructor(private http: HttpService) {
    }

    // @ts-ignore
    requestAsync(url: string, onResponse: (response: string) => void) {
        (async () => {
            const responsePromise = this.lock.acquire(url, async () => {
                    if (!this.subscribers.has(url)) {
                        console.log("add new request");
                        const response = this.http.request(url)
                        this.subscribers.set(url, response);
                        return response
                    } else {
                        console.log("get old request");
                        return this.subscribers.get(url);
                    }
                }
            );
            try {
                const response = await responsePromise;
                onResponse(response);
            } finally {
                // @ts-ignore
                await this.lock.acquire(url, async () => {
                    this.subscribers.delete(url);
                });
            }
        })();
    }
}

// @ts-ignore
export default async function commandExecutor() {
    const httpService = new HttpServiceImpl();
    const executor = new CommandExecutorImpl(httpService);

    /* Делаем два одинаковых запроса, выполняется только один, ответ приходит в оба места */
    executor.requestAsync('https://catfact.ninja/fact', (response) => {
            const text = `Receiver 1: ${response}`;
            console.log(`received ${text}`);
        }
    );

    executor.requestAsync('https://catfact.ninja/fact', (response) => {
            const text = `Receiver 2: ${response}`;
            console.log(`received ${text}`);
        }
    );

    /* Делаем два одинаковых запроса, выполняется только один, ответ приходит в оба места */
    executor.requestAsync('https://random-data-api.com/api/v2/beers', (response) => {
        const text = `Receiver 1: ${response}`;
        console.log(`received ${text}`);
    });

    executor.requestAsync('https://random-data-api.com/api/v2/beers', (response) => {
        const text = `Receiver 2: ${response}`;
        console.log(`received ${text}`);
    });
};


