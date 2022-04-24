import { JSDOM } from 'jsdom'

global.IS_REACT_ACT_ENVIRONMENT = true

let { window } = new JSDOM('<main></main>')

global.window = window
global.document = window.document
global.navigator = window.navigator
