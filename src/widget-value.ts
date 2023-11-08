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
  private numberLabels?: NodeListOf<Element>
  @state()
  private titleLabels?: NodeListOf<Element>

  resizeObserver: ResizeObserver

  constructor() {
    super()
    this.resizeObserver = new ResizeObserver((ev: ResizeObserverEntry[]) => {

      const width: number = ev[0].contentRect.width
      const height: number = ev[0].contentRect.height
      const modifier = width * 0.08
      console.log('resize', this.numberLabels, this.titleLabels, modifier)
      this.numberLabels?.forEach(n => {
        console.log('value', n.getAttribute('label'))

        n.setAttribute("style", `font-size: ${width*0.06}px;`)
      })

      this.titleLabels?.forEach(n => {
          n.setAttribute("style", `font-size: ${width*0.06}px;`)
        })
      
    })
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {



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

    this.numberLabels = this?.shadowRoot?.querySelectorAll('.current-value')
    this.titleLabels = this?.shadowRoot?.querySelectorAll('.label')

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
            color: ds.color,
            fontSize: ds.fontSize,
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
    .value-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .columnLayout {
      flex-direction: column;
    }

    .single-value {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      position: relative;
      align-items: stretch;
    }

    header {
      display: flex;
      flex-direction: column;
      margin: 0 0 16px 0;
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
    }
    .current-value {
      text-align: center;
      font-weight: 600;
    }

    .label {
      text-align: center;
      width: 100%;
    }

  `;

  render() {
    return html`
      <div class="wrapper">
        <header>
          <h3>${this.inputData?.settings.title}</h3>
          <p>${this.inputData?.settings.subTitle}</p>
        </header>
        <div class="value-container ${this?.inputData?.settings.columnLayout ? 'columnLayout': ''}">
          ${repeat(// @ts-ignore 
          this.dataSets, (ds: Dataseries, label) => label, (ds: Dataseries, label) => html`
              <div class="single-value">
                <div class="label">${label}</div>
                <div class="current-value" label="${label}">${ds.needleValue.toFixed(0)} ${ds.unit}</div>
              </div>
          `)}
        </div>
      </div>
    `;
  }
}

window.customElements.define('widget-value', WidgetValue);
