/** @type {ComponentRoute[]} */
const routes = []

/**
 * @param {Location|string} location
 * @returns {String}
 */
const getPathAndQuery = (location) => typeof (location) === 'string' ? location : `${location.pathname}${location.search}`

/**
 * @param {Location|string} location
 */
const processPath = async (location) => {
  const pathAndQuery = getPathAndQuery(location)
  for (const route of routes) {
    const matches = route.pattern.exec(pathAndQuery)
    if (matches) {
      await notifySubscribersOfNavigatedEvent(route.componentName, matches.groups, route.title)
      return
    }
  }
  console.error(`Couldn't find a component for path ${pathAndQuery}`)
}

/**
 * @param {Location} location
 * @param {Router} router
 */
const pageLoad = async (location, router) => {
  routes.sort((a, b) => b.pattern.source.length - a.pattern.source.length)
  notifySubscribersOfPageLoadedEvent()
  await processPath(location)
}

/**
 * @param { History } history
 * @param { Event } event
 */
const preventNavigation = (history, event) => {
  /** @type {HTMLElement|null} */
  let target = (/** @type {HTMLElement} */ event.target)
  while (target) {
    if (target.tagName.toLowerCase() !== 'a') {
      target = target.parentElement
      continue
    }
    const href = target.getAttribute('href')
    const title = target.getAttribute('title')
    if (!href) {
      return
    }
    // Push state
    history.pushState({}, title || '', href)
    event.preventDefault()
    event.stopPropagation()
    processPath(href)
    break
  }
}

/**
 * @param {String} elementName
 * @param {any} params
 * @param {String} title
 * @returns Promise
 */
const notifySubscribersOfNavigatedEvent = async (elementName, params, title) => {
  for (const callback of navigatedSubscribers) {
    await callback(elementName, params, title)
  }
}

/**
 * @returns Promise
 */
const notifySubscribersOfPageLoadedEvent = async () => {
  for (const callback of pageLoadedSubscribers) {
    await callback()
  }
}

/**
 * @type {Array<(elementName: string, params: any, title: string) => Promise<any>>}
 */
const navigatedSubscribers = []

/**
 * @type {Array<() => Promise<any>>}
 */
const pageLoadedSubscribers = []

export class Router {
    /** @type {History} */
    history

    /** @type {Location} */
    location

    /**
     * @param {History} history
     * @param {Location} location
     * @param {((callback: (ev: Event) => any, capture: boolean) => void)|undefined} addClickEventListener
     * @param {((callback: (ev: Event) => any, capture: boolean) => void)|undefined} addLoadEventListener
     * @param {((callback: (ev: Event) => any, capture: boolean) => void)|undefined} addPopStateEventListener
     */
    constructor (location, history, addClickEventListener, addLoadEventListener, addPopStateEventListener) {
      this.history = history
      this.location = location
      if (addClickEventListener) addClickEventListener(preventNavigation.bind(this, history), false)
      if (addLoadEventListener) addLoadEventListener(pageLoad.bind(this, location, this), false)
      if (addPopStateEventListener) addPopStateEventListener(processPath.bind(this, location), false)
    }

    /**
     * @param {(elementName: string, params: any, title: string) => Promise<any>} callback
     */
    onNavigated (callback) {
      navigatedSubscribers.push(callback)
    }

    /**
     * @param {() => Promise<any>} callback
     */
    onPageLoaded (callback) {
      pageLoadedSubscribers.push(callback)
    }

    /**
     * @param {String} componentName
     * @param {String} pattern
     * @param {String|undefined} [title]
     */
    addRoute (componentName, pattern, title) {
      const foundRoutes = routes.filter(r => r.componentName === componentName)
      if (foundRoutes.length > 0) {
        return
      }
      routes.push(new ComponentRoute(
        componentName,
        typeof (pattern) === 'string' ? new RegExp(pattern) : pattern,
        title || ''
      ))
    };
}

const global = window

export default Router
export const router = new Router( // TODO: Decouple this from globals. They should be provided by the HTML page
  global.location,
  global.history,
  // Can't use addEventListener.bind here or it won't work on IE11 because it's a native method
  global.document ? (callback, capture) => { document.addEventListener('click', callback, capture) } : undefined,
  (callback, capture) => { global.addEventListener('load', callback, capture) },
  (callback, capture) => { global.addEventListener('popstate', callback, capture) })

class ComponentRoute {
    /** @type {string} */
    componentName;

    /** @type {RegExp} */
    pattern;

    /** @type {string} */
    title;

    /**
     * Defines a component route
     * @param {string} componentName
     * @param {RegExp} pattern
     * @param {string} title
     */
    constructor (componentName, pattern, title) {
      this.componentName = componentName
      this.pattern = pattern
      this.title = title
    }
}
