import { html, css, LitElement, PropertyValueMap } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { property, state } from 'lit/decorators.js'
import { InputData } from './definition-schema.js'

type Dataseries = Exclude<InputData['dataseries'], undefined>[number] & { needleValue?: number }
type Data = Exclude<Dataseries['data'], undefined>[number]
type Theme = {
    theme_name: string
    theme_object: any
}
export class WidgetValue extends LitElement {
    @property({ type: Object })
    inputData?: InputData

    @property({ type: Object })
    theme?: Theme

    @state()
    private dataSets: Map<string, Dataseries> = new Map()

    @state()
    private textActive: boolean = true

    @state() private themeBgColor?: string
    @state() private themeTitleColor?: string
    @state() private themeSubtitleColor?: string

    version: string = 'versionplaceholder'

    private resizeObserver: ResizeObserver

    valueContainer?: HTMLDivElement
    boxes?: HTMLDivElement[]
    origWidth: number = 0
    origHeight: number = 0
    constructor() {
        super()
        this.resizeObserver = new ResizeObserver(this.applyData.bind(this))
        this.resizeObserver.observe(this)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        this.valueContainer = this?.shadowRoot?.querySelector('.value-container') as HTMLDivElement

        this.registerTheme(this.theme)
        this.sizingSetup()
        this.transformData()
        this.applyData()
    }

    update(changedProperties: Map<string, any>) {
        if (changedProperties.has('inputData')) {
            this.sizingSetup()
            this.transformData()
            this.applyData()
        }

        if (changedProperties.has('theme')) {
            this.registerTheme(this.theme)
        }

        super.update(changedProperties)
    }

    registerTheme(theme?: Theme) {
        const cssTextColor = getComputedStyle(this).getPropertyValue('--re-text-color').trim()
        const cssBgColor = getComputedStyle(this).getPropertyValue('--re-tile-background-color').trim()
        this.themeBgColor = cssBgColor || this.theme?.theme_object?.backgroundColor
        this.themeTitleColor = cssTextColor || this.theme?.theme_object?.title?.textStyle?.color
        this.themeSubtitleColor =
            cssTextColor || this.theme?.theme_object?.title?.subtextStyle?.color || this.themeTitleColor
    }

    sizingSetup() {
        if (this.origWidth !== 0 && this.origHeight !== 0) return

        const boxes = Array.from(
            this?.shadowRoot?.querySelectorAll(
                '.sizing-container > .single-value'
            ) as NodeListOf<HTMLDivElement>
        )

        this.origWidth =
            boxes?.map((b) => b.getBoundingClientRect().width).reduce((p, c) => (c > p ? c : p), 0) ?? 0
        this.origHeight =
            boxes?.map((b) => b.getBoundingClientRect().height).reduce((p, c) => (c > p ? c : p), 0) ?? 0
    }

    applyData() {
        const userWidth = this.valueContainer?.getBoundingClientRect().width
        const userHeight = this.valueContainer?.getBoundingClientRect().height
        const count = this.dataSets.size

        const width = this.origWidth
        const height = this.origHeight
        if (!userWidth || !userHeight || !width || !height) return

        const fits = []
        for (let c = 1; c <= count; c++) {
            const r = Math.ceil(count / c)
            const uwgap = userWidth - 12 * (c - 1)
            const uhgap = userHeight - 12 * (r - 1)
            const m = uwgap / width / c
            const size = m * m * width * height * count
            if (r * m * height <= uhgap) fits.push({ c, m, size, width, height, userWidth, userHeight })
        }

        for (let r = 1; r <= count; r++) {
            const c = Math.ceil(count / r)
            const uwgap = userWidth - 12 * (c - 1)
            const uhgap = userHeight - 12 * (r - 1)
            const m = uhgap / height / r
            const size = m * m * width * height * count
            if (c * m * width <= uwgap) fits.push({ r, m, size, width, height, userWidth, userHeight })
        }
        const maxSize = fits.reduce((p, c) => (c.size < p ? p : c.size), 0)
        const fit = fits.find((f) => f.size === maxSize)
        const modifier = fit?.m ?? 1
        // console.log('FITS', fits, 'modifier', modifier, 'cols',fit?.c, 'rows', fit?.r, 'new size', fit?.size.toFixed(0), 'total space', (userWidth* userHeight).toFixed(0))

        const boxes = Array.from(
            this?.shadowRoot?.querySelectorAll(
                '.value-container > .single-value'
            ) as NodeListOf<HTMLDivElement>
        )

        boxes?.forEach((box) =>
            box.setAttribute(
                'style',
                `width:${modifier * width}px; height:${modifier * height}px; padding:${modifier * 6}px`
            )
        )

        boxes?.forEach((n) => {
            const label: string | null = n.getAttribute('label')
            const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
            const numberText = n.querySelector('.current-value') as HTMLDivElement
            numberText.setAttribute(
                'style',
                `font-size: ${32 * modifier}px; 
                color: ${ds?.styling?.valueColor || this.theme?.theme_object?.color?.[0] || this.themeTitleColor};`
            )
        })

        boxes?.forEach((n) => {
            const label: string | null = n.getAttribute('label')
            const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
            const labelText = n.querySelector('.label') as HTMLDivElement
            labelText.setAttribute(
                'style',
                `font-size: ${26 * modifier}px; 
                color: ${ds?.styling?.labelColor || this.theme?.theme_object?.color?.[1] || this.themeSubtitleColor};`
            )
            const unitText = n.querySelector('.unit') as HTMLDivElement
            unitText.setAttribute(
                'style',
                `font-size: ${26 * modifier}px; 
                color: ${ds?.styling?.valueColor || this.theme?.theme_object?.color?.[0] || this.themeTitleColor};`
            )
        })

        this.textActive = true
    }

