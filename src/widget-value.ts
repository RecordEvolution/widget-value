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
  private textActive: boolean = false


  @state()
  private numberText?: NodeListOf<Element>
  @state()
  private labelText?: NodeListOf<Element>

  resizeObserver: ResizeObserver

  constructor() {
    super()
    this.resizeObserver = new ResizeObserver((ev: ResizeObserverEntry[]) => {

      const width: number = ev[0].contentRect.width
      const height: number = ev[0].contentRect.height
      const modifier = width * 0.006
      this.numberText?.forEach(n => {
        const label: string | null = n.getAttribute('label')
        const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
        n.setAttribute("style", `font-size: ${(ds?.valueFontSize ?? 26) * modifier}px; color: ${ds?.valueColor}`)
      })

      this.labelText?.forEach(n => {
        const label: string | null = n.getAttribute('label')
        const ds: Dataseries | undefined = this.dataSets.get(label ?? '')
        n.setAttribute("style", `font-size: ${(ds?.labelFontSize ?? 26) * modifier}px; color: ${ds?.labelColor}`)
      })

      this.textActive = true
      
    })
  }

  updated(changedProperties: Map<string, any>) {
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'inputData') {
        this.applyInputData()
      }
    })
  }

  async applyInputData() {

    if(!this?.inputData) return

    const sv: Element | undefined | null = this.shadowRoot?.querySelector('.single-value')
    if (sv) this.resizeObserver.observe(sv)

    this.numberText = this?.shadowRoot?.querySelectorAll('.current-value')
    this.labelText = this?.shadowRoot?.querySelectorAll('.label')

    this.dataSets = new Map()
    this.inputData.dataseries.forEach(ds => {

      // pivot data
      const distincts = [...new Set(ds.data.map((d: Data) => d.pivot))]
      if (distincts.length > 1) {
        distincts.forEach((piv) => {
          const pds: any = {
            label: `${ds.label} ${piv}`,
            order: ds.order,
            unit: ds.unit,
            averageLatest: ds.averageLatest,
            labelColor: ds.labelColor,
            valueColor: ds.valueColor,
            labelFontSize: ds.labelFontSize,
            valueFontSize: ds.valueFontSize,
            backgroundColor: ds.backgroundColor,
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
      ds.data = ds.data.splice(-ds.averageLatest ?? -1)
      ds.needleValue = ds.data.map(d => d.value).reduce(( p, c ) => p + c, 0) / ds.data.length
    })

    this.requestUpdate(); await this.updateComplete

    // console.log('Value Datasets', this.dataSets)

  }

  static styles = css`
    :host {
      display: block;
      color: var(--widget-value-text-color, #000);
      font-family: sans-serif;
      padding: 16px;
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
    }
    .columnLayout {
      flex-direction: column;
    }

    h3 {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    p {
      margin: 10px 0 16px 0;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .value-container {
      display: flex;
      overflow: hidden;
      position: relative;
      gap: 12px;
    }

    .single-value {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
      align-items: end;
      font-size: 26px;
      padding: 8px;
      border-left: 4px solid #ddd;
    }

    .current-value {
      font-size: 32px;
      font-weight: 600;
      white-space: nowrap;
    }

    .label {
      font-weight: 300;
      font-size: 16px;
      width: 100%;
      white-space: wrap;
    }
  `;

  render() {
    return html`
      <div class="wrapper">
        <header>
          <h3 class="paging" ?active=${this.inputData?.settings.title}>${this.inputData?.settings.title}</h3>
          <p class="paging" ?active=${this.inputData?.settings.subTitle}>${this.inputData?.settings.subTitle}</p>
        </header>
        <div class="value-container ${this?.inputData?.settings.columnLayout ? 'columnLayout': ''} paging" ?active=${this.textActive}>
          ${repeat(// @ts-ignore 
          this.dataSets, ([label]) => label, ([label, ds]) => {
            // console.log('rendering', ds, label)
            return html`
              <div class="single-value">
                <div>
                  <div 
                    class="label" 
                    label="${label}"
                    style="color: ${ds.labelColor}"
                  >
                    ${label}
                  </div>
                  <span class="current-value" label="${label}">
                    ${isNaN(ds.needleValue) ? '' : ds.needleValue.toFixed(0)}
                  </span>
                  <span class="label" label="${label}">
                    ${ds.unit}
                  </span>
                </div>
              </div>
          `})}
        </div>
      </div>
    `;
  }
}

window.customElements.define('widget-value', WidgetValue);
