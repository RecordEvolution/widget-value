# \<widget-gauge>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

## Installation

```bash
npm i widget-gauge
```

## Usage

```html
<script type="module">
  import 'widget-gauge/widget-gauge.js';
</script>

<widget-gauge></widget-gauge>
```

## Expected data format

The following format represents the available data :
```js
data: {
  settings: {
    title: string,
    subTitle: string,
    minGauge: number,
    maxGauge: number,
    style: {
      needleColor: string,
      sections: number,
      backgroundColor: string[]
    }
  }
  gaugeValue: Number
}
```

## Interfaces

```ts
  interface InputData {
    settings: Settings
    gaugeValue: number
  }
```
```ts
  interface Settings {
    title: string,
    subTitle: string,
    minGauge: number,
    maxGauge: number,
    style: Style
  }
```
```ts
  interface Style {
    needleColor: string,
    sections: number,
    backgroundColor: string[]
  }
```

## Style options
The following options are available for styling the gauge graph.
The `sections` option splits the gauge area into by default three same sized sections. Therefore three different colors can be provided to the `backgroundColor` by default.
```
  interface Style {
    needleColor: string,
    sections: number,
    backgroundColor: string[]
  }
```

## Linting and formatting

To scan the project for linting and formatting errors, run

```bash
npm run lint
```

To automatically fix linting and formatting errors, run

```bash
npm run format
```


## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`
