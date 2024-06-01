import { Window } from 'happy-dom'

global.IS_REACT_ACT_ENVIRONMENT = true

let window = new Window()

global.window = window
global.document = window.document
global.navigator = window.navigator
