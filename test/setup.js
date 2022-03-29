import { JSDOM } from 'jsdom'

let { window } = new JSDOM('<main></main>')

global.window = window
global.document = window.document
global.navigator = window.navigator
