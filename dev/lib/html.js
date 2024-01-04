/**
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 */

/**
 * @typedef {import('./infer.js').Align} Align
 */

import {ok as assert} from 'devlop'

// To do: micromark@5: use `infer` here, when all events are exposed.

/**
 * Create an HTML extension for `micromark` to support songbook.io grids when
 * serializing to HTML.
 *
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions` to
 *   support songbook.io grids when serializing to HTML.
 */
export function songbookioGridHtml() {
  return {
    enter: {
      grid(token) {
        this.lineEndingIfNeeded()
        this.tag('<table data-as="songbook-grid">')
      },
      gridSection() {
        this.lineEndingIfNeeded()
        this.tag('<tbody>')
      },
      gridRow() {
        this.lineEndingIfNeeded()
        this.tag('<tr>')
      },
      gridMeasure() {
        this.lineEndingIfNeeded()
        this.tag('<td>')

        // this.buffer()
      },

      gridTextSection() {
        this.lineEndingIfNeeded()
        this.tag('<thead>')
      },
      gridText() {
        this.lineEndingIfNeeded()
        this.tag('<th>')
      }
    },
    exit: {


      grid() {
        // Note: we don’t set `slurpAllLineEndings` anymore, in delimiter rows,
        // but we do need to reset it to match a funky newline GH generates for
        // list items combined with tables.
        this.setData('slurpAllLineEndings')
        this.lineEndingIfNeeded()
        this.tag('</table>')
      },
      gridSection() {
        this.lineEndingIfNeeded()
        this.tag('</tbody>')
      },
      gridRow() {
        this.lineEndingIfNeeded()
        this.tag('</tr>')
      },
      gridMeasure() {
        // this.resume()

        this.tag('</td>')
      },

      gridTextSection() {
        this.lineEndingIfNeeded()
        this.tag('</thead>')
      },
      gridText() {
        this.lineEndingIfNeeded()
        this.tag('</th>')
      },

      // Overwrite the default code text data handler to unescape escaped pipes when
      // they are in tables.
      codeTextData(token) {
        let value = this.sliceSerialize(token)
        this.raw(this.encode(value))
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
