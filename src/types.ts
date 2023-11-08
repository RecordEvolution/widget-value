
export interface Settings {
    title: string
    subTitle: string
    columnLayout: boolean
  }

export interface Data {
    value: number
    pivot: string
}
export interface Dataseries {
    label: string
    order: number
    unit: string
    color: string
    averageLatest: number
    fontSize: string
    backgroundColor: string
    data: Data[]
    // not input values
    needleValue: number 
    range: number
    ranges: number[]
}

export interface InputData {
    settings: Settings
    dataseries: Dataseries[]
}