    async transformData() {
        if (!this.inputData) return
        this.dataSets.forEach((d) => {
            d.label ??= ''
        })
        this.dataSets = new Map()
        this.inputData?.dataseries
            // ?.sort((a, b) => a.order - b.order)
            ?.forEach((ds) => {
                // pivot data
                const distincts = [...new Set(ds.data?.map((d: Data) => d.pivot))].sort() as string[]
                ds.needleValue = undefined
                distincts.forEach((piv) => {
                    const prefix = piv ?? ''
                    const label = ds.label ?? ''
                    const pds: Dataseries = {
                        label: prefix + (!!prefix && !!label ? ' - ' : '') + label,
                        order: ds.order,
                        unit: ds.unit,
                        precision: ds.precision,
                        advanced: ds.advanced,
                        styling: ds.styling,
                        data: distincts.length === 1 ? ds.data : ds.data?.filter((d) => d.pivot === piv),
                        needleValue: undefined
                    }
                    this.dataSets.set(pds.label ?? '', pds)
                })
            })

        // filter latest values and calculate average
        this.dataSets.forEach((ds, label) => {
            ds.advanced ??= {}
            if (typeof ds.advanced?.averageLatest !== 'number' || !isNaN(ds.advanced?.averageLatest))
                ds.advanced.averageLatest = 1

            const data = ds?.data?.slice(-ds?.advanced?.averageLatest || -1) ?? []
            const values = (data?.map((d) => d.value)?.filter((p) => p !== undefined) ?? []) as number[]
            const average = values.reduce((p, c) => p + c, 0) / values.length

            // Check age of data Latency
            const tsp = Date.parse(data?.[0]?.tsp ?? '')
            if (isNaN(tsp)) {
                const now = new Date().getTime()
                if (now - tsp > (ds.advanced?.maxLatency ?? Infinity) * 1000) ds.needleValue = undefined
            }

            ds.needleValue = average
        })

        this.requestUpdate()
        await this.updateComplete
        // console.log('Value Datasets', this.dataSets)
    }

    static styles = css`
        :host {
            display: block;
            font-family: sans-serif;
            box-sizing: border-box;
            position: relative;
            margin: auto;
        }

        .paging:not([active]) {
            display: none !important;
        }

        .wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            padding: 16px;
            box-sizing: border-box;
        }

        h3 {
            margin: 0;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        p {
            margin: 10px 0 0 0;
            max-width: 300px;
            font-size: 14px;
            line-height: 17px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .value-container {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            line-height: 0.9;
            flex: 1;
            overflow: hidden;
            position: relative;
            gap: 12px;
        }

        .single-value {
            overflow: hidden;
            position: relative;
            align-items: end;
            padding: 6px;
            box-sizing: border-box;
            /* border-left: 4px solid #ddd; */
        }

        .current-value {
            font-size: 32px;
            font-weight: 600;
            white-space: nowrap;
        }

        .label,
        .unit {
            font-weight: 300;
            font-size: 26px;
            white-space: nowrap;
        }

        .sizing-container {
            position: absolute;
            left: 10000px;
            display: flex;
            line-height: 0.9;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            flex: 1;
            overflow: hidden;
            gap: 12px;
        }

        .no-data {
            font-size: 20px;
            display: flex;
            height: 100%;
            width: 100%;
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    `

    render() {
        return html`
            <div
                class="wrapper"
                style="background-color: ${this.themeBgColor}; color: ${this.themeTitleColor}"
            >
                <header>
                    <h3 class="paging" ?active=${this.inputData?.title}>${this.inputData?.title}</h3>
                    <p
                        class="paging"
                        ?active=${this.inputData?.subTitle}
                        style="color: ${this.themeSubtitleColor}"
                    >
                        ${this.inputData?.subTitle}
                    </p>
                </header>
                <div class="sizing-container">
                    ${repeat(
                        this.dataSets,
                        ([label]) => label,
                        ([label, ds]) => {
                            return html`
                                <div class="single-value" label="${label}">
                                    <div class="label paging" ?active=${this.textActive}>${label}</div>
                                    <span
                                        class="current-value paging"
                                        ?active=${this.textActive}
                                        style="color: ${this.themeTitleColor}"
                                    >
                                        ${isNaN(ds.needleValue ?? 0) || ds.needleValue === undefined
                                            ? ''
                                            : ds.needleValue.toFixed(Math.max(0, ds.precision ?? 0))}
                                        <span class="unit paging" ?active=${this.textActive}>${ds.unit}</span>
                                    </span>
                                </div>
                            `
                        }
                    )}
                </div>
                <div class="paging no-data" ?active=${!this.dataSets.size}>No Data</div>
                <div class="value-container">
                    ${repeat(
                        [...this.dataSets.entries()].sort(),
                        ([label]) => label,
                        ([label, ds]) => {
                            return html`
                                <div class="single-value" label="${label}">
                                    <div class="label paging" ?active=${this.textActive}>${label}</div>
                                    <span
                                        class="current-value paging"
                                        ?active=${this.textActive}
                                        style="color: ${this.themeTitleColor}"
                                    >
                                        ${isNaN(ds.needleValue ?? 0) || ds.needleValue === undefined
                                            ? ''
                                            : ds.needleValue.toFixed(Math.max(0, ds.precision ?? 0))}
                                        <span class="unit paging" ?active=${this.textActive}>${ds.unit}</span>
                                    </span>
                                </div>
                            `
                        }
                    )}
                </div>
            </div>
        `
    }
}

window.customElements.define('widget-value-versionplaceholder', WidgetValue)
