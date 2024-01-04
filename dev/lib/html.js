/**
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 */

// import {ok as assert} from 'devlop'

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
      grid() {
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

        // This.buffer()
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
        // This.resume()

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
        const value = this.sliceSerialize(token)
        this.raw(this.encode(value))
      }
    }
  }
}
