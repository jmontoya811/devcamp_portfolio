;(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof exports === 'object') {
      module.exports = factory();
    } else {
      root.sortable = factory();
    }
  }(this, function() {
  /*
   * HTML5 Sortable library
   * https://github.com/lukasoppermann/html5sortable
   *
   * Original code copyright 2012 Ali Farhadi.
   * This version is mantained by Lukas Oppermann <lukas@vea.re>
   * Previously also mantained by Alexandru Badiu <andu@ctrlz.ro>
   * jQuery-independent implementation by Nazar Mokrynskyi <nazar@mokrynskyi.com>
   *
   * Released under the MIT license.
   */
  'use strict'
  /*
   * variables global to the plugin
   */
  var dragging
  var draggingHeight
  var placeholders = []
  var sortables = []
  /**
   * Get or set data on element
   * @param {Element} element
   * @param {string} key
   * @param {*} value
   * @return {*}
   */
  var _data = function (element, key, value) {
    if (value === undefined) {
      return element && element.h5s && element.h5s.data && element.h5s.data[key]
    } else {
      element.h5s = element.h5s || {}
      element.h5s.data = element.h5s.data || {}
      element.h5s.data[key] = value
    }
  }
  /**
   * Remove data from element
   * @param {Element} element
   */
  var _removeData = function (element) {
    if (element.h5s) {
      delete element.h5s.data
    }
  }
  /**
   * Tests if an element matches a given selector. Comparable to jQuery's $(el).is('.my-class')
   * @param {el} DOM element
   * @param {selector} selector test against the element
   * @returns {boolean}
   */
  /* istanbul ignore next */
  var _matches = function (el, selector) {
    return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector)
  }
  /**
   * Filter only wanted nodes
   * @param {Array|NodeList} nodes
   * @param {Array/string} wanted
   * @returns {Array}
   */
  var _filter = function (nodes, wanted) {
    if (!wanted) {
      return Array.prototype.slice.call(nodes)
    }
    var result = []
    for (var i = 0; i < nodes.length; ++i) {
      if (typeof wanted === 'string' && _matches(nodes[i], wanted)) {
        result.push(nodes[i])
      }
      if (wanted.indexOf(nodes[i]) !== -1) {
        result.push(nodes[i])
      }
    }
    return result
  }
  /**
   * @param {Array|Element} element
   * @param {Array|string} event
   * @param {Function} callback
   */
  var _on = function (element, event, callback) {
    if (element instanceof Array) {
      for (var i = 0; i < element.length; ++i) {
        _on(element[i], event, callback)
      }
      return
    }
    element.addEventListener(event, callback)
    element.h5s = element.h5s || {}
    element.h5s.events = element.h5s.events || {}
    element.h5s.events[event] = callback
  }
  /**
   * @param {Array|Element} element
   * @param {Array|string} event
   */
  var _off = function (element, event) {
    if (element instanceof Array) {
      for (var i = 0; i < element.length; ++i) {
        _off(element[i], event)
      }
      return
    }
    if (element.h5s && element.h5s.events && element.h5s.events[event]) {
      element.removeEventListener(event, element.h5s.events[event])
      delete element.h5s.events[event]
    }
  }
  /**
   * @param {Array|Element} element
   * @param {string} attribute
   * @param {*} value
   */
  var _attr = function (element, attribute, value) {
    if (element instanceof Array) {
      for (var i = 0; i < element.length; ++i) {
        _attr(element[i], attribute, value)
      }
      return
    }
    element.setAttribute(attribute, value)
  }
  /**
   * @param {Array|Element} element
   * @param {string} attribute
   */
  var _removeAttr = function (element, attribute) {
    if (element instanceof Array) {
      for (var i = 0; i < element.length; ++i) {
        _removeAttr(element[i], attribute)
      }
      return
    }
    element.removeAttribute(attribute)
  }
  /**
   * @param {Element} element
   * @returns {{left: *, top: *}}
   */
  var _offset = function (element) {
    var rect = element.getClientRects()[0]
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    }
  }
  /*
   * remove event handlers from items
   * @param {Array|NodeList} items
   */
  var _removeItemEvents = function (items) {
    _off(items, 'dragstart')
    _off(items, 'dragend')
    _off(items, 'selectstart')
    _off(items, 'dragover')
    _off(items, 'dragenter')
    _off(items, 'drop')
  }
  /*
   * Remove event handlers from sortable
   * @param {Element} sortable a single sortable
   */
  var _removeSortableEvents = function (sortable) {
    _off(sortable, 'dragover')
    _off(sortable, 'dragenter')
    _off(sortable, 'drop')
  }
  /*
   * Attach ghost to dataTransfer object
   * @param {Event} original event
   * @param {object} ghost-object with item, x and y coordinates
   */
  var _attachGhost = function (event, ghost) {
    // this needs to be set for HTML5 drag & drop to work
    event.dataTransfer.effectAllowed = 'move'
    // Firefox requires some arbitrary content in the data in order for
    // the drag & drop functionality to work
    event.dataTransfer.setData('text', 'arbitrary-content')
  
    // check if setDragImage method is available
    if (event.dataTransfer.setDragImage) {
      event.dataTransfer.setDragImage(ghost.draggedItem, ghost.x, ghost.y)
    }
  }
  /**
   * _addGhostPos clones the dragged item and adds it as a Ghost item
   * @param {Event} event - the event fired when dragstart is triggered
   * @param {object} ghost - .draggedItem = Element
   */
  var _addGhostPos = function (event, ghost) {
    if (!ghost.x) {
      ghost.x = parseInt(event.pageX - _offset(ghost.draggedItem).left)
    }
    if (!ghost.y) {
      ghost.y = parseInt(event.pageY - _offset(ghost.draggedItem).top)
    }
    return ghost
  }
  /**
   * _makeGhost decides which way to make a ghost and passes it to attachGhost
   * @param {Element} draggedItem - the item that the user drags
   */
  var _makeGhost = function (draggedItem) {
    return {
      draggedItem: draggedItem
    }
  }
  /**
   * _getGhost constructs ghost and attaches it to dataTransfer
   * @param {Event} event - the original drag event object
   * @param {Element} draggedItem - the item that the user drags
   */
  // TODO: could draggedItem be replaced by event.target in all instances
  var _getGhost = function (event, draggedItem) {
    // add ghost item & draggedItem to ghost object
    var ghost = _makeGhost(draggedItem)
    // attach ghost position
    ghost = _addGhostPos(event, ghost)
    // attach ghost to dataTransfer
    _attachGhost(event, ghost)
  }
  /*
   * Remove data from sortable
   * @param {Element} sortable a single sortable
   */
  var _removeSortableData = function (sortable) {
    _removeData(sortable)
    _removeAttr(sortable, 'aria-dropeffect')
  }
  /*
   * Remove data from items
   * @param {Array|Element} items
   */
  var _removeItemData = function (items) {
    _removeAttr(items, 'aria-grabbed')
    _removeAttr(items, 'draggable')
    _removeAttr(items, 'role')
  }
  /*
   * Check if two lists are connected
   * @param {Element} curList
   * @param {Element} destList
   */
  var _listsConnected = function (curList, destList) {
    if (curList === destList) {
      return true
    }
    if (_data(curList, 'connectWith') !== undefined) {
      return _data(curList, 'connectWith') === _data(destList, 'connectWith')
    }
    return false
  }
  /*
   * get handle or return item
   * @param {Array} items
   * @param {selector} handle
   */
  var _getHandles = function (items, handle) {
    var result = []
    var handles
    if (!handle) {
      return items
    }
    for (var i = 0; i < items.length; ++i) {
      handles = items[i].querySelectorAll(handle)
      result = result.concat(Array.prototype.slice.call(handles))
    }
    return result
  }
  /*
   * Destroy the sortable
   * @param {Element} sortableElement a single sortable
   */
  var _destroySortable = function (sortableElement) {
    var opts = _data(sortableElement, 'opts') || {}
    var items = _filter(_getChildren(sortableElement), opts.items)
    var handles = _getHandles(items, opts.handle)
    // remove event handlers & data from sortable
    _removeSortableEvents(sortableElement)
    _removeSortableData(sortableElement)
    // remove event handlers & data from items
    _off(handles, 'mousedown')
    _removeItemEvents(items)
    _removeItemData(items)
  }
  /*
   * Enable the sortable
   * @param {Element} sortableElement a single sortable
   */
  var _enableSortable = function (sortableElement) {
    var opts = _data(sortableElement, 'opts')
    var items = _filter(_getChildren(sortableElement), opts.items)
    var handles = _getHandles(items, opts.handle)
    _attr(sortableElement, 'aria-dropeffect', 'move')
    _data(sortableElement, '_disabled', 'false')
    _attr(handles, 'draggable', 'true')
    // IE FIX for ghost
    // can be disabled as it has the side effect that other events
    // (e.g. click) will be ignored
    var spanEl = (document || window.document).createElement('span')
    if (typeof spanEl.dragDrop === 'function' && !opts.disableIEFix) {
      _on(handles, 'mousedown', function () {
        if (items.indexOf(this) !== -1) {
          this.dragDrop()
        } else {
          var parent = this.parentElement
          while (items.indexOf(parent) === -1) {
            parent = parent.parentElement
          }
          parent.dragDrop()
        }
      })
    }
  }
  /*
   * Disable the sortable
   * @param {Element} sortableElement a single sortable
   */
  var _disableSortable = function (sortableElement) {
    var opts = _data(sortableElement, 'opts')
    var items = _filter(_getChildren(sortableElement), opts.items)
    var handles = _getHandles(items, opts.handle)
    _attr(sortableElement, 'aria-dropeffect', 'none')
    _data(sortableElement, '_disabled', 'true')
    _attr(handles, 'draggable', 'false')
    _off(handles, 'mousedown')
  }
  /*
   * Reload the sortable
   * @param {Element} sortableElement a single sortable
   * @description events need to be removed to not be double bound
   */
  var _reloadSortable = function (sortableElement) {
    var opts = _data(sortableElement, 'opts')
    var items = _filter(_getChildren(sortableElement), opts.items)
    var handles = _getHandles(items, opts.handle)
    _data(sortableElement, '_disabled', 'false')
    // remove event handlers from items
    _removeItemEvents(items)
    _off(handles, 'mousedown')
    // remove event handlers from sortable
    _removeSortableEvents(sortableElement)
  }
  /**
   * Get position of the element relatively to its sibling elements
   * @param {Element} element
   * @returns {number}
   */
  var _index = function (element) {
    if (!element.parentElement) {
      return 0
    }
    return Array.prototype.indexOf.call(element.parentElement.children, element)
  }
  /**
   * Whether element is in DOM
   * @param {Element} element
   * @returns {boolean}
   */
  var _attached = function (element) {
    // document.body.contains(element)
    return !!element.parentNode
  }
  /**
   * Convert HTML string into DOM element.
   * @param {Element|string} html
   * @param {string} tagname
   * @returns {Element}
   */
  var _html2element = function (html, tagName) {
    if (typeof html !== 'string') {
      return html
    }
    var parentElement = document.createElement(tagName)
    parentElement.innerHTML = html
    return parentElement.firstChild
  }
  /**
   * Insert before target
   * @param {Element} target
   * @param {Element} element
   */
  var _before = function (target, element) {
    target.parentElement.insertBefore(
      element,
      target
    )
  }
  /**
   * Insert after target
   * @param {Element} target
   * @param {Element} element
   */
  var _after = function (target, element) {
    target.parentElement.insertBefore(
      element,
      target.nextElementSibling
    )
  }
  /**
   * Detach element from DOM
   * @param {Element} element
   */
  var _detach = function (element) {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  }
  /**
   * Make native event that can be dispatched afterwards
   * @param {string} name
   * @param {object} detail