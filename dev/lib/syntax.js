/**
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Point} Point
 * @typedef {import('micromark-util-types').Resolver} Resolver
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Token} Token
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 */

/**
 * @typedef {[number, number, number, number]} Range
 *   Measure info.
 *
 * @typedef {0 | 1 | 2 | 3} RowKind
 *   Where we are: `1` for head row, `2` for delimiter row, `3` for body row.
 */

import {ok as assert} from 'devlop'
import {factorySpace} from 'micromark-factory-space'
import {
  markdownLineEnding,
  markdownLineEndingOrSpace,
  markdownSpace
} from 'micromark-util-character'
import {codes, constants, types} from 'micromark-util-symbol'
import {EditMap} from './edit-map.js'

/**
 * Create an HTML extension for `micromark` to support songbook.io grids syntax.
 *
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable
 *   songbook.io grid syntax.
 */
export function songbookioGrid() {
  return {
    flow: {null: {tokenize: tokenizeGrid, resolveAll: resolveGrid}}
  }
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeGrid(effects, ok, nok) {
  const self = this
  let size = 0
  let sizeB = 0
  /** @type {boolean | undefined} */
  let seen

  return start

  /**
   * Start of a songbook.io grid.
   *
   * If there is a valid grid row before, then we try to parse another row.
   *
   * ```markdown
   * > || a ||
   *     ^
   * > || b ||
   *     ^
   * ```
   * @type {State}
   */
  function start(code) {
    let index = self.events.length - 1

    while (index > -1) {
      const type = self.events[index][1].type

      if (
        type === types.lineEnding ||
        // Note: markdown-rs uses `whitespace` instead of `linePrefix`
        type === types.linePrefix
      )
        index--
      else break
    }

    const tail = index > -1 ? self.events[index][1].type : null

    // Don’t allow lazy body rows.
    if (self.parser.lazy[self.now().line]) {
      return nok(code)
    }

    return bodyRowStart(code)
  }

  /**
   * Before grid body row.
   *
   * ```markdown
   * > || a ||
   *    ^
   * ```
   *
   * @type {State}
   */
  function bodyRowStart(code) {
    // Note: in `markdown-rs` we need to manually take care of a prefix,
    // but in `micromark-js` that is done for us, so if we’re here, we’re
    // never at whitespace.
    effects.enter('gridRow')
    return bodyRowBreak(code)
  }

  /**
   * At break in table body row.
   *
   * ```markdown
   *   | | a |
   *   | | - |
   * > | | b |
   *     ^
   *       ^
   *         ^
   * ```
   *
   * @type {State}
   */
  function bodyRowBreak(code) {
    if (code === codes.verticalBar) {
      effects.enter('gridBarLine')
      effects.consume(code)
      effects.exit('gridBarLine')
      return bodyRowBreak
    }

    if (code === codes.eof || markdownLineEnding(code)) {
      effects.exit('gridRow')
      return ok(code)
    }

    if (markdownSpace(code)) {
      return factorySpace(effects, bodyRowBreak, types.whitespace)(code)
    }

    // Anything else is cell content.
    effects.enter(types.data)
    return bodyRowData(code)
  }

  /**
   * In table body row data.
   *
   * ```markdown
   *   | | a |
   *   | | - |
   * > | | b |
   *       ^
   * ```
   *
   * @type {State}
   */
  function bodyRowData(code) {
    if (
      code === codes.eof ||
      code === codes.verticalBar ||
      markdownLineEndingOrSpace(code)
    ) {
      effects.exit(types.data)
      return bodyRowBreak(code)
    }

    effects.consume(code)
    return code === codes.backslash ? bodyRowEscape : bodyRowData
  }

  /**
   * In table body row escape.
   *
   * ```markdown
   *   | | a    |
   *   | | ---- |
   * > | | b\-c |
   *         ^
   * ```
   *
   * @type {State}
   */
  function bodyRowEscape(code) {
    if (code === codes.backslash || code === codes.verticalBar) {
      effects.consume(code)
      return bodyRowData
    }

    return bodyRowData(code)
  }
}

/** @type {Resolver} */

function resolveGrid(events, context) {
  let index = -1
  let inFirstMeasureAwaitingPipes = 2
  /** @type {RowKind} */
  let rowKind = 0
  /** @type {Range} */
  let lastMeasure = [0, 0, 0, 0]
  /** @type {Range} */
  let cell = [0, 0, 0, 0]
  let lastTableBodyEnd = 0
  let lastTableEnd = 0
  /** @type {Token | undefined} */
  let currentTable
  /** @type {Token | undefined} */
  let currentBody
  /** @type {Token | undefined} */
  let currentMeasure

  const map = new EditMap()

  while (++index < events.length) {
    const event = events[index]
    const token = event[1]

    if (event[0] === 'enter') {
      // Start of head.
      if (token.type === 'gridRow') {

        // Open table
        if(!currentTable) {
          // Inject table start.
          currentTable = {
            type: 'grid',
            start: Object.assign({}, token.start),
            // Note: correct end is set later.
            end: Object.assign({}, token.end)
          }
          map.add(index, 0, [['enter', currentTable, context]])
        }

        currentBody = {
          type: 'gridSection',
          start: Object.assign({}, token.start),
          // Note: correct end is set later.
          end: Object.assign({}, token.end)
        }
        map.add(index, 0, [['enter', currentBody, context]])

        inFirstMeasureAwaitingPipes = 2
        currentMeasure = undefined
        lastMeasure = [0, 0, 0, 0]
        cell = [0, index + 1, 0, 0]

        // }

        rowKind = currentBody ? 3 : 1
      }
      // Measure data.
      else if ( rowKind && token.type === types.data ) {
        inFirstMeasureAwaitingPipes -= 1

        // First value in cell.
        if (cell[2] === 0) {
          if (lastMeasure[1] !== 0) {
            cell[0] = cell[1]
            currentMeasure = flushMeasure(
              map,
              context,
              lastMeasure,
              rowKind,
              undefined,
              currentMeasure
            )
            lastMeasure = [0, 0, 0, 0]
          }

          cell[2] = index
        }
      }
    }
    // Exit events.
    else if (token.type === 'gridRow') {
      lastTableBodyEnd = index
      lastTableEnd = index

      if (lastMeasure[1] !== 0) {
        cell[0] = cell[1]
        currentMeasure = flushMeasure(
          map,
          context,
          lastMeasure,
          rowKind,
          index,
          currentMeasure
        )
      } else if (cell[1] !== 0) {
        currentMeasure = flushMeasure(map, context, cell, rowKind, index, currentMeasure)
      }

      rowKind = 0

      flushTableBodyEnd(map, context, lastTableEnd, currentBody)

    } else if (
      rowKind &&
      (token.type === types.data)
    ) {
      cell[3] = index
    }
  }

  if (currentTable) flushTableEnd(map, context, lastTableEnd, currentTable)

  map.consume(context.events)

  return events
}

/**
 * Generate a cell.
 *
 * @param {EditMap} map
 * @param {Readonly<TokenizeContext>} context
 * @param {Readonly<Range>} range
 * @param {RowKind} rowKind
 * @param {number | undefined} rowEnd
 * @param {Token | undefined} previousMeasure
 * @returns {Token | undefined}
 */
// eslint-disable-next-line max-params
function flushMeasure(map, context, range, rowKind, rowEnd, previousMeasure) {
  // `markdown-rs` uses:
  // rowKind === 2 ? 'tableDelimiterMeasure' : 'tableMeasure'
  const groupName = 'gridMeasure'
  // `markdown-rs` uses:
  // rowKind === 2 ? 'tableDelimiterMeasureValue' : 'tableMeasureText'
  const valueName = 'gridContent'

  // Insert an exit for the previous cell, if there is one.
  //
  // ```markdown
  // > | | aa | bb | cc |
  //          ^-- exit
  //           ^^^^-- this cell
  // ```
  if (range[0] !== 0) {
    assert(previousMeasure, 'expected previous measure enter')
    previousMeasure.end = Object.assign({}, getPoint(context.events, range[0]))
    map.add(range[0], 0, [['exit', previousMeasure, context]])
  }

  // Insert enter of this cell.
  //
  // ```markdown
  // > | | aa | bb | cc |
  //           ^-- enter
  //           ^^^^-- this cell
  // ```
  const now = getPoint(context.events, range[1])
  previousMeasure = {
    type: groupName,
    start: Object.assign({}, now),
    // Note: correct end is set later.
    end: Object.assign({}, now)
  }
  map.add(range[1], 0, [['enter', previousMeasure, context]])

  // Insert text start at first data start and end at last data end, and
  // remove events between.
  //
  // ```markdown
  // > | | aa | bb | cc |
  //            ^-- enter
  //             ^-- exit
  //           ^^^^-- this cell
  // ```
  if (range[2] !== 0) {
    const relatedStart = getPoint(context.events, range[2])
    const relatedEnd = getPoint(context.events, range[3])
    /** @type {Token} */
    const valueToken = {
      type: valueName,
      start: Object.assign({}, relatedStart),
      end: Object.assign({}, relatedEnd)
    }
    map.add(range[2], 0, [['enter', valueToken, context]])
    assert(range[3] !== 0)

    if (rowKind !== 2) {
      // Fix positional info on remaining events
      const start = context.events[range[2]]
      const end = context.events[range[3]]
      start[1].end = Object.assign({}, end[1].end)
      start[1].type = types.chunkText
      start[1].contentType = constants.contentTypeText

      // Remove if needed.
      if (range[3] > range[2] + 1) {
        const a = range[2] + 1
        const b = range[3] - range[2] - 1
        map.add(a, b, [])
      }
    }

    map.add(range[3] + 1, 0, [['exit', valueToken, context]])
  }

  // Insert an exit for the last cell, if at the row end.
  //
  // ```markdown
  // > | | aa | bb | cc |
  //                    ^-- exit
  //               ^^^^^^-- this cell (the last one contains two “between” parts)
  // ```
  if (rowEnd !== undefined) {
    previousMeasure.end = Object.assign({}, getPoint(context.events, rowEnd))
    map.add(rowEnd, 0, [['exit', previousMeasure, context]])
    previousMeasure = undefined
  }

  return previousMeasure
}


/**
 * Generate body end.
 *
 * @param {Readonly<EditMap>} map
 * @param {Readonly<TokenizeContext>} context
 * @param {number} index
 * @param {Token | undefined} tableBody
 */
// eslint-disable-next-line max-params
function flushTableBodyEnd(map, context, index, tableBody) {
  /** @type {Array<Event>} */
  const exits = []
  const related = getPoint(context.events, index)

  if (tableBody) {
    tableBody.end = Object.assign({}, related)
    exits.push(['exit', tableBody, context])
  }

  map.add(index + 1, 0, exits)
}


/**
 * Generate table end (and table body end).
 *
 * @param {Readonly<EditMap>} map
 * @param {Readonly<TokenizeContext>} context
 * @param {number} index
 * @param {Token | undefined} table
 */
// eslint-disable-next-line max-params
function flushTableEnd(map, context, index, table) {
  /** @type {Array<Event>} */
  const exits = []
  const related = getPoint(context.events, index)

  if (table) {
    table.end = Object.assign({}, related)
    exits.push(['exit', table, context])
  }

  map.add(index + 1, 0, exits)
}

/**
 * @param {Readonly<Array<Event>>} events
 * @param {number} index
 * @returns {Readonly<Point>}
 */
function getPoint(events, index) {
  const event = events[index]
  const side = event[0] === 'enter' ? 'start' : 'end'
  return event[1][side]
}
