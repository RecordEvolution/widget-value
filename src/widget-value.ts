import { html, css, LitElement, PropertyValueMap } from 'lit';
import { repeat } from 'lit/directives/repeat.js'
import { property, state } from 'lit/decorators.js';
import { InputData, Data, Dataseries } from './types.js'

export class WidgetValue extends LitElement {
  
  @property({type: Object}) 
  inputData?: InputData = undefined

  @state()
  private dataSets: Map<string, Dataseries> = new Map()

  @state()
  private textActive: boolean = true

  @state()
  private numberText?: HTMLDivElement[]

  @state()
  private labelText?: HTMLDivElement[]

  version: string = 'versionplaceholder'

  resizeObserver: ResizeObserver

  valueContainer?: HTMLDivElement
  boxes?: HTMLDivElement[]
  origWidth: number = 0
  origHeight: number = 0
  constructor() {
    super()

    this.resizeObserver = new ResizeObserver((ev) => this.adjustSizes())
    this.resizeObserver.observe(this)
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    this.applyInputData()
  }

  update(changedProperties: Map<string, any>) {
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'inputData') {
        this.applyInputData()
      }
    })

    this.sizingSetup()

    super.update(changedProperties)
  }

  sizingSetup() {
    if (this.origWidth !== 0 && this.origHeight !== 0) return

      this.boxes = Array.from(this?.shadowRoot?.querySelectorAll('.single-value') as NodeListOf<HTMLDivElement>)
      this.numberText = Array.from(this?.shadowRoot?.querySelectorAll('.current-value') as NodeListOf<HTMLDivElement>)
      this.labelText = Array.from(this?.shadowRoot?.querySelectorAll('.label') as NodeListOf<HTMLDivElement>)
      this.valueContainer = this?.shadowRoot?.querySelector('.value-container') as HTMLDivElement

      this.origWidth = this.boxes?.map(b => b.getBoundingClientRect().width).reduce((p, c) => c > p ? c : p, 0 ) ?? 0
      this.origHeight = this.boxes?.map(b => b.getBoundingClientRect().height).reduce((p, c) => c > p ? c : p, 0 ) ?? 0
      if (this.origWidth > 0) this.origWidth += 16
      if (this.origHeight > 0) this.origHeight += 16
  
      this.adjustSizes()

  }

  adjustSizes() {    
    const userWidth = this.valueContainer?.getBoundingClientRect().width
    const userHeight = this.valueContainer?.getBoundingClientRect().height
    const count = this.dataSets.size
    
    const width = this.origWidth
    const height = this.origHeight
    if (!userWidth || !userHeight || !width || !height) return

    const fits = []
    for (let c = 1; c <= count; c++) {
      const r = Math.ceil(count/c)
      const uwgap = (userWidth - 12 * (c-1))
      const uhgap = (userHeight - 12 * (r-1))
      const m = uwgap / width / c
      const size = m * m * width * height * count
      if (r * m * height < uhgap) fits.push({c, m, size, width, height, userWidth, userHeight})
    }

    for (let r = 1; r <= count; r++) {
      const c = Math.ceil(count/r)
      const uwgap = (userWidth - 12 * (c-1))
      const uhgap = (userHeight - 12 * (r-1))
      const m = uhgap / height / r
      const size = m * m * width * height * count
      if (c * m * width < uwgap) fits.push({r, m, size, width, height, userWidth, userHeight})
    }

    const maxSize = fits.reduce((p, c) => c.size < p ? p : c.size, 0)
    const fit = fits.find(f => f.size === maxSize)
    const modifier = (fit?.m ?? 1)
    // console.log('FITS', fits, 'modifier', modifier, 'cols',fit?.c, 'rows', fit?.r, 'new size', fit?.size.toFixed(0), 'total space', (userWidth* userHeight).toFixed(0))

    this.boxes?.forEach(box => box.setAttribute("style", `width:${modifier*width}px; height:${modifier*height}px; padding:${modifier*6}px`))
    this.numberText?.forEach(n => {
      const label: string | null = n.getAttribute('label')
      const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
      n.setAttribute("style", `font-size: ${(ds?.valueFontSize ?? 32) * modifier}px; ${ds?.valueColor ? "color: " + ds?.valueColor: ''}`)
    })

    this.labelText?.forEach(n => {
      const label: string | null = n.getAttribute('label')
      const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
      n.setAttribute("style", `font-size: ${(ds?.labelFontSize ?? 26) * modifier}px; ${ds?.labelColor ? "color: " + ds?.labelColor: ''}`)
    })

    this.textActive = true
    
  }

  async applyInputData() {

    if(!this.inputData) return

    this.dataSets = new Map()
    this.inputData.dataseries.sort((a, b) => a.order - b.order).forEach(ds => {

      // pivot data
      const distincts = [...new Set(ds.data.map((d: Data) => d.pivot))]
      if (distincts.length > 1 || distincts[0] !== undefined) {
        distincts.forEach((piv) => {
          const pds: any = {
            label: `${ds.label} ${piv}`,
            order: ds.order,
            unit: ds.unit,
            averageLatest: ds.averageLatest,
            labelColor: ds.labelColor,
            valueColor: ds.valueColor,
            data: ds.data.filter(d => d.pivot === piv)
          }
          this.dataSets.set(pds.label, pds)
        })
      } else {
        this.dataSets.set(ds.label, ds)
      }
    })

    // filter latest values and calculate average
    this.dataSets.forEach((ds, label) => {
      if (typeof ds.averageLatest !== 'number' || !isNaN(ds.averageLatest)) ds.averageLatest = 1
      ds.data = ds.data.splice(-ds.averageLatest ?? -1)
      ds.needleValue = ds.data.map(d => d.value).reduce(( p, c ) => p + c, 0) / ds.data.length
    })

    this.requestUpdate(); await this.updateComplete

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

    .paging:not([active]) { display: none !important; }

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
      color: var(--re-text-color, #000) !important;
    }
    p {
      margin: 10px 0 0 0;
      max-width: 300px;
      font-size: 14px;
      line-height: 17px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--re-text-color, #000) !important;
    }

    .value-container {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      flex: 1;
      overflow: hidden;
      position: relative;
      gap: 12px;
    }

    .single-value {
      overflow: hidden;
      position: relative;
      align-items: end;
      font-size: 26px;
      padding: 6px;
      box-sizing: border-box;
      /* border-left: 4px solid #ddd; */
    }

    .current-value {
      font-size: 32px;
      font-weight: 600;
      white-space: nowrap;
      color: var(--re-text-color, #000);
    }

    .label {
      font-weight: 300;
      font-size: 26px;
      color: var(--re-text-color, #000);
      white-space: nowrap;
    }
  `;

  render() {
    return html`
      <div class="wrapper">
        <header>
          <h3 class="paging" ?active=${this.inputData?.settings?.title}>${this.inputData?.settings?.title}</h3>
          <p class="paging" ?active=${this.inputData?.settings?.subTitle}>${this.inputData?.settings?.subTitle}</p>
        </header>
        <div class="value-container">
          ${repeat(// @ts-ignore 
          this.dataSets, ([label]) => label, ([label, ds]) => {
            return html`
              <div class="single-value">
                  <div 
                    class="label paging"
                    ?active=${this.textActive} 
                    label="${label}"
                  >
                    ${label}
                  </div>
                  <span 
                    class="current-value paging" 
                    ?active=${this.textActive} 
                    label="${label}">
                    ${isNaN(ds.needleValue) ? '' : ds.needleValue.toFixed(0)}
                  </span>
                  <span class="label paging" label="${label}" ?active=${this.textActive} >
                    ${ds.unit}
                  </span>
              </div>
          `})}
        </div>
      </div>
    `;
  }
}

window.customElements.define('widget-value-versionplaceholder', WidgetValue);
