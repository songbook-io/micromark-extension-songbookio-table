/**
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 */

/**
 * @typedef {import('./infer.js').Align} Align
 */

import {ok as assert} from 'devlop'

// To do: micromark@5: use `infer` here, when all events are exposed.

/**
 * Create an HTML extension for `micromark` to support GitHub tables when
 * serializing to HTML.
 *
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions` to
 *   support GitHub tables when serializing to HTML.
 */
export function songbookioGridHtml() {
  return {
    enter: {
      table(token) {
        this.lineEndingIfNeeded()
        this.tag('<table>')
      },
      tableBody() {
        this.lineEndingIfNeeded()
        this.tag('<tbody>')
      },
      tableData() {
        this.lineEndingIfNeeded()
        this.tag('<td>')
        // this.buffer()
      },
      tableHead() {
        this.lineEndingIfNeeded()
        this.tag('<thead>')
      },
      tableHeader() {
        this.lineEndingIfNeeded()
        this.tag('<th>')
      },
      tableRow() {
        this.lineEndingIfNeeded()
        this.tag('<tr>')
      }
    },
    exit: {
      // Overwrite the default code text data handler to unescape escaped pipes when
      // they are in tables.
      codeTextData(token) {
        let value = this.sliceSerialize(token)
        this.raw(this.encode(value))
      },
      table() {
        // Note: we don’t set `slurpAllLineEndings` anymore, in delimiter rows,
        // but we do need to reset it to match a funky newline GH generates for
        // list items combined with tables.
        this.setData('slurpAllLineEndings')
        this.lineEndingIfNeeded()
        this.tag('</table>')
      },
      tableBody() {
        this.lineEndingIfNeeded()
        this.tag('</tbody>')
      },
      tableData() {
        // this.resume()
        this.tag('</td>')
      },
      tableHead() {
        this.lineEndingIfNeeded()
        this.tag('</thead>')
      },
      tableHeader() {
        this.lineEndingIfNeeded()
        this.tag('</th>')
      },
      tableRow() {
        this.lineEndingIfNeeded()
        this.tag('</tr>')
      }
    }
  }
}

/**
 * @param {string} $0
 * @param {string} $1
 * @returns {string}
 */
function replace($0, $1) {
  // Pipes work, backslashes don’t (but can’t escape pipes).
  return $1 === '|' ? $1 : $0
}
