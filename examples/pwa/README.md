# swrv example - pwa

Install dependencies

```sh
yarn install
```

Service worker:

```sh
yarn build
cd dist # service static content from here
http-server -p 8007
```

Run app:

```sh
yarn serve
```

Visit [http://localhost:8007/](http://localhost:8007/) and click around to some
different items. If you then go offline then app will render items from
localStorage.
