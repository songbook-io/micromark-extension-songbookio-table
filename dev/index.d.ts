export {songbookioGridHtml} from './lib/html.js'
export {songbookioGrid} from './lib/syntax.js'

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    grid: 'grid'
    gridSection: 'gridSection'
    gridRow: 'gridRow'
    gridMeasure: 'gridMeasure'

    gridBarLine: 'gridBarLine'

    gridContent: 'gridContent'
    // GridDelimiter: 'gridDelimiter'
    // gridDelimiterFiller: 'gridDelimiterFiller'
    // gridDelimiterMarker: 'gridDelimiterMarker'
    // gridDelimiterRow: 'gridDelimiterRow'

    gridTextSection: 'gridTextSection'
    gridText: 'gridHeader'
  }
}
