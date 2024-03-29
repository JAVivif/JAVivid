{
  self._isBundled = true
  const _canSW = location.href.startsWith('http')
  const devMode = /[?&]de(?:[lv]|bug)/.test(location)
  const uSP = new URLSearchParams(location.search)
  const devInstrs = (uSP.get('del') || '').split(/\s*,\s*/).concat(uSP.get('dev')).filter(Boolean)
  const swFile = `${self._isBundled ? 'main' : 'sw'}.js`
  if (typeof _canSW === 'undefined' || _canSW === true) {
    if (typeof window !== 'undefined') {
      self.clearCaches = async () => {
        try {
          const keys = await caches.keys()
          keys.forEach(key => caches.delete(key))
          console.info('🗑️ Caches removed.')
        }
        catch (e) { console.log('Presumably you are in an incognito window and there is no cache to speak of.') }
      }
      if (!devInstrs.includes('no')) {
        if (devMode ||
          ['all', 'cache'].some(v => devInstrs.includes(v)) ||
          Date.now() - localStorage.getItem('lastOpen') > 86400 * 1000 * 30
        ) {
          clearCaches()
        }
        localStorage.setItem('lastOpen', Date.now())
      }
      if (location.protocol.startsWith('http')) {
        'serviceWorker' in navigator &&
          (
            devInstrs.length
              ? navigator.serviceWorker.getRegistrations()
                .then(
                  regs => {
                    const prevRegs = regs.length
                    regs.forEach(reg => reg.unregister())
                    console.info('🗑️ ServiceWorker unregistered.', prevRegs ? `(There were ${prevRegs} before)` : '')
                  }
                )
              : Promise.resolve()
          ).then(
            () => {
              navigator.serviceWorker.register(swFile).then(
                _reg => console.info(`✅ ServiceWorker registration successful. (swFile: ${swFile})`),
                _err => console.info('💊 ServiceWorker registration failed:', _err, '\nat:\n', self)
              )
            }
          )
      }
    }
    else {
      (function swTasks() {
        const cacheName = 'JAVivid'
        const urlsToCache = ['/', 'index.html', 'style.css', 'common.css', swFile, 'favicon.ico']
        urlsToCache.push(
          ...swFile !== 'main.js' ? ['main.js'] : ['./configs/config.js'],
          './localization/_countries.js',
          './localization/zh-CN.js',
          'configs/ADs.js'
        )
        const expectedCacheUrls = new Set(urlsToCache)
        const isUrlToCache = url => {
          url = new URL(url)
          const is = url.origin === location.origin && expectedCacheUrls.has(url.pathname)
          is && console.log(url.pathname, 'gets cached.')
          return is
        }
        self.addEventListener('install', async e => {
          self.skipWaiting()
          e.waitUntil(caches.open(cacheName).then(cache => {
            console.info('Cached locally.')
            return cache.addAll(urlsToCache)
          }))
        })
        self.addEventListener('activate', _ => {
          clients.claim()
          console.info('⚒ Service Worker activated.')
        })
        const crBug823392 = e => e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin'
        self.addEventListener('fetch', e => {
          if (crBug823392(e)) return
          const url = e.request.url
          const urlObj = new URL(url)
          const isOrigin = urlObj.origin === location.origin
          const { method } = e.request
          if (e.request.headers.get('--from') && !e.request.headers.get('--maybe-expired')) {
            Object.defineProperty(e, 'request', { value: new Request(url, { method }) })
            return e.respondWith(caches.match(e.request).then(res => (
              res = new Response(res.body, { statusText: 'Already exist!' }),
              res
            )))
          }
          if (!isOrigin) return
          e.respondWith(async function () {
            const cache = await caches.open(cacheName)
            let res
            if (e.request.headers.get('--permit')) {
              Object.defineProperty(e, 'request', { value: new Request(url, { method }) })
            }
            else if (res = await cache.match(e.request) || !url.includes('.css') && await cache.match(urlWithoutSearch(url))) {
              console.log(`Found response in cache: ${res.url.match(/\/[^/]*$/)}`)
              return res
            }
            try {
              if (needForward(url)) {
                res = await forwardFetch(new Request(replaceOrigin(e.request.url, self._currUrl), { method }))
                res = new Response(res, { headers: { 'Content-Type': res.type } })
              }
              else {
                res = await fetch(e.request)
                res.ok && !/HEAD/i.test(method) && isUrlToCache(url) && cache.put(url, res.clone())
              }
              return res
            }
            catch (err) { throw err }
          }())
        })
        function urlWithoutSearch(url) {
          const { origin, pathname } = new URL(url)
          return origin + pathname
        }
        function urlPathname(url) {
          const { pathname } = new URL(url)
          return pathname
        }
        function replaceOrigin(url, newOrigin = '') {
          const { origin, pathname, search } = new URL(url)
          return (newOrigin || origin) + pathname + search
        }
        const needForward = url => isQuery(url)
        const isQuery = url => queriesLinks.test(url)
        const queriesLinks = ['/complete/search?q=', '/ac/?q=']
        queriesLinks.test = function (url) { return this.find(urlPart => url.includes(urlPart)) }
        self.addEventListener('message', e => {
          if (!e.data) return
          switch (e.data.type) {
            case 'set': Object.assign(self, e.data.value); break
            case 'eval': eval(e.data.value); break
          }
        })
        const forwardingFetch = new BroadcastChannel('forwardingFetch')
        forwardingFetch.onmessage = e => {
          if (e.data.type !== 'fetchResponse') return
          forwardingFetchMap.get(e.data.url).res(e.data.response)
        }
        const forwardingFetchMap = new Map
        async function forwardFetch(request) {
          if (forwardingFetchMap.has(request.url)) return forwardingFetchMap.get(request.url)
          let res
          forwardingFetchMap.set(request.url, Object.assign(
            new Promise(r => res = response => {
              forwardingFetchMap.set(request.url, response)
              r(response)
            }), { res }
          ))
          const req = { url: request.url, method: request.method }
          forwardingFetch.postMessage(req)
          return forwardingFetchMap.get(request.url)
        }
      })()
    }
  }
  typeof window !== 'undefined' && !function () {
    window._tmplsNames = [
      'i-🍛',
      'i-ꔹ',
      'i-〽️',
      'i-🚨',
      'i-💭',
      'i-💿',
      'i-🍞',
      'i-🍫',
      'i-🎿',
      'i-🔘',
      'i-🖨️',
      'i-🎞️'
    ]
    function genHTMLComp() {
      return document.getElementById('html-comp')
        .appendChild(document.createElement('template'))
    }
    Promise.all(window._tmplsNames.map(v => customElements.whenDefined(v)))
      .then(() => {
        window._allHTMLCompLoaded = true;
        [...document.scripts].forEach(s => s.remove())
      })
      ;
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🍛'><div id=btn><slot></slot></div>
    <style>#btn{display:inline-block;position:relative;padding:0.5rem 1rem;border-radius:0.25rem;color:white;background-color:hsl(236,32%,26%);box-shadow:0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12);outline:none;cursor:pointer;--trans-duration:0.5s;transition:all var(--trans-duration),background-color calc(0.25 * var(--trans-duration));z-index:1}#btn:hover{background-color:hsl(236,32%,30%)}#btn:active{background-color:hsl(236,32%,22%)}#btn::after,#btn::before{content:'';position:absolute;z-index:-1}:host(.shadow) #btn{box-shadow:0 0 0.15rem aliceblue}:host(.disable) #btn{background-color:hsla(236,75%,90%,0.5)}.ovhi{overflow:hidden}#btn.shine::after{--top:-60%;top:var(--top);left:0;bottom:var(--top);--width:1.5rem;width:var(--width);background-color:hsla(0,0%,100%,0.2);transform:translateX(calc(-1.4 * var(--width))) rotate(20deg)}#btn.shine:hover::after{transition:transform calc(1.1 * var(--trans-duration));transform:translateX(calc(1.4 * (var(--btn-width) + 1.4 * var(--width)))) rotate(35deg)}#btn.pulse-act{overflow:unset}#btn.pulse-act::before{top:0;bottom:0;left:0;right:0;border-radius:inherit;transform-origin:center;border:0 solid hsl(236,32%,26%);animation:pulse 0.75s}@keyframes pulse{0%{border-width:calc(var(--btn-height) / 2)}100%{border-width:var(--btn-height);transform:scale(1.25);opacity:0}}</style>
    </template>`
      const templateName = 'i-🍛'
      customElements.define(templateName, class CBtn extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true))
          const btn = this.btn = this.shadowRoot.getElementById('btn')
          btn.className = this.className || 'shine pulse'
          this.removeAttribute('class')
          const $s = btn.classList.contains('shine') ? 'ovhi shine' : ''
          $s && adrm($s)
          let anEnd = null
          this.addEventListener('click', e => {
            if (!isMouseOn(e)) return e.stopImmediatePropagation()
            if (anEnd !== null) return
            adrm('pulse-act', $s)
            anEnd = btn.addEventListener('animationend', () => {
              adrm('', 'pulse-act')
              btn.addEventListener('pointerleave', () => {
                anEnd = null
                btn.addEventListener('pointerenter', () => {
                  adrm($s)
                }, { once: true })
              }, { once: true })
            }, { once: true })
          })
          function adrm(s1, s2) {
            [s1, s2] = [s1, s2].map(v => typeof v === 'string' && v.trim())
            s1 && btn.classList.add(...s1.split(' '))
            s2 && btn.classList.remove(...s2.split(' '))
          }
          if (typeof this.onclick === 'function') {
            this.addEventListener('click', this.onclick)
            this.removeAttribute('onclick')
          }
        }
        connectedCallback() {
          const { btn } = this
          const { height, width } = getComputedStyle(btn)
          parent.initForStyleSmoothly.call(this, btn, { height, width }, { customPrefix: '--btn-', observe: true })
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-ꔹ'><div class='bubbles' translate=no><div></div><div></div><div></div></div>
    <style>:host{text-align:center}:host .bubbles>*{--orig-duration:1.6;--duration:var(--orig-duration)}:host([accel]) .bubbles>*{clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 100%,20% 50%,0% 0%);border-radius:unset;--duration:calc(var(--orig-duration) / 2);margin:calc(-1 * var(--radius) / 10)}.bubbles>*{display:inline-block;--radius:1.15rem;width:var(--radius);height:var(--radius);margin:calc(var(--radius) / 10);border-radius:50%;background-color:rgba(216,112,147,0.8);animation:fader calc(var(--duration) * 1s) infinite both}.bubbles>*:nth-child(2){animation-delay:calc(var(--duration) / 8 * 1s)}.bubbles>*:nth-child(3){animation-delay:calc(var(--duration) / 4 * 1s)}@keyframes fader{50%{background-color:rgba(128,0,128,0.64)}}</style>
    </template>`
      window.templateName = 'i-ꔹ'
      customElements.define(templateName, window.cfBubbles = class extends HTMLElement {
        constructor(id) {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true))
          if (id !== undefined) this.id = id
          this.shadowRoot.append(...this.childNodes)
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-〽️'><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 130.2 130.2'>
    <style>:host{--width:2ch;--left:-0.5ch;--hang-in:calc(-1 * var(--width));--gap:1ch}:host{position:relative;left:var(--left);margin-left:var(--hang-in);text-indent:var(--sp)}:host([not~=hang]){margin-left:unset}:host([not~=near]){--sp:calc(var(--gap) - var(--hang-in))}svg{display:inherit;width:var(--width)}.path{stroke-dasharray:1000;stroke-dashoffset:0;stroke:#73AF55;stroke-width:20;fill:none;stroke-linecap:round}.path.check{stroke-dashoffset:-100;animation:dash-check 0.5s ease-in-out forwards}@keyframes dash-check{0%{stroke-dashoffset:-100}100%{stroke-dashoffset:900}}</style>
    <polyline class='path check' points='100.2,40.2 51.5,88.8 29.8,67.5' /></svg></template>`
      const templateName = 'i-〽️'
      customElements.define(templateName, window.CheckMark = class extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true))
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🚨'>
    <style name='style'>:host{word-break:break-word}[err-font]{color:red;font-weight:bold}</style>
    <slot name='modules-problem'><p><span err-font>Error:</span> Unable to import modules. Loading failed. </p><br><template eval-block>
      <script>
        const evalBlock = this.shadowRoot.querySelector('[eval-block]')
          , eBC = evalBlock.content
          , cond = window.location.protocol.includes('file') ? 'local' : 'trivial'
          , matched = eBC.querySelector(\`[cond='\${cond}']\`)
          , htmlCompDirPath = /[^/]*\\/[^/]*(?=\\.html$)/
        matched.removeAttribute('choose');
        [...matched.querySelectorAll('code[eval]')].forEach(el => {
          el.innerText = eval(el.innerText)
          el.removeAttribute('eval')
          el.setAttribute('evaled', '')
        })
        eBC.querySelectorAll('[choose]').forEach(el => el.remove())
        eBC.querySelector('script').remove()
        evalBlock.before(eBC)
        evalBlock.remove()
      <\/script>
      <div choose cond='local'><p><b>Reason:</b> Cross-Origin Request Blocked. </p><p> You're using the local <a href='https://en.wikipedia.org/wiki/File_URI_scheme' target='_blank'> file URI scheme</a> (<code eval> decodeURI(\`\${location.protocol}//\${location.pathname.replace(htmlCompDirPath, 'index')}\`) </code>). </p><br><p><b>Solution 1:</b> Google search for <b>“Web Server for <a href='https://www.google.com/search?q=kWS+-+Android+Web+Server' target='_blank'>Android</a>/iOS</b>/etc<b>”</b>. </p><p><b>Solution 2:</b> Use the <a href='../Releng/bundled/index.html' target='_top'><b>bundled local version</b></a> instead. (If file not found, run <code>node <a href='../Releng/bundle.js' target='_blank'>bundle.js</a></code> to generate it.) </p></div><div choose cond='trivial'><p>Looks like something went wrong! Try refreshing.</p></div></template></slot><slot name='idb-problem'><p><span err-font>Error:</span> Unable to use <b>indexedDB</b>. </p><p>Perhaps you're using Firefox and either in a Private Window (desktop) or version below 90 (mobile). </p></slot><div name='undefErr'><span err-font>Error:</span><slot></slot></div></template>`
      customElements.define('i-🚨', window.errSec = class extends HTMLElement {
        constructor(slotVal) {
          super()
          const tmpl = document.getElementById('i-🚨').content.children
            , slot = tmpl[slotVal || this.attributes.slot && this.attributes.slot.value] || tmpl.undefErr
            , { style } = tmpl
            , shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true })
          shadowRoot.appendChild(style.cloneNode(true))
          shadowRoot.appendChild(slot.cloneNode(true))
          this._tryHandle()
        }
        connectedCallback(evalC = this.shadowRoot.querySelector('[eval-block]')) {
          eval(evalC && evalC.content.querySelector('script').text)
        }
        _tryHandle() {
          switch (this.slot) {
            case 'sqlite': try {
              rebuiltIDB()
              this.innerHTML = 'SQLite broken.<br>' +
                'A new one has now been built.<p>Please refresh the page.</p>'
            } finally { }; break
          }
        }
      })
      window.addEventListener('message', e => {
        if (e.data === 'iframeHeight') {
          const css = Object.assign(document.createElement('link'), {
            rel: 'stylesheet', href: '../style.css'
          })
          document.querySelector('i-🚨').shadowRoot.prepend(css)
          e.source.postMessage({ iframeHeight: document.documentElement.scrollHeight }, '*')
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id=i-💭><div id=pd-box><div><div></div><ul role=listbox></ul></div></div><slot name=li><li class=sbct><div class=LaCQgf><div class=zRAHie role=option><slot name=item></slot></div></div></li></slot>
    <style>:host{display:block;position:absolute;cursor:default;text-align:left;--t-i:var(--search-box-padding-h);pointer-events:none}:host.hide{display:none}:host>:not(:first-child){display:none}slot{color:var(--color)}li:hover,li.hovering{background-color:var(--menu-li-bg)}#pd-box{--pd-box-border-radius:var(--box-border-radius);--padding:calc(2 * var(--pd-box-border-radius));overflow:hidden;padding:var(--padding);padding-top:0;width:100%;margin-left:calc(-1 * var(--padding))}#pd-box,#pd-box>:first-child{border-radius:var(--pd-box-border-radius);border-top-left-radius:0;border-top-right-radius:0}#pd-box>:first-child{background-color:var(--search-box-bg);--box-shadow-color:var(--box-shadow-color-spec,rgba(64,60,67,.24));--box-shadow-color-tint:rgba(64,60,67,.12);box-shadow:var(--box-shadow,4px 8px 8px -3px var(--box-shadow-color),-4px 0 8px -3px var(--box-shadow-color),8px 0.5rem 8px -7px var(--box-shadow-color-tint),-8px 0.5rem 8px -7px var(--box-shadow-color-tint));display:flex;flex-direction:column;list-style-type:none}#pd-box>:first-child>:first-child{border-top:1px solid #c8c8c8;margin:0 var(--search-box-padding-v)}ul,ul>li{margin:0;padding:0}ul{pointer-events:auto}ul.flex{display:flex;flex-direction:column;max-height:calc(100vh - var(--nav-after-height));overflow:auto;overscroll-behavior:contain}ul>li:last-child{padding-bottom:var(--search-box-padding-v)}[slot=item]{display:flex;flex-direction:column}[words-excerpt-container]{display:flex;align-items:center;margin-left:calc(2 * var(--t-i));margin-top:calc(0.72 * var(--t-i));gap:0.75rem}[words-excerpt-title]{color:gray;font-size:smaller}:host([data-theme=dark]) [words-excerpt-title]{color:lightgray}:host-context([data-theme=dark]) [words-excerpt-title]{color:lightgray}[words-excerpt-title]:empty{display:none}[words-excerpt-img]{max-height:6ex}[words-excerpt-desc]{font-size:smaller}.sbct{display:flex;padding:0}.LaCQgf{display:flex;margin:0 var(--t-i)}.zRAHie{display:flex;flex-direction:column;padding:6px 0}</style>
    </template>`
      const templateName = 'i-💭'
      customElements.define(templateName, window.googlePredictions = class googlePredictions extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true));
          [
            ['slotLi', 'slot[name=li]'],
            ['ul']
          ]
            .forEach(([n, s = n]) =>
              this[n] = this.shadowRoot.querySelector(s)
            )
          this.setAttribute('translate', 'no')
          this.replaceItems = function (items) {
            this.ul.innerHTML = ''
            if (items) {
              if (!Array.isArray(items)) items = [items]
              if (items.length) {
                items = items.map(item => {
                  const isSame = item[0].toLowerCase() === (item[3] && item[3].zh && item[3].zh.replace(/[.-]/g, '').toLowerCase())
                  return `<span slot=item><span keywords>${isSame ? item[3].zh : item[0]}</span>${item[3] && item[3].zh
                    ? `<span words-excerpt-container>${item[3].zs ? `<img words-excerpt-img src=${item[3].zs}>` : ''}<span words-excerpt-title>${isSame ? '' : item[3].zh}${item[3].zi ? ` <span words-excerpt-desc>${item[3].zi}</span>` : ''}</span></span>` : ''
                    }</span>`
                })
                const arr = []
                for (let i = 0; i < items.length; ++i) {
                  const li = this.slotLi.cloneNode(true)
                  li.querySelector('slot[name=item]').innerHTML = items[i]
                  arr.push(li)
                }
                this.ul.append(...arr)
                if (this.appendToElem instanceof HTMLElement) this.appendToElem.append(this)
                if (!arr.length) return this.clear()
              }
            }
            this[items && items.length && this.isConnected ? 'show' : 'hide']()
          }
          this.clear = function () { this.replaceItems(); this.remove() }
          this.hide = function () { if (!this.isConnected) return; this.classList.add('hide'); this._responseToElems() }
          this.show = function () { if (!(this.isConnected && this.ul.childElementCount)) return; this.classList.remove('hide'); this._responseToElems(true) }
          this._responseToElems = function (add) {
            if (Array.isArray(this.responseToElems)) {
              this.responseToElems.forEach(elem => elem instanceof HTMLElement &&
                elem.classList[add ? 'add' : 'remove'](templateName)
              )
            }
          }
          this.selected = {}
          this.addEventListener('select', ({ detail: { explicitOriginalType, explicitOriginalTarget } }) => {
            const li = explicitOriginalTarget.closest('li')
            const item = li && li.querySelector('[keywords]')
            if (!item) return
            const text = item.innerText
            this.selected = { item, text }
          })
          this.addEventListener('click', this.dispatchSelect)
          this.addEventListener('keydown', e => {
            const { key } = e
            switch (key) {
              case 'ArrowDown': this.hoverOnItem(1); break
              case 'ArrowUp': this.hoverOnItem(0); break
              case 'Enter': if (this.ul.hovering) {
                this.dispatchSelect({ explicitOriginalType: 'keydown', explicitOriginalTarget: this.ul.hovering })
                delete this.ul.hovering
              }; break
              default: delete this.ul.hovering
            }
          })
        }
        get isShow() {
          return this.isConnected && !this.classList.contains('hide')
        }
        dispatchSelect(e) {
          this.dispatchEvent(new CustomEvent('select', {
            detail: {
              explicitOriginalType: e.type,
              explicitOriginalTarget: e.explicitOriginalTarget || e.composedPath()[0]
            }
          }))
        }
        hoverOnItem(downward = true) {
          if (this.ul.hovering) {
            clearTimeout(this.ul.hovering.focusWithDelay)
            this.ul.hovering.focusWithDelay = setTimeout(() => this.ul.hovering.scrollIntoView({ block: 'nearest' }), 50)
          }
          this.ul.list = this.ul.querySelectorAll('li')
          this.ul.hovering = this.ul.querySelector('.hovering')
          if (!this.ul.hovering) {
            this.ul.hovering = this.ul.querySelector(`slot:nth-child(${downward ? 1 : this.ul.list.length})>li`)
          }
          else {
            let pos = Array.prototype.indexOf.call(this.ul.list, this.ul.hovering) + 1
            if (pos === (downward ? this.ul.list.length : 1)) return
            pos += downward ? 1 : -1
            this.ul.hovering.classList.remove('hovering')
            this.ul.hovering = this.ul.querySelector(`slot:nth-child(${pos})>li`)
          }
          if (!this.ul.hovering) return
          this.ul.hovering.classList.add('hovering')
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-💿'>
    <style>:host{--offset:calc(3.14 * var(--width) * 1px);--duration:1.75s;display:grid;place-content:center;position:absolute;height:100%}.spinner{animation:rotator var(--duration) linear infinite}@keyframes rotator{100%{transform:rotate(1.5turn)}}.path{stroke-dasharray:var(--offset);transform-origin:center;animation:dash var(--duration) infinite,colors calc(var(--duration)*4) infinite}@keyframes colors{0%{stroke:dodgerblue}50%{stroke:tomato}100%{stroke:dodgerblue}}@keyframes dash{0%{stroke-dashoffset:calc(var(--offset) / 4)}50%{stroke-dashoffset:calc(var(--offset) / 1.05);transform:rotate(1.15turn)}100%{stroke-dashoffset:calc(var(--offset) / 4);transform:rotate(1.5turn)}}</style>
    </template>`
      const templateName = 'i-💿'
      customElements.define(templateName, window.Spi = class extends HTMLElement {
        constructor(r = 35) {
          super()
          const spin = { strokeWidth: r / 3.5 }
          spin.width = r * 2 + spin.strokeWidth
          {
            const { strokeWidth: sw, width: w } = spin, c = w / 2
            this.attachShadow({ mode: 'open', delegatesFocus: true }).innerHTML = `
          <s-v-g class=spinner width=${w} viewBox='0 0 ${w} ${w}'>
            <circle class=path fill=none stroke-width=${sw} cx=${c} cy=${c} r=${r}></circle>
          </s-v-g>
        `.replace(/s-v-g/g, 'svg') + document.getElementById(templateName).innerHTML
          }
          this.style.setProperty('--width', spin.width)
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🍞'>
    <style>@import 'common.css';:host{--offsetY:0;display:grid;place-items:center;position:fixed;width:100%;bottom:6vh;z-index:3;animation:fade-in 0.3s;pointer-events:none;transition-duration:0.37s}@keyframes fade-in{from{transform:translateY(50%);opacity:0}to{transform:translateY(0);opacity:1}}[data-msg]{--background-color:rgba(72,72,72,0.95);background-color:var(--background-color);color:azure;--padding-left:0.6rem;padding:var(--padding-left) calc(1.6 * var(--padding-left));border-radius:calc(2 * var(--padding-left));max-width:min(80vw,42rem);pointer-events:all;position:relative;margin:0.3rem 0}code,.code{font-family:'Fira Code','Roboto Mono',Consolas,'DejaVu Sans Mono',Menlo,Monaco,'Microsoft YaHei UI',monospace;color:rgb(215,186,125);background-color:rgba(40,43,51,0.98);letter-spacing:-0.2px;font-size:1.05em}code{background-color:unset}:host(.fade-out){transform:translateY(calc(var(--offsetY)*1px - 33%)) !important;opacity:0;transition:all 0.5s}:host(.fade-out-reverse){transform:translateY(calc(var(--offsetY)*1px + 60%)) !important}div[msg]{max-height:20vh;overflow-y:auto}.xBtnWrapper{--side:var(--padding-left);--neg-side:calc(-1.5 * var(--side));position:absolute;top:var(--neg-side);left:0;--font-size:calc(2.3 * var(--side));width:var(--font-size);height:var(--font-size);background-image:linear-gradient(to top,transparent,var(--background-color) 40%);border-radius:50% 50% 40% 40%;cursor:pointer;overflow:hidden}.xBtn{font-size:var(--font-size)}.xBtn::before{content:'✕';color:rgb(240,58,23);position:absolute;transform:translate(calc(0.12 * var(--font-size)),calc(-0.3 * var(--font-size)));text-shadow:1px 1px darkred}.flash{animation:flash 125ms linear 4 alternate}@keyframes flash{to{background:white}}</style>
    </template>`
      const templateName = 'i-🍞'
      customElements.define(templateName, window.Tosta = class Tosta extends HTMLElement {
        constructor(msg, duration, { className = '', showXBtn, id, dedup = true } = {}) {
          super()
          if (dedup && Tosta.msgMap.has(msg)) {
            const _this = Tosta.msgMap.get(msg)
            Tosta.showElem(_this)
            return _this
          }
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true))
          if (typeof duration === 'string') [duration, id] = [, duration]
          else if (duration && typeof duration === 'object') ({ className, showXBtn, id, dedup } = duration)
          if (id) {
            const prev = document.querySelector(`${templateName}#${id}`)
            prev && prev.remove()
            this.id = id
          }
          Tosta.msgMap.set(this._msg = msg, this)
          const div = document.createElement('div')
          div.setAttribute('data-msg', '')
          div.innerHTML = `<div msg>${msg}</div>`
          div.className = className
          this._msgDiv = div
          if (showXBtn) {
            const xBtnWrapper = document.createElement('div')
            const xBtn = document.createElement('div')
            xBtnWrapper.className = 'xBtnWrapper'
            xBtn.className = 'xBtn'
            xBtn.addEventListener('click', () => Tosta.removeElem(this, { reverse: true }))
            xBtnWrapper.append(xBtn)
            div.prepend(xBtnWrapper)
            div.style['border-top-left-radius'] = 0
            div.style.setProperty('--padding-left', '1rem')
          }
          this.shadowRoot.append(div)
          if (!Array.isArray(window[`__${templateName}`])) window[`__${templateName}`] = []
          window[`__${templateName}`].push(this)
          if (!(typeof duration === 'number' && duration > 0)) duration = String(msg).split(/\W/).length / 2 + 2
          this._duration = duration
          Tosta.showElem(duration)
        }
        scat() {
          Tosta.removeElem(this, { reverse: true })
        }
        static msgMap = new Map
        static showElem(duration) {
          let elem
          if (typeof duration === 'object') {
            elem = duration
            duration = elem._duration
            elem.removeAttribute('class')
          }
          else elem = window[`__${templateName}`].shift()
          Tosta.getContainer().append(elem)
          clearTimeout(elem.timeoutID)
          Tosta.setTimeout(elem, duration)
          slidePreviousSiblings(elem, 'up')
        }
        static removeElem(elem, { reverse } = {}) {
          elem.classList.add('fade-out', ...reverse ? ['fade-out-reverse'] : [])
          elem.addEventListener('transitionend', () => {
            slidePreviousSiblings(elem, 'down')
            elem.remove()
            Tosta.msgMap.delete(elem._msg)
          })
        }
        static setTimeout(elem, delay) {
          let isFirstTime = true
          elem.setTimeout = shortDelay => elem.timeoutID = setTimeout(() => Tosta.removeElem(elem), isNaN(shortDelay) ? delay / (isFirstTime ? 1 : 2) * 1000 : shortDelay)
          elem.setTimeout()
          isFirstTime = false
          elem.addEventListener('dblclick', elem.setTimeout.bind(undefined, 0), { once: true })
          elem.addEventListener('pointerenter', () => {
            clearTimeout(elem.timeoutID)
            elem.addEventListener('pointerleave', elem.setTimeout, { once: true })
          })
        }
        static getContainer() {
          if (Tosta.containerCreated) return Tosta.container
          Tosta.containerCreated = true
          Tosta.container = Object.assign(document.createElement('div'), { id: 'toast-container' })
          return document.body.appendChild(Tosta.container)
        }
      })
      Object.defineProperty(HTMLElement.prototype, 'previousElementSiblings', {
        get() {
          if (!this || !this.parentNode) return []
          const siblings = [...this.parentNode.children], idx = siblings.indexOf(this)
          return siblings.slice(0, idx)
        }
      })
      function slidePreviousSiblings(elem, dir) {
        if (!elem.previousElementSibling) return
        const { height } = elem.getBoundingClientRect()
        let previousSiblings
        switch (dir) {
          case 'up': [previousSiblings, dir] = [Tosta.container.querySelectorAll(':not(:last-child)'), -1]; break
          case 'down': [previousSiblings, dir] = [elem.previousElementSiblings, 1]; break
        }
        if (!previousSiblings) return
        previousSiblings.forEach(el => {
          const offsetY = +el.style.getPropertyValue('--offsetY') + dir * height
          el.style.setProperty('--offsetY', offsetY)
          el.style.transform = `translateY(${offsetY}px)`
        })
      }
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🍫'><div class='i-🍫'><div class='layer'></div><div class='stripe'></div><div class='flick'></div></div>
    <style>:host{--dbLen:200%;--i-🍫-width:0%;--i-🍫-height:3px;--stripe-width:calc(6.18 * var(--i-🍫-height));--stripe-speed:calc(-2 * var(--stripe-width));--flick-diam:calc(0.33 * var(--stripe-width));--flick-blur:calc(0.33 * var(--i-🍫-height));--width-transition-duration:0.44s;--width-transition--timing:ease-in-out}.i-🍫{pointer-events:none;user-select:none;overflow-x:hidden;position:fixed;top:0;left:0;z-index:2;width:var(--i-🍫-width);height:var(--i-🍫-height);padding-bottom:var(--flick-blur);transition:width var(--width-transition-duration) var(--width-transition--timing);border-radius:0 calc(0.66 * var(--flick-blur)) var(--i-🍫-height) 0}.layer{background-color:rgba(114,40,255,0.72);height:100%}.stripe{position:absolute;left:0;top:0;right:var(--stripe-speed);bottom:0;height:var(--i-🍫-height);background-image:linear-gradient(45deg,transparent,transparent 40%,rgba(255,255,255,0.3) 40%,rgba(255,255,255,0.3) 80%,transparent 80%),linear-gradient(to top,rgba(255,255,255,0.5),rgba(0,0,0,0.3));background-size:var(--stripe-width) 100%;animation:stripe 500ms linear infinite}@keyframes stripe{0%{transform:none}100%{transform:translateX(var(--stripe-speed))}}.flick{position:absolute;top:0;left:-100%;width:var(--flick-diam);height:var(--i-🍫-height);box-shadow:0 0 var(--flick-blur) var(--flick-blur) hsla(0,0%,100%,0.98);border-radius:var(--flick-blur);background-color:hsl(0,0%,100%);animation:flick 4s 3s ease infinite;transition:opacity 2s}@keyframes flick{0%{left:calc(0% - var(--flick-diam))}75%,100%{left:calc(100% + var(--flick-diam) / 2 + var(--flick-blur) + 2px)}}.hide{opacity:0.1}.hide-children *{display:none}.finished{transform:translateX(calc(var(--dbLen)));transition:transform 1.5s 0.5s}</style>
    </template>`
      customElements.define('i-🍫', class extends HTMLElement {
        static get observedAttributes() {
          return ['data-progress']
        }
        constructor() {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById('i-🍫').content.cloneNode(true))
          this.wrapper = this.shadowRoot.firstElementChild
          this.flick = this.shadowRoot.querySelector('.flick')
          this.queue = []
        }
        connectedCallback() {
          const classList = this.wrapper.classList
          this.set(this.dataset.progress, true)
          this.wrapper.addEventListener('transitionrun', () => {
            this.inProgress = +(this.inProgress || 0) + 1
            this.dataset.inProgress = this.inProgress
          })
          this.wrapper.addEventListener('transitionend', e => {
            delete this.dataset.inProgress
            this.nexting = false
            if (this.queue.length <= 1) this.flick.classList.remove('hide')
            if (['0%', '100%'].includes(this.dataset.progress))
              switch (e.propertyName) {
                case 'width':
                  if (this.dataset.progress === '100%') {
                    this.dataset.times = +(this.dataset.times || 0) + 1
                    classList.add('finished')
                  }
                  if (this.dataset.progress === '0%') {
                    this.reinitiating = false
                    this.next()
                  }
                  classList.remove('hide-children')
                  break
                case 'transform':
                  classList.replace('finished', 'hide-children')
                  this.reinitiating = true
                  this.set(0, true)
              }
            else this.next()
          })
        }
        attributeChangedCallback(_name, oldValue, newValue) {
          if (oldValue == null || this.reinitiating) return
          oldValue !== newValue && this.set(newValue)
        }
        set(num, init) {
          num = Math.min(parseInt(num) || 0, 100)
          if (!init) {
            this.flick.classList.add('hide')
            if ((!this.ing || this.nexting) && num === parseInt(this.dataset.progress))
              return
            if (this.queue.length && this.queue[this.queue.length - 1].num === num)
              return
            this.queue.push(this.pr(num))
            if (this.ing)
              return
            this.ing = true
          }
          else {
            this.queue.length = 0
          }
          this.queue.length > 1
            ? (
              this.wrapper.style.setProperty('--width-transition-duration', `${0.4 / this.queue.length}s`),
              this.wrapper.style.setProperty('--width-transition-timing', 'ease-out')
            )
            : ['--width-transition-duration', '--width-transition-timing']
              .forEach(p => this.wrapper.style.removeProperty(p))
          if (num) this.wrapper.classList.remove('finished', 'hide-children')
          this.wrapper.style.setProperty('--i-🍫-width', this.dataset.progress = `${num}%`)
        }
        next() {
          this.ing = false
          this.queue.shift()
          if (this.queue.length) {
            this.nexting = true
            this.set(...this.queue[0].args, true)
          }
        }
        pr(num) {
          return { args: arguments, num }
        }
      })
      function _test_progress_bar() {
        [...[...Array(10)].map((_, i) => ++i * 10), 10]
          .forEach(function (v) { this.set(v) }, document.querySelector('i-🍫'))
      }
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🎿'>
    <style>:host{--trans-duration:0.3s;--trans-delay:0.1s;--slide-dir:-1;--slide-in:calc(var(--slide-dir) * 100%);--slide-back:calc(-1 * var(--slide-in));--padding-side:0.5rem;--margin-side-base:0.6rem;--margin-side:var(--margin-side-base);--max-width:var(--global-max-width,35rem);--dividing-line-color:#70809090;--dividing-line:1px solid var(--dividing-line-color);--items-dividing-line:var(--dividing-line);--group-dividing-line:var(--dividing-line);--list-color:#08f3;--list-border-radius:var(--padding-side);--list-padding:0.3rem;--list-box-shadow-blur-radius:calc(2.15 * var(--list-padding));--list-box-shadow-spread-radius:calc(-1 * var(--list-padding));--sym-x:'✖';--sym-left:'❮';--sym-right:'❯';--sym-back:var(--sym-left);--sym-down-thin:'⌵';--sym-gap:0.55rem;--sym-margin:0 0.8rem 0 0.5rem;--dusky-color:hsla(0,0%,0%,0.05);--dusky-color-dark:hsla(0,0%,100%,0.05);--header-background-color:hsla(0,0%,0%,0.01);--header-background-color-dark:hsla(0,0%,100%,0.025);--header-box-shadow-color:hsla(0,0%,0%,0.15);--header-box-shadow-color-dark:hsla(0,0%,100%,0.15);--header-font-size:1.5rem;--dt-font-size:1.15rem;--bounce-in:bounce-in 0.15s}:host-context([data-theme=dark]){--dusky-color:var(--dusky-color-dark);--header-background-color:var(--header-background-color-dark);--header-box-shadow-color:var(--header-box-shadow-color-dark)}:host([data-theme=dark]){--dusky-color:var(--dusky-color-dark);--header-background-color:var(--header-background-color-dark);--header-box-shadow-color:var(--header-box-shadow-color-dark)}:host{display:flex;justify-content:center;position:relative;padding:var(--padding-side) 0;height:calc(100% - 2 * var(--padding-side));overflow:hidden;pointer-events:auto;text-align:start;user-select:text}@media (orientation:landscape){:host>dl{max-width:var(--max-width)}}:host,*{transition:all var(--trans-duration)}dl{--dl-padding-side:1rem;position:relative;flex-grow:1;display:flex;flex-direction:column;align-items:start;padding:0 var(--dl-padding-side);background-color:var(--color-bg);margin:0}:host>dl{position:sticky;top:0;bottom:0;overscroll-behavior:none}dd>dl>*{color:var(--color)}dt[list-flavor=panel]+dd>dl{--border-width:2px;--border-style:solid var(--list-color);--border:var(--border-width) var(--border-style);border:var(--border);border-top:none;border-bottom:0 var(--border-style);border-radius:var(--list-border-radius);margin-block-start:unset;margin-block-end:unset}dt[list-flavor=panel]+dd.expand>dl{border-bottom:var(--border);padding-top:var(--list-padding)}header{font-size:var(--header-font-size);padding:var(--padding-side) 0;margin:0 calc(-2 * var(--padding-side));background-color:var(--header-background-color);box-shadow:0 2px 4px 1px var(--header-box-shadow-color);pointer-events:none;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}header::before,header::after{cursor:pointer;pointer-events:auto}header::before{display:inline-block;content:var(--sym-back);padding:0 var(--sym-gap);margin-right:calc(1.2 * var(--sym-gap))}:host>dl>header{background-color:unset;box-shadow:none;margin-left:unset}:host>dl>header::before{content:none}:host>dl>header::after{content:var(--sym-x);float:inline-end;margin-left:var(--sym-gap)}dl>[list-container]{width:100%;--height:100% - 2 * var(--padding-side) - 2 * var(--margin-side);height:calc(var(--height));padding-top:calc(var(--padding-side) + var(--margin-side));overflow-y:auto;overflow-x:hidden}:host>dl>[list-container]{overscroll-behavior:none}dl>[list-container][list-style=compact]{height:unset;padding-top:unset;--items-dividing-line:none}dt[list-flavor=flex]+dd>dl>[list-container]{display:flex;justify-content:space-around;height:unset;padding-top:unset;flex-wrap:wrap;gap:1rem 0rem}dt[list-flavor=grid]+dd>dl>[list-container]{width:unset;padding:var(--padding-side);padding-top:calc(2 * var(--padding-side))}dt[list-flavor=panel]+dd>dl>[list-container]{padding-top:unset;overflow:hidden}dt[list-flavor=choose]+dd>dl>[list-container]{--items-dividing-line:none;--checkmark-width:1.75rem;padding-left:var(--checkmark-width)}dt[list-flavor=sub-flat]+dd>dl>[list-container]>dd>dl.slide-in-vertically>[list-container]{height:calc(var(--height) - var(--padding-top) - 1.2ex)}dt{display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:var(--dt-font-size)}dt:empty{display:none}dt:not(:first-child){margin-top:var(--margin-side)}[list-container].no-dividing-line>dd{margin-top:calc(var(--margin-side) / 2)}[list-container]>[group]>dt{padding-top:unset;border-top:unset}dt[end],dt[as-placeholder]{cursor:default}dt[list-flavor=panel]{--panel-text-padding:calc(2 * var(--list-padding));position:relative;padding-top:var(--list-padding);border-top:unset;text-indent:var(--panel-text-padding);border-radius:var(--list-border-radius) var(--list-border-radius) 0 0;background-color:var(--list-color)}dt[list-flavor=panel]:not(:first-child)::before{content:'';width:100%;height:1px;background-color:var(--dividing-line-color);position:absolute;top:calc(-1 * var(--margin-side))}dt[list-flavor=panel]::after{content:var(--sym-left);transform:rotate(-90deg);transform-origin:75% center;transition-duration:inherit;position:absolute;right:calc(1.2 * var(--panel-text-padding));line-height:0}dt[list-flavor=panel].dd-expanded::after{transform:rotate(90deg)}dt[list-flavor=panel]+dd>dl>[list-container]>dt[list-flavor=panel]{margin-top:var(--margin-side)}dt[list-flavor=flex]{cursor:default}dt[list-flavor=flex]+dd>dl>[list-container]>dt{margin:0 var(--margin-side);width:unset;cursor:pointer;padding-top:unset;border-top:unset;flex-grow:1;pointer-events:none}dt[list-flavor=flex]+dd>dl>[list-container]>dt[end]{justify-content:center}dt[list-flavor=flex]+dd>dl>[list-container]>dt>*{pointer-events:auto}dt[list-flavor=flex]+dd{line-height:unset}dt[list-flavor=choose]+dd>dl>[list-container]>dt{justify-content:unset;cursor:pointer}dt[list-flavor=choose]+dd>dl>[list-container]>dt:not(:first-child){margin:calc(var(--margin-side) * 1.5) 0}dt[list-flavor=choose]+dd>dl>[list-container]>dt>.default-checkmark{position:relative;left:calc(-1 * var(--checkmark-width));width:var(--checkmark-width);margin-right:calc(-1 * var(--checkmark-width));line-height:1rem}dt[list-flavor=sub-flat]{--size:1rem;cursor:default;border-top:1px rgba(128,128,128,0.75) solid;font-size:var(--size);color:var(--color-gray);opacity:0.85;padding-top:calc(var(--size) / 2)}dt[list-flavor=sub-flat]:first-of-type{border-top:unset;padding-top:unset}dt[list-flavor=sub-flat]+dd{border-bottom:none}dt[list-flavor=sub-flat]+dd>dl,dt[list-flavor=sub-flat]+dd>dl>[list-container]{padding:unset}dt *{font-size:inherit}[dt-icon-wrapper]{display:inline-grid;place-items:center;width:1.5rem;margin:var(--sym-margin)}dt[list-flavor=panel]>*{pointer-events:none}dd{margin:var(--margin-side) 0;color:var(--color-gray);font-size:0.875rem;line-height:1.25rem;letter-spacing:0.2px;overflow:clip}dd:not(:last-child){border-bottom:var(--items-dividing-line)}dt[list-flavor=sub-flat]+dd>dl>[list-container]>dd:empty{border-bottom:unset}dd.no-dividing-line,[list-container].no-dividing-line>dd:not(.dividing-line){border-bottom:unset}[list-container].no-dividing-line.dd-h1>dd:not(.dividing-line){height:1px}dd+.dividing-line{border-top:var(--items-dividing-line);margin-bottom:calc(2 * var(--padding-side));pointer-events:none}[list-container].no-dividing-line>dd+.dividing-line{margin-bottom:var(--padding-side)}dt[end]+dd:not(:last-child,:empty){padding-bottom:var(--padding-side)}@supports not (overflow:clip){dd{--margin-side:calc(var(--margin-side-base) / 2);overflow:hidden;padding-bottom:var(--margin-side)}dt:not(:first-child){padding-top:var(--margin-side-base)}dd+dt{padding-top:unset !important}}dt:empty+dd{margin-top:calc(-1 * var(--margin-side));margin-bottom:calc(-0.5 * var(--margin-side))}dt[list-flavor=panel]+dd{background-color:var(--list-color);border-radius:0 0 var(--list-border-radius) var(--list-border-radius);margin-top:unset;margin-bottom:calc(var(--list-padding) + var(--margin-side));padding-top:unset;padding-bottom:var(--list-padding);border-bottom:var(--items-dividing-line)}dt[list-flavor=panel]+dd.expand{padding-top:calc(var(--margin-side) / 2);padding-bottom:unset}dd>*{--margin-refine:1rem}dd>:not(a){display:block}dd>:last-child{padding-bottom:calc(-1 * var(--margin-refine))}dd>*>[data-brief-desc],dd>*>[data-full-desc]{display:inline-block}dd>*>[data-brief-desc]{cursor:pointer}dd>*>[data-full-desc]{height:0;overflow:hidden;opacity:0}dd>*>[data-full-desc].expand{height:unset;margin:calc(var(--margin-refine) / 2) 0 var(--margin-refine);opacity:unset}[list-container]>[group]{padding-top:var(--margin-side);border-top:var(--group-dividing-line)}.absolute{position:absolute;top:0;bottom:0;left:0;right:0;z-index:1}.collapse{height:0;visibility:hidden}.bounce-in{animation:var(--bounce-in)}@keyframes bounce-in{0%{transform:scale(var(--bounce-in-scale-from,0));opacity:var(--bounce-in-opacity-from,0)}90%{transform:scale(var(--bounce-in-scale-mid,1.15));opacity:var(--bounce-in-opacity-mid,1)}100%{transform:scale(1)}}.bounce-in-half{animation:var(--bounce-in-half)}@keyframes bounce-in-half{0%{transform:scale(var(--bounce-in-half-scale-from,0));opacity:var(--bounce-in-half-opacity-from,0)}50%{transform:scale(var(--bounce-in-half-scale-mid,1.15));opacity:var(--bounce-in-half-opacity-mid,1)}100%{transform:scale(1)}}.card-list{--per-row:5;--card-width:calc(var(--max-width) / var(--per-row));--card-gap:calc(var(--padding-side) + var(--list-box-shadow-blur-radius) + var(--list-box-shadow-spread-radius));display:grid;gap:var(--card-gap);grid-template-columns:repeat(auto-fit,minmax(var(--card-width),1fr));align-content:start}.card{height:max-content;padding:var(--padding-side);cursor:pointer;transition:all var(--trans-duration);border:1px solid hsla(0,0%,100%,0.5)}.card.raw{border:1px solid currentColor}.card:not(.raw){box-shadow:0 0.075rem var(--list-box-shadow-blur-radius) var(--list-box-shadow-spread-radius) currentColor;border-radius:var(--list-border-radius)}.card:not(.raw).pointing::after{transform:translate(-150%,100%)}.card:not(.raw).pointing:hover::after{transform:translate(-50%,100%)}.card:not(.raw):hover{box-shadow:0 0.15rem var(--list-box-shadow-blur-radius) calc(0.9 * var(--list-box-shadow-spread-radius)) currentColor}.card.bounce-in-half{--trans-duration-card-back:0.4s;--bounce-in-half-scale-from:1;--bounce-in-half-opacity-from:0.01;--bounce-in-half-scale-mid:1.08;--bounce-in-half-opacity-mid:0.5;animation:bounce-in-half var(--trans-duration-card-back)}.card>dd{margin:unset;cursor:initial;pointer-events:none;padding-bottom:0}.card.pointing>dd>dl>[list-container]{height:unset;min-height:100%}dl.invisible>.card-list>.card{position:unset}dl.invisible>.card-list>.card.pointing::after{display:none}.card>dd>dl.slide-back-vertically{animation:slide-back-vertically-card var(--trans-duration-card-back)}@keyframes slide-back-vertically-card{from{transform:translateY(var(--slide-in));opacity:0.88}to{transform:translateY(0);opacity:0.12}}.card>dd>dl.slide-back-vertically>header{font-size:var(--dt-font-size);padding-left:var(--padding-side)}.card>dd>dl.slide-back-vertically>header::before{content:none}.card>dd>dl.slide-back-vertically>[list-container]{display:none}.hide{display:none}.pointing{position:relative}.pointing::after{content:'❯';position:absolute;top:0;right:0;transform:translateX(-50%);transition:all var(--trans-duration)}.pointing:hover::after{transform:translateX(3%)}.pointing:active::after{opacity:0;visibility:hidden}.visible{visibility:visible;pointer-events:all}.invisible{visibility:hidden;pointer-events:none}.slide-in{transform:translateX(var(--slide-in))}.slide-back{transform:translateX(var(--slide-back));opacity:0}.next-in{transform:translateX(var(--slide-back));transition-delay:var(--trans-delay);opacity:unset;z-index:2}.prev-back{transition-delay:var(--trans-delay)}.slide-in-vertically{position:fixed;animation:slide-in-vertically var(--trans-duration) forwards;min-height:100vh}@keyframes slide-in-vertically{from{transform:translateY(var(--slide-back));opacity:0}to{transform:translateY(0);opacity:1}}.slide-back-vertically{animation:slide-back-vertically var(--trans-duration) forwards}@keyframes slide-back-vertically{from{transform:translateY(0);opacity:1}to{transform:translateY(var(--slide-back));opacity:0}}.next-in-vertically{transform:translateY(var(--slide-back))}.prev-dusky{animation:prev-dusky var(--trans-duration)}@keyframes prev-dusky{to{background-color:var(--dusky-color)}}.prev-dusky-back{pointer-events:none;animation:prev-dusky-back var(--trans-duration)}@keyframes prev-dusky-back{from{background-color:var(--dusky-color)}to{background-color:unset}}a{text-decoration:none;color:var(--link-color,dodgerblue)}.code-font{font-family:var(--code-font-family)}img.icon,img[icon]{width:2ch;max-height:2ch;margin-top:-0.25ch;margin-right:0.95ch;vertical-align:middle;object-fit:scale-down}input{color:var(--color);background-color:transparent;border:thin solid transparent;border-bottom-color:var(--color-pink);outline:none}input:focus{border-color:var(--color-pink)}input[type=checkbox]{--scale:scale(2);transform:var(--scale);vertical-align:middle;margin:1ex var(--padding-side);cursor:pointer}input.two-digits{width:2ch;text-align:right}label.flex,label[flex]{width:100%}label.flex>input[type=checkbox],label[flex]>input[type=checkbox]{transform:var(--scale) translateY(25%);float:right}select{border:none;outline:none;color:inherit;background-color:var(--color-bg);cursor:pointer;min-width:2rem}dt>select{max-width:50%;text-align:right}[replace-select-arrow]{appearance:none;--arrow-padding:calc(4 * var(--list-padding));padding-right:var(--arrow-padding)}[replace-select-arrow]::after{content:var(--sym-down-thin);pointer-events:none;margin-left:calc(-1 * var(--arrow-padding))}ul[less-indent]{padding-left:1rem}.flash{animation:flash 125ms linear 4 alternate}@keyframes flash{to{background:hsla(0,0%,60%,60%)}}.larger,[larger]{font-size:larger}.outline{--outline:currentColor var(--outline-width) solid;--outline-width:2px;--outline-offset:2px;outline:var(--outline);outline-offset:var(--outline-offset);margin:calc(var(--outline-width) + var(--outline-offset))}.outline-blink{animation:1s outline-blink 3 forwards}@keyframes outline-blink{from{outline-width:0}to{outline-width:var(--outline-width)}}.pink{color:var(--color-pink)}[sml]{font-size:smaller}.underline{text-decoration:underline}.underline-blink{animation:1s underline-blink 3 forwards}@keyframes underline-blink{from{text-decoration-thickness:0}to{text-decoration-thickness:0.08rem}}</style>
    </template>`
      const templateName = 'i-🎿'
      class SliMen extends HTMLElement {
        constructor(config) {
          if (!(config && config.constructor === Object)) return null
          super(config)
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById(templateName).content.cloneNode(true))
          if (config.slideDir) this.style.cssText += `--slide-dir: ${config.slideDir}`
          this.addEventListener('create', e => {
            if (!(this.idValues && this.idValues[Symbol.toStringTag] === 'Map')) return
            e.detail.dl.querySelectorAll('[id]').forEach(el => {
              if (!this.idValues.has(el.id)) return
              el.value = this.idValues.get(el.id)
              this.idValues.delete(el.id)
            })
          })
          this.shadowRoot.append(genMenu(config))
          this.firstDl = this.shadowRoot.querySelector('dl')
          this.firstDl.addEventListener('click', e =>
            e.target.classList.contains('card') && e.target.querySelector('dt').click()
          )
          this.shadowRoot.querySelector('header').addEventListener('click', () =>
            this.dispatchEvent(new CustomEvent('close', {
              bubbles: true, cancelable: true, composed: true
            }))
          )
        }
        connectedCallback() {
          SliMen.cssDelay = cssDelay = { animationDuration: getTransTotalTime.call(this), frameInterval: 20 }
          if (window.isChrome && 89 <= window.ChromeVersion && window.ChromeVersion <= 129) {
            this.firstDl.addEventListener('pointerenter', () => {
              requestAnimationFrame(() => {
                this.firstDl.style.top =
                  `calc(${Math.abs(this.firstDl.getBoundingClientRect().top)}px + var(--padding-top))`
                requestAnimationFrame(() => this.firstDl.style.top = '')
              })
            }, { once: true })
          }
        }
        goHome() {
          goHome(this.shadowRoot.querySelector('header'))
          return new Promise(done => setTimeout(done, cssDelay.animationDuration))
        }
        static appendd(listContainer, items) {
          if (!Array.isArray(items)) items = [items]
          const dl = listContainer.closest('dl')
          const menuStruct = dl.dataItem
          const dtDds = items.flatMap(item => genDtDd(item, menuStruct))
          listContainer.append(...dtDds)
          addListenerBasedOnNonDerivedFlavor(dl, menuStruct.flavor, { dts: dtDds.filter(d => d.localName === 'dt') })
          return dtDds
        }
        static iterEach(list, fn) {
          Array.isArray(list) && list.forEach(item => (fn(item), SliMen.iterEach(item.list, fn)))
        }
        static setwrapWithSpan(list) {
          SliMen.iterEach(list, item => item.wrapWithSpan = true)
        }
        static detect = {
          intrPage: item => item.list && item.list.length === 1 && item.list[0].def && !item.list[0].term
        }
        static eval = {
          string: item => typeof item.def === 'string' && (item.def = item.def.replace(/\$\{([^}]+)\}/g, (_, $) => eval($)))
        }
      }
      customElements.define(templateName, window.SliMen = SliMen)
      let cssDelay
      function genMenu(menuStruct, dt, dd) {
        if (!(menuStruct && menuStruct.constructor === Object)) return
        if (dt) {
          if (dt._generating) return
          dt._generating = true
        }
        const dl = document.createElement('dl')
        const header = genHeader(dt, menuStruct.title || menuStruct.term || '')
        const listContainer = genListContainer(menuStruct.list)
        genDtDds(menuStruct, listContainer)
        dl.append(header, listContainer)
        checkListFlavor(dt, { header, listContainer })
        dd = dd || dt && dt.nextElementSibling && dt.nextElementSibling.localName === 'dd' && dt.nextElementSibling
        if (dd) {
          dd.append(dl)
          Array.isArray(dd._listening) && dd._listening.includes('generate') && dd.dispatchEvent(
            new CustomEvent('generate', { detail: { dl, listContainer } })
          )
        }
        const cbElems = { dt, dd, dl, header, listContainer }
        addCustomProps(menuStruct.props, cbElems)
        const cbMark = 'init callback cb function func fn'.split(' ').find(v => menuStruct.hasOwnProperty(v))
        callCustomFunc(menuStruct[cbMark], cbElems, menuStruct)
        applyCustomStyles(menuStruct, cbElems)
        addListenerBasedOnNonDerivedFlavor(dl, menuStruct.listFlavor)
        dl.dataItem = menuStruct
        dt && ['_generating', 'dataItem'].forEach(k => delete dt[k])
        dl._activateClass = activateClass
        return dl
      }
      function genDl(dt) {
        if (dt._dl) return dt._dl
        dt._dl = genMenu(dt._nextOrigin, dt)
        if (dt._dl) {
          if (isHeaderNone(dt)) dt._dl.querySelector('[list-container]').style.height = 0
          dt.dispatchEvent(
            new CustomEvent('create', { detail: { dl: dt._dl }, composed: true })
          )
          dt._dl.querySelectorAll('dd').forEach(dd => {
            if (dd._dispatchedCreate) return
            dd.dispatchEvent(new CustomEvent('create', { detail: { dt: dd.dt, dd } }))
            dd._dispatchedCreate = true
          })
        }
        return dt._dl
      }
      function attrsNot(elem, attrs) {
        if (typeof attrs === 'string') attrs = attrs.split(' ').map(attr => attr.split('='))
        if (!Array.isArray(attrs)) return
        return attrs.every(([k, v = '']) => v.startsWith('/')
          ? !eval(v).test(elem.getAttribute(k))
          : v ? elem.getAttribute(k) !== v : !elem.hasAttribute(k)
        )
      }
      function genHeader(dt, title) {
        if (isHeaderNone(dt)) return ''
        const header = document.createElement('header')
        header.innerHTML = title
        return header
      }
      function isNotTheFlavor(dt, flavors = '') {
        return dt && dt.hasAttribute('list-flavor') && attrsNot(dt, `list-flavor=${flavors}`)
      }
      function isHeaderNone(dt) {
        return isNotTheFlavor(dt,
          '/^$|page|grid|flex|choose|flat/'
        )
      }
      function genListContainer(listObj) {
        const listContainer = document.createElement('div')
        listContainer.setAttribute('list-container', '')
        if (listObj) addCustomAttrs(listObj.attrs, listContainer)
        listContainer.appendd = appendd
        return listContainer
      }
      function appendd(...lis) {
        return SliMen.appendd(this, lis)
      }
      function genDtDds(menuStruct, listContainer, layerCount = 1) {
        if (!menuStruct.preload && (layerCount > 2 || !Array.isArray(menuStruct.list))) return listContainer
        listContainer.append(...menuStruct.list.map(item =>
          item.constructor !== Object && !Array.isArray(item) ||
            item.hasOwnProperty('offIf') && item.offIf
            ? ''
            : Array.isArray(item)
              ? genDtDds({ list: item }, genGroup(item), ++layerCount)
              : genDtDd(item, menuStruct).concat(item.addDividingLine ? dividingLine.cloneNode() : [])
        ).flat())
        if (typeof menuStruct.filter === 'function') {
          const filteredNodes = Array.prototype.filter.call(listContainer.childNodes, menuStruct.filter)
          removeAllChildren(listContainer)
          listContainer.append(...filteredNodes)
        }
        return listContainer
      }
      const dividingLine = Object.assign(document.createElement('div'), { className: 'dividing-line' })
      function genGroup(groupArr) {
        const group = document.createElement('div')
        group.setAttribute('group', groupArr.group)
        return group
      }
      function genDtDd(item, menuStruct) {
        const [dt, dd] = ['dt', 'dd'].map(tag => document.createElement(tag));
        [[dt, 'term'], [dd, 'def', 'desc']].forEach(([elem, ...desc]) => {
          let type
          const typedD = desc.find(d => {
            if (!item[d]) return
            switch (true) {
              case typeof item[d] === 'string': type = String; break
              case item[d] instanceof Node: type = Node; break
              case typeof item[d][Symbol.iterator] === 'function': type = Array
            }
            return true
          })
          switch (type) {
            default: case String: elem.innerHTML += item[desc.find(dtd => item[dtd])] || ''; break
            case Node: elem.append(item[typedD]); break
            case Array: elem.append(...item[typedD])
          }
        })
        const wrapWithSpan = () => dt.innerHTML = `<span>${dt.innerHTML}</span>`
        if (menuStruct.wrapWithSpan) wrapWithSpan()
        dt.dd = dd
        dt.dataItem = item
        if (item.hasOwnProperty('id')) dt.setAttribute('id', item.id)
        if (item.preload) dt._preload = item.preloaded = delete item.preload
        dd.dt = dt
        if (item.icon) {
          const iconWrapper = document.createElement('span')
          iconWrapper.setAttribute('dt-icon-wrapper', '')
          iconWrapper.append(item.icon)
          const dtHeader = document.createElement('span')
          dtHeader.append(iconWrapper, ...dt.childNodes)
          dt.prepend(dtHeader)
        }
        if (item.indicator) {
          item.indicator instanceof HTMLElement
            ? dt.append(item.indicator)
            : dt.innerHTML += item.indicator
          dt.indicator = dt.lastElementChild
        }
        let list = item.list, listFlavor
        if (list) {
          if (!(Array.isArray(list) && list.length)) {
            list = []
            dt.setAttribute('as-placeholder', '')
          }
          dt._nextOrigin = item
          listFlavor = [list, item, menuStruct.list, menuStruct].find(v => v && v.listFlavor)
          if (listFlavor) {
            listFlavor = listFlavor.listFlavor
            if ([listFlavor, menuStruct.listFlavor].every(_ => _ === 'flat')) listFlavor = `sub-${listFlavor}`
          }
          listFlavor && dt.setAttribute('list-flavor', listFlavor)
          list.some(list => Array.isArray(list.list) && list.list.length) && dt.setAttribute('data-more-list', '')
        } else {
          dt.setAttribute('end', '')
          if (!dt.childElementCount && (
            !menuStruct.hasOwnProperty('wrapWithSpan') || menuStruct.wrapWithSpan === undefined || menuStruct.wrapWithSpan
          )) wrapWithSpan()
        }
        addCustomAttrs(item.attrs, dt)
        addListeners(dt, item, 'listener')
        addListeners(dd, item, 'listenToDesc')
        const briefDesc = dd.querySelector('[data-brief-desc]')
        if (briefDesc) {
          const fullDesc = dd.querySelector('[data-full-desc]')
          if (fullDesc) {
            fullDesc.style.height = 0
            briefDesc.addEventListener('click', collapseOrExpand.bind(fullDesc, { infoElem: fullDesc }))
          }
        }
        if (dt.childElementCount <= 1 &&
          !menuStruct.isTop &&
          attrsNot(dt, 'list-flavor=/flex|panel|sub-flat/ end as-placeholder')
        ) dt.classList.add('pointing')
        if (isObj(item.props)) addCustomProps(item.props, { dt, dd })
        if (listFlavor === 'sub-flat') genMenu(item, dt, dd)
        if (item.listener) dt.dispatchEvent(new CustomEvent('generate', { detail: { dt, dd } }))
        return [dt, dd]
      }
      function addListeners(elem, item, listenerTag = '') {
        ['', 's'].map(_ => `${listenerTag}${_}`).forEach(tag => {
          if (
            typeof item[tag] === 'function'
            || Array.isArray(item[tag]) &&
            typeof item[tag][0] === 'string'
          )
            item[listenerTag] = [item[tag]]
          if (!Array.isArray(item[tag])) return
          elem._listening = []
          item[tag].forEach(listener => {
            if (Array.isArray(listener)) {
              elem.addEventListener(...listener)
              elem._listening.push(listener[0])
            }
            else if (typeof listener === 'function')
              elem.addEventListener('click', listener)
          })
        })
      }
      function checkListFlavor(dt, { listContainer, header } = {}) {
        if (!dt || !listContainer) return
        switch (dt.getAttribute('list-flavor')) {
          case 'flex':
            header.remove()
            listContainer.childNodes.forEach(v => v.localName !== 'dt' && v.remove())
            listCollapseOrExpand(dt, { forceExpand: true, height: '' })
            break
          case 'grid':
            listContainer.classList.add('card-list')
            listContainer.querySelectorAll('dt').forEach(dt => listContainer.append(combineDtDd(dt)))
            break
          case 'choose':
            listContainer.addEventListener('choose', function _choose(e) {
              choose(e, listContainer)
            }, true)
            break
          case 'sub-flat':
            header.remove()
            break
        }
      }
      function combineDtDd(dt) {
        const dDiv = document.createElement('div')
        dDiv.classList.add('card')
        dDiv.append(dt, dt.dd || '')
        if (dt.dd && dt.dd.childNodes.length) {
          dt.classList.remove('pointing')
          !dt.classList.length && dt.removeAttribute('class')
          dDiv.classList.add('pointing')
        }
        return dDiv
      }
      function addCustomProps(propsTable, cbElems) {
        if (!isObj(propsTable)) return
        Object.entries(propsTable).forEach(([localName, props]) => {
          if (!isObj(props) || !cbElems[localName]) return
          Object.entries(props).forEach(([key, prop]) => {
            cbElems[localName][key] = prop
          })
        })
      }
      function addCustomAttrs(attrs, elem) {
        switch (true) {
          case typeof attrs === 'string':
            attrs
              .split(/([^\s=]+(?:=(?:(["'`])(?:\\\2|(?:(?!\2).))*\2|[^"'`\s]+))?)/)
              .filter(v => v && !/^[\s"'`]$/.test(v))
              .forEach(attr => elem.setAttribute(...attr.split('='), ''))
            break
          case isObj(attrs):
            Object.entries(attrs).forEach(([k, v]) => elem.setAttribute(k, v))
            break
        }
      }
      function callCustomFunc(func, cbArgs, _this) {
        typeof func === 'function' && func.call(_this, cbArgs)
      }
      function applyCustomStyles(menuStruct, cbArgs) {
        if (menuStruct.hasOwnProperty('style') && menuStruct.style.constructor === Object) {
          let styles
          Object.entries(cbArgs).forEach(([name, elem]) => {
            if (!(elem && (styles = menuStruct.style[name]))) return
            styles = styles.split(/[;]/)
            styles.forEach(style => style.includes(':')
              ? elem.style.cssText += style
              : elem.className += style
            )
          })
        }
      }
      const defaultClickHandler = { dt: pullNextPage, header: turnBack }
      const clickHandlers = {
        page: defaultClickHandler,
        flex: { dt: e => genDl(e.target) },
        grid: defaultClickHandler,
        panel: { all: listCollapseOrExpand },
        choose: { ...defaultClickHandler, listContainer: choose },
        flat: defaultClickHandler,
        'sub-flat': null,
      }
      window.sel = window.sel || getSelection()
      Object.values(clickHandlers).forEach(
        handlers => handlers && Object.entries(handlers).forEach(
          ([toEl, handler]) => handlers[toEl] = function (e) {
            if (sel.type === 'Range') {
              e.target.localName === 'header' && sel.removeAllRanges()
              e.stopImmediatePropagation()
              return
            }
            handler.call(this, ...arguments)
          }
        )
      )
      const clickHandlerIs = (flavor, elemType) => {
        if (!clickHandlers.hasOwnProperty(flavor)) throw Error(`Unrecognized listFlavor: '${flavor}'.`)
        return clickHandlers[flavor] && (clickHandlers[flavor][elemType] || clickHandlers[flavor].all)
      }
      const listFlavors = Object.keys(clickHandlers)
      const listFlavorIs = (flavor = '') =>
        listFlavors.find(_flavor => flavor.includes(_flavor)) || listFlavors[0]
      function addListenerBasedOnNonDerivedFlavor(dl, explicitFlavor, { dts } = {}) {
        explicitFlavor = listFlavorIs(explicitFlavor)
        if (!(Array.isArray(dts) || dts instanceof NodeList)) {
          const [header, listContainer] = ['header', '[list-container]']
            .map(elemType => dl.querySelector(elemType))
          Object.entries({ header, listContainer }).forEach(([elemType, elem]) => {
            if (!elem) return
            const handler = clickHandlerIs(explicitFlavor, elemType)
            if (!handler) return
            elem.addEventListener('click', handler)
          })
          dts = dl.querySelectorAll('[list-container] dt')
        }
        dts.forEach(dt => {
          if (dt.hasAttribute('end')) return
          ['click', 'preload'].forEach(evt =>
            dt.addEventListener(evt, clickHandlerIs(dt.getAttribute('list-flavor') || explicitFlavor, 'dt'))
          )
          dt._preload && dt.dispatchEvent(new CustomEvent('preload', { detail: { isPreload: true } }))
          delete dt._preload
        })
      }
      let currPage
      function pullNextPage(e) {
        const dt = this !== window ? this : e && e.target
        if (!(dt && genDl(dt)) || dt.getAttribute('as-placeholder') === 'hit') return
        if (dt.hasAttribute('as-placeholder')) dt.setAttribute('as-placeholder', 'hit')
        const [prevPage, nextPage] = [dt.closest('dl'), dt._dl]
        currPage = nextPage
        prevPage.classList.add('invisible')
        prevPage.classList.remove('visible', 'prev-dusky-back')
        nextPage.classList.add('absolute', 'visible')
        nextPage.classList.remove('hide', 'invisible', 'slide-back-vertically')
        nextPage.removeEventListener('animationend', nextPage._onanimationend)
        if (dt.hasAttribute('data-more-list')) {
          nextPage.classList.add('next-in')
          let upDt = dt.closest('dd')
          upDt = upDt && upDt.previousElementSibling
          if (upDt)
            setTimeout(() => nextPage.classList.remove('next-in'), cssDelay.frameInterval)
          else {
            prevPage.classList.add('slide-in')
            cssDelay && setTimeout(() => nextPage.classList.contains('hide') && nextPage._activateClass(), cssDelay.animationDuration)
          }
        }
        else {
          prevPage.classList.add('prev-dusky')
          nextPage.classList.add('slide-in-vertically')
        }
        if (e.detail.isPreload) {
          turnBack({ detail: { isPreload: true }, dt, target: dt.dd.querySelector('header') })
          return
        }
        updateHeightOfSubExpanded(nextPage)
      }
      function turnBack(e) {
        let dt = e.target ? e.target.closest('dd') : e.dt
        if (!dt) return
        if (dt.localName !== 'dt') dt = dt.previousElementSibling
        const [prevPage, nextPage] = [dt.closest('dl'), dt._dl]
        currPage = prevPage
        prevPage.classList.add('visible')
        prevPage.classList.remove('invisible')
        if (dt.hasAttribute('data-more-list')) {
          prevPage.classList.remove('slide-in')
          e.detail.isPreload
            ? setTimeout(nextPage.classList.add('hide'))
            : nextPage.offsetParent && nextPage.offsetParent.closest('.next-in') && nextPage.classList.remove('next-in')
          nextPage.classList.add('slide-back')
        }
        else {
          prevPage.classList.add('prev-dusky-back')
          nextPage.classList.replace('slide-in-vertically', 'slide-back-vertically')
        }
        if (dt.hasAttribute('data-more-list')) {
          !e.detail.isPreload && readdEventListener(prevPage, 'transitionend', e => clearClasses(e, { prevPage, nextPage }))
        }
        else {
          const prevContainer = nextPage.closest('div')
          if (prevContainer.classList.contains('card')) {
            prevContainer.classList.add('bounce-in-half')
            readdEventListener(prevContainer, 'animationend', e => changeBackClasses(e, { prevPage, nextPage, prevContainer }))
          }
          else {
            readdEventListener(nextPage, 'animationend', e => clearClasses(e, { prevPage, nextPage }))
          }
        }
        updateHeightOfSubExpanded(prevPage)
      }
      function clearClasses(e, { prevPage, nextPage }) {
        if (e.animationName && !e.animationName.startsWith('slide-back')) return
        nextPage.querySelectorAll('.reset').forEach(r => r.className = '')
        nextPage.classList.add('hide')
        'absolute visible invisible slide-in-vertically slide-back slide-back-vertically'.split(' ')
          .forEach(v => nextPage.classList.remove(v))
        'prev-dusky prev-dusky-back'.split(' ')
          .forEach(v => prevPage.classList.remove(v))
      }
      function changeBackClasses(e, { prevPage, nextPage, prevContainer }) {
        prevContainer.removeEventListener('animationend', prevContainer._onanimationend)
        prevContainer.classList.remove('bounce-in-half')
        activateClass(prevPage)
        nextPage.className = 'hide'
      }
      function activateClass(elem) {
        elem = elem || this
        elem._activatedClass = elem.className = 'absolute visible' + (elem.offsetParent && elem.offsetParent.closest('.next-in') ? '' : ' next-in')
      }
      function readdEventListener(elem, listenerType, handler, opts = { once: true }) {
        elem.removeEventListener(listenerType, elem[`_on${listenerType}`])
        elem.addEventListener(listenerType, elem[`_on${listenerType}`] = handler, opts)
      }
      function updateHeightOfSubExpanded(elem, layers = []) {
        Array.prototype.forEach.call(elem.children, el => {
          if (el.hasAttribute('height-update-needed')) {
            layers.push(el)
            updateHeightOfSubExpanded(el, layers)
            if (!el.querySelector('[height-update-needed]')) {
              updateStyleHeight(layers.pop())
              layers.length && layers.reverse().forEach((el, i) =>
                setTimeout(() => updateStyleHeight(el), ++i * cssDelay.animationDuration)
              )
            }
            return
          }
          const [isDd, isDt] = ['dd', 'dt'].map(tag => el.localName === tag)
          if (el.classList.contains('expand') && !(isDd && el.dt.getAttribute('list-flavor') === 'panel')) updateStyleHeight(el)
          if (isDd && !el.querySelector('[data-full-desc]')) return
          if (!el.classList.contains('hide')) [el, isDt && el.dd].forEach(el => el && updateHeightOfSubExpanded(el, layers))
        })
      }
      function goHome(breakPoint) {
        let header, _header = currPage.querySelector('header')
        _header && _header.click()
        while (header = currPage.querySelector('header')) {
          if (header === _header || header === breakPoint) break
          _header = header
          header.click()
        }
      }
      window.css_collapseOrExpand = window.css_collapseOrExpand || collapseOrExpand
      function collapseOrExpand(elem, opts = {}) {
        elem = elem || this
        if (!elem || elem === window) return
        if (elem.constructor === Object) [elem, opts] = [this, elem]
        const {
          infoElem = elem, forceExpand, forceCollapse, height,
        } = opts
        elem = elem[Symbol.toStringTag].includes('Event') ? elem.target : elem
        if (elem._innerIsInTransition)
          return elem._pendingUpdateHeight = collapseOrExpand.bind(this, ...arguments)
        else
          delete elem._pendingUpdateHeight
        updateIfConnected()
        function updateIfConnected() {
          elem.isConnected
            ? updateHeight()
            : requestAnimationFrame(updateIfConnected)
        }
        function updateHeight() {
          const shouldCollapse = (forceCollapse || elem.clientHeight) && !forceExpand
          elem.classList[
            parseInt(
              elem.style.height = shouldCollapse
                ? 0 : height !== undefined ? height : `${elem.scrollHeight}px`
            ) === 0
              ? 'add' : 'remove'
          ]('collapse')
          const mod = shouldCollapse ? 'remove' : 'add'
          infoElem.classList[mod]('expand')
          if (infoElem.classList.contains('expand')) {
            infoElem.classList.remove('collapse')
            if (infoElem.style.height === '0px') infoElem.style.height = ''
          }
          infoElem.localName === 'dd' && infoElem.dt && infoElem.dt.classList[mod]('dd-expanded')
          updateHeightOfOuterDd(infoElem, elem)
        }
      }
      function listCollapseOrExpand(e, { forceExpand, height } = {}) {
        const dt = e[Symbol.toStringTag].includes('Event') ? e.target : e
        if (dt.localName !== 'dt') return
        collapseOrExpand(
          genDl(dt) && genDl(dt).querySelector('[list-container]'),
          { infoElem: dt.nextElementSibling, forceExpand, height }
        )
      }
      function updateHeightOfOuterDd(dd, listContainer) {
        if (!dd.dt) return
        dd = dd.dt.closest('dd')
        if (dd.dt.getAttribute('list-flavor') !== 'panel') return
        if (!window.isChromeMobile)
          listContainer.addEventListener('transitionend', () => {
            delete listContainer._innerIsInTransition
            updateStyleHeight(listContainer)
            listContainer._pendingUpdateHeight && setTimeout(
              listContainer._pendingUpdateHeight,
              cssDelay.animationDuration * 0.8
            )
          }, { once: true })
        listContainer = dd.querySelector('[list-container]')
        if (!window.isChromeMobile) listContainer._innerIsInTransition = true
        listContainer.style.height = ''
        updateHeightOfOuterDd(dd, listContainer)
      }
      function choose(e, listContainer) {
        const target = e.composedPath()[0]
        if (!listContainer) listContainer = target.closest('[list-container]')
        if (target.localName !== 'dt' || target.contains(listContainer._checkmark)) return
        if (!listContainer._checkmark) {
          listContainer._checkmark = Object.assign(
            document.createElement('span'),
            { className: 'default-checkmark bounce-in', innerText: '✔️' }
          )
        }
        target.prepend(listContainer._checkmark)
        return target
      }
      function getTransTotalTime() {
        const transTimeRules = ['duration', 'delay'].map(_ => `--trans-${_}`)
        const cssRules = this.shadowRoot.styleSheets[0].rules[0].style
        return transTimeRules.reduce((a, b) =>
          a + parseFloat(cssRules.getPropertyValue(b)), 0
        ) * 1000
      }
      function isObj(arg) {
        return arg && typeof arg === 'object'
      }
      window.removeAllChildren = window.removeAllChildren || removeAllChildren
      function removeAllChildren(node) {
        while (node.firstChild) node.removeChild(node.lastChild)
      }
      function updateStyleHeight(elem) {
        if (!(elem && elem.getBoundingClientRect().height)) return
        elem.style.height = `${elem.scrollHeight}px`
        elem.removeAttribute('height-update-needed')
      }
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🔘'>
    <style>:host{display:inline-flex;contain:content;align-items:center;position:relative;--switch-width:3rem;width:var(--switch-width);--switch-height:1.15rem;height:var(--switch-height);--switch-padding:0.2rem;padding:var(--switch-padding) 0;border-radius:1rem;outline:none;pointer-events:none;--checked-bg:hsl(228,74%,61%)}:host([disabled])>label{--dim-color:rgba(136,138,140,0.5);--dim:linear-gradient(var(--dim-color),var(--dim-color));background:var(--dim)}:host([disabled])>input:checked+label{background:var(--dim),linear-gradient(var(--checked-bg),var(--checked-bg))}:host([disabled])>.marker{background-color:hsla(0,0%,100%,0.5);box-shadow:inset var(--shadow)}:host-context([data-theme='dark']){--checked-bg:hsl(338,83%,63%)}input{height:100%;width:100%;margin:0;opacity:0;z-index:2}label{width:100%;height:100%;color:transparent;user-select:none;--base:hsla(240,10%,70%,0.5);background-color:var(--base);border-radius:inherit;transition:0.15s linear}input:checked+label{background-color:var(--checked-bg)}input,label{position:absolute;left:0;top:0;cursor:pointer}input:checked+label+.marker{left:calc(100% - var(--marker-diam) - var(--switch-padding))}.marker{position:relative;background-color:hsl(0,0%,100%);--marker-diam:var(--switch-height);width:var(--marker-diam);height:var(--marker-diam);border-radius:50%;z-index:2;pointer-events:none;--shadow:0 1px 1px rgba(0,0,0,0.25);box-shadow:var(--shadow);left:var(--switch-padding);transition:left 0.2s cubic-bezier(0.4,0,0.2,1)}</style>
    <input type='checkbox' id='input' aria-labelledby='the-label'><label for='input' id='the-label' aria-hidden='true'></label><div class='marker' aria-hidden='true'></div></template>`
      const $btnName = 'i-🔘'
      customElements.define($btnName, window.SBtn = class SBtn extends HTMLElement {
        static get observedAttributes() {
          return ['checked']
        }
        static get false() {
          return '!!false'
        }
        constructor(initState, { fuse = true, for: forID } = {}) {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById($btnName).content.cloneNode(true))
          this.checkbox = this.shadowRoot.querySelector('input')
          if (initState !== undefined) initState.constructor === Promise
            ? initState.then(res => this.checked = res)
            : this.checked = initState
          if (fuse) this._isFused = true
          if (forID !== undefined) this.setAttribute('for', forID)
        }
        connectedCallback() {
          if (!this._isFused) {
            const styleSheet = this.shadowRoot.styleSheets[0]
            styleSheet.insertRule(':host { pointer-events: unset }', styleSheet.cssRules.length)
          }
          this.addEventListener('click', this._toggleChecked)
          this.shadowRoot.getElementById('the-label').addEventListener('click', e => {
            e.stopImmediatePropagation()
            e.preventDefault()
            this.checkbox.click()
          })
        }
        attributeChangedCallback(name, oldValue, _newValue) {
          if (name === 'checked' && oldValue === SBtn.false) return
          (this.checkbox.checked = this.checked)
            ? this.checkbox.setAttribute('checked', 'true')
            : this.checkbox.removeAttribute('checked')
          ++this.isByClick || (this.isByClick = 1)
          if (this.isByClick !== this.byClick) {
            this.isByClick = this.byClick
            this._toggleChecked()
          }
        }
        set checked(value) {
          value
            ? this.setAttribute('checked', true)
            : (this.setAttribute('checked', SBtn.false),
              this.removeAttribute('checked'))
        }
        get checked() {
          return this.hasAttribute('checked') && this.getAttribute('checked') === 'true'
        }
        _toggleChecked(e) {
          if (this.hasAttribute('disabled')) return e && e.preventDefault()
          if (e) {
            ++this.byClick || (this.byClick = 1)
            this.checked = !this.checked
            SBtn._dispatchEvent(
              this.getRootNode().getElementById(this.getAttribute('for')) || this,
              this
            )
          }
        }
        static _dispatchEvent(elem, _this) {
          elem.dispatchEvent(
            new CustomEvent('check', {
              detail: { checked: _this.checked },
              bubbles: true,
              cancelable: true,
              composed: true
            })
          )
        }
      })
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🖨️'><slot id='slot'></slot>
    <style name='style'>:host{display:inline-flex;text-align:left;font-size:inherit !important;--font-family:Consolas,Monaco,monospace}slot{display:inline-block;font-family:var(--font-family);white-space:nowrap;overflow:hidden}:host(.typing){--s:0}@keyframes typing{from{width:0}}</style>
    </template>`
      const nonNormalKey = /[^-\w\s`~!@#$%^&*()=\\+|[\]{};':",./<>?]/g
      customElements.define('i-🖨️', window.TypeText = class TypeText extends HTMLElement {
        constructor(text, opts) {
          super()
          if (typeof text === 'string') this.textContent = text
          opts && assign_props(this, opts)
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById('i-🖨️').content.cloneNode(true))
          this._slot = this.shadowRoot.getElementById('slot')
        }
        connectedCallback() {
          this._start = TypeText.start.bind(this)
          this._wait = this._wait || this.hasAttribute('wait')
          if (this._wait) {
            this._setTimeout = Number(this._setTimeout || this.getAttribute('setTimeout'))
            this._setTimeout && setTimeout(this._start(), this._setTimeout * 1000)
            return
          }
          this._start()
        }
        static start() {
          TypeText.updateAttrs.call(this)
          this.addEventListener('animationend', TypeText.checkUpdateOnEnd.bind(this, 'animationend'))
          TypeText.observe(this)
        }
        static updateAttrs() {
          this._nonNormalKeyCharWidthFactor = this._nonNormalKeyCharWidthFactor || this.getAttribute('char-width-factor') || 1 / devicePixelRatio + 0.025
          const textLen =
            this.textContent.trim().replace(/[\r\n]/g, '').replace(/ {2,}/g, ' ').length +
            (this.textContent.match(nonNormalKey) || []).length * this._nonNormalKeyCharWidthFactor
          const isDelMode = [this._mode, this.getAttribute('mode')].includes('del')
          'onend onstop'.split(' ').forEach(on => this[`_${on}`] = this[`_${on}`] || this.getAttribute(on))
          this._times = Number(this._times || this.getAttribute('times') || (this._onend ? 1 : Infinity))
          this._charWidth = Number(this._charWidth || this.getAttribute('char-width')) || (/[^\x00-\x7F]/.test(this.textContent) ? 2 : 1)
          const attrs = {
            time: this._time || this.getAttribute(['t', 'time'].find(name => this.hasAttribute(name))) || textLen / 2.5,
            speed: this._speed || parseFloat(this.getAttribute('speed')),
            delay: isDelMode ? this._delay || parseFloat(this.getAttribute('delay')) || 1 : 0,
            steps: Math.round(textLen / this._charWidth) + 1
          }
          attrs.duration = attrs.speed ? textLen / attrs.speed : attrs.time
          assign_props(this, attrs)
          const cssRules = {
            ':host': {
              width: `${textLen - Math.floor(this.textContent.replace(/[\x00-\x7F]+/g, '').length / this._charWidth)}ch`
            },
            ':host(.typing)': {
              animation: `typing ${attrs.duration}s steps(${attrs.steps}, jump-none) ${attrs.delay}s ${isDelMode ? 'reverse' : ''} forwards  `
            }
          }
          this._onstyle = this._onstyle || this.getAttribute('on-style')
          if (this._onstyle) {
            this._onstart = `this.style.cssText += '${this._onstyle}'`
            this._onstop = `this.style.cssText += '${this._onstyle.split(';').map(styleProp => `${styleProp.split(':')[0]}: unset`)}'`
          }
          ['onstart', 'onstop'].forEach((on, i, arr) => {
            this[`_${on}`] = this[`_${on}`] || this.getAttribute(on)
            if (!this[`_${on}`]) return
            if (on === 'onstart' && this._started) return
            if (on === 'onstop' && !this._stopped) return
            this[`_${on}delay`] = Number(this[`_${on}delay`] || this.getAttribute(`${on}delay`) || -1 * this[`_${arr[i - 1] && arr[i - 1]}delay`])
            setTimeout(
              () => eval(this[`_${on}`]),
              (this._delay + (!i ? 0 : this._duration * (this._steps - 1) / this._steps) + this[`_${on}delay`]) * 1000
            )
          })
          replaceCSSRules(this.shadowRoot, cssRules)
          restartAnimation(this, 'typing')
          this._started = true
        }
        static checkUpdateOnEnd(on) {
          if (on === 'animationend') {
            this._loopedCount ? this._loopedCount += 1 : this._loopedCount = 1
            this._iterationCount ? this._iterationCount += 1 : this._iterationCount = 1
            replaceCSSRules(this.shadowRoot, { ':host': { width: '' } })
          }
          if (this._iterationCount > this._times) {
            if (this.scrollWidth - document.documentElement.clientWidth > 0 ||
              (document.documentElement.clientWidth - this.scrollWidth) / document.documentElement.clientWidth < 0.025
            ) {
              this.style.cssText += 'display: unset'
              const text = this.textContent.trim();
              [[0, 'left'], [text.length - 1, 'right']].forEach(([idx, side]) => {
                nonNormalKey.test(text[idx]) && (this.style.cssText += `margin-${side}: -1ch`)
              })
              this._slot.style.cssText += 'display: unset; white-space: unset'
            }
          }
          else {
            if (this.hasAttribute('alternate')) {
              this._delay = '0'
              const prevIsDel = this.getAttribute('mode') === 'del'
              if (prevIsDel) {
                if (!this.scrollWidth) {
                  this.style.width = 0
                  this.addEventListener('animationstart', () => {
                    this.style.width = ''
                  }, { once: true })
                }
              }
              this.setAttribute('mode', prevIsDel ? '' : 'del')
            }
            if (this._iterationCount === this._times) {
              if (this._onend) {
                this._stopped = true
                eval(this._onend)
                this.style.visibility = 'hidden'
                this.addEventListener('animationstart', () => {
                  this.style.visibility = ''
                }, { once: true })
              }
            }
            else {
              TypeText.updateAttrs.call(this)
            }
          }
        }
        static mutationObserver = Object.assign(new MutationObserver(muts => {
          muts.forEach(mut => {
            switch (mut.type) {
              case 'characterData':
                if (mut.oldValue === mut.target.textContent) return
                TypeText.updateAttrs.call(mut.target.parentNode)
                break
              case 'childList':
                if (mut.addedNodes[0].textContent === mut.removedNodes[0].textContent) return
                TypeText.updateAttrs.call(mut.target)
                break
              case 'attributes':
                this.checkUpdateOnEnd.call(mut.target)
                break
            }
          })
        }), { init: { characterDataOldValue: true, characterData: true, childList: true, subtree: true, attributeFilter: 'onend speed'.split(' ') } })
        static observe(elem) {
          this.mutationObserver.observe(elem, this.mutationObserver.init)
        }
      })
      function replaceCSSRules(node, cssRules) {
        if (!(node = selectTheNode(node, this)) || !node.styleSheets.length) return
        Object.entries(cssRules).forEach(
          ([ruleName, rule]) =>
            Object.entries(rule).forEach(
              function ([k, v]) { this[k] = v },
              [...node.styleSheets[0].cssRules]
                .find(rule => rule.selectorText === ruleName).style
            )
        )
      }
      function restartAnimation(elem, animationName, { sideFn } = {}) {
        if (!(elem = selectTheNode(elem, this))) return
        if (typeof sideFn === 'function') sideFn()
        requestAnimationFrame(() => {
          elem.classList.remove(animationName)
          requestAnimationFrame(() => {
            elem.classList.add(animationName)
          })
        })
      }
      function selectTheNode(node, _this) {
        if (!node) node = _this || this
        if (!(node instanceof Node)) return
        return node
      }
      function assign_props(to, from) {
        Object.keys(from).forEach(key => to[`_${key}`] = from[key])
      }
    })();
    (() => {
      genHTMLComp().outerHTML = `<template id='i-🎞️'>
    <style name='style'>:host{--i-🍫-height:0.25rem}:host{display:flex;flex-direction:column;position:relative;align-items:center;cursor:default;place-self:center;overflow-x:hidden;overflow-x:clip}:host:fullscreen{outline:none}video{display:block;min-width:var(--video-width,60vw);max-width:100vw;max-height:100vh}@media (orientation:portrait){video{min-width:100vw}}:host-context(.mask) video{filter:opacity(0.03)}:host(.mask) video{filter:opacity(0.03)}:fullscreen video{min-width:100vw;min-height:100vh}.fadeout{animation:fadeout 0.2s forwards}@keyframes fadeout{from{opacity:1}to{opacity:0;visibility:hidden}}.fadein{animation:fadein 0.15s forwards}@keyframes fadein{from{opacity:0}to{opacity:1}}.semi-fadein{animation:semi-fadein 0.15s forwards}@keyframes semi-fadein{from{opacity:0.6}to{opacity:1}}.closer>*{padding:0}.selected{color:palevioletred !important}#videoContainer{display:grid;position:relative;justify-items:center}#progressBar{width:100%;height:var(--i-🍫-height);background:rgb(90,90,90);border-radius:0.15rem;border-top-left-radius:unset;border-top-right-radius:unset;overflow:hidden}#progressBar>div{width:0;height:100%}#buffered{background-color:rgb(150,150,150)}#progress{background-color:rgb(0,182,240);transform:translateY(-100%)}#controls{display:grid;grid-template-columns:1fr;grid-template-rows:repeat(2,1fr);gap:15%;grid-template-areas:'seek''playbackRate';align-items:flex-start;position:absolute}#controls button{border:none;background:transparent;font-size:100%;outline:none}#controls button:hover{filter:brightness(1.5)}#controls button:active{transform:scale(0.9)}#seek{display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:1fr;gap:0.2rem;grid-template-areas:'seekBackward seekForward';grid-area:seek;justify-content:center}#seekBackward{grid-area:seekBackward;justify-self:end}#seekForward{grid-area:seekForward;justify-self:start}#playbackRate{display:grid;grid-template-columns:2.3fr repeat(2,1fr);grid-template-rows:1fr;gap:0 5%;grid-template-areas:'x0_5 x1 x2';grid-area:playbackRate;justify-content:center}#playbackRate>[data-x='0.5']{grid-area:x0_5}#playbackRate>[data-x='1']{grid-area:x1}#playbackRate>[data-x='2']{grid-area:x2}#playbackRate>button{color:white}#playbackRate>button::before{content:attr(data-x) '×';background-color:rgba(0,0,0,0.8);padding:0 0.15rem}#mBtn{position:absolute;color:whitesmoke;mix-blend-mode:exclusion;right:0;padding:0.3rem 0.8rem 0.2rem;font-weight:bold;cursor:pointer;user-select:none;z-index:2}#menu{position:absolute;right:0;height:calc(100% - var(--i-🍫-height));background-color:var(--color-bg);transform:translateX(100%);transition:0.3s;z-index:1}#menu.show{box-shadow:currentColor -0.2rem 0 0.3rem -0.2rem;transform:translateX(0);transition:0.2s}.hide{display:none !important}</style>
    <div id='videoContainer'><video id='video'></video><div id='progressBar'><div id='buffered'></div><div id='progress'></div></div><div id='controls' class='hide' draggable='true'><div id='seek'><button id='seekBackward'>⏪</button><button id='seekForward'>⏩</button></div><div id='playbackRate'><button data-x='0.5'></button><button data-x='1'></button><button data-x='2'></button></div></div><div id='menu'></div><div id='mBtn' class='hide'>︙</div></div></template>`
      const vido = new IntersectionObserver(
        ([interEntry]) =>
          interEntry.isIntersecting ||
          interEntry.target.pause()
      )
      const vidp = []
      Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
        get: function () {
          return this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2
        }
      })
      !Object.getOwnPropertyDescriptor(Array.prototype, 'last')
        && Object.defineProperty(Array.prototype, 'last', {
          get() { return this[this.length - 1] }
        })
      customElements.define('i-🎞️', window.VidSet = class extends HTMLElement {
        constructor({ preset = {} } = {}) {
          super()
          this.attachShadow({ mode: 'open', delegatesFocus: true })
            .appendChild(document.getElementById('i-🎞️').content.cloneNode(true))
          this.video = this.shadowRoot.getElementById('video')
          this.video.append(...this.querySelectorAll('source, [slot=source]'))
          if (preset && (typeof preset === 'string' ? preset === 'attrs' : preset.attrs)
            || this.hasAttribute('i-🎞️-preset')
          ) {
            if (preset === 'attrs' || preset.attrs === true || this.hasAttribute('i-🎞️-preset')) {
              this.removeAttribute('i-🎞️-preset')
              'preload=metadata playsinline controls muted autoplay'.split(' ')
                .forEach(attr => this.setAttribute(...attr.split('='), ''))
            } else if (Array.isArray(preset.attrs)) {
              preset.attrs.forEach(attr => this.setAttribute(attr, ''))
            }
          }
          [...this.attributes].forEach(attr => {
            if (attr.name === 'class') return
            this.video.setAttribute(attr.name, attr.value)
            this.removeAttribute(attr.name)
          })
          this.video.addEventListener('progress', e => {
            this.dispatchEvent(new CustomEvent('sourced', {
              detail: {
                srcElem: Array.prototype.find.call(e.target.children, v => v.localName === 'source'),
                src: e.target.currentSrc
              }
            }))
            this.video.hasAttribute('muted') && (this.video.muted = true)
          }, { once: true })
          this.video.addEventListener('error', function (e) {
            if (e.target.localName !== 'source') return
            e.target.remove()
            this.networkState === HTMLMediaElement.NETWORK_NO_SOURCE &&
              this.dispatchEvent(new CustomEvent('no source', { composed: true }))
          }, true)
        }
        attributeChangedCallback(name, _oldValue, newValue) {
          if (newValue === null) return
          this.removeAttribute(name)
          this.video.setAttribute(name, newValue);
          (this.video.vidSrc || (this.video.vidSrc = {}))[name.replace(/data-(src|video)-/, '')] = newValue
        }
        static get observedAttributes() {
          if (!Array.prototype.flatMap) return
          const srcMark = ['src', 'video']
          const observedAttributes = 'low, med, high'.split(', ').flatMap(v => srcMark.map(s => `data-${s}-${v}`))
          return observedAttributes
        }
        connectedCallback() {
          const v = this.video
            , [progress, buffered, controls, seekBackward, seekForward, playbackRate, videoContainer, menu, mBtn] =
              'progress, buffered, controls, seekBackward, seekForward, playbackRate, videoContainer, menu, mBtn'
                .split(', ')
                .map(id => this.shadowRoot.getElementById(id))
          this.playbackRate = playbackRate
          const that = this
          if (!window._currVid) window._currVid = v
          Object.defineProperties(v, {
            bufferedProgress: { get() { return this.duration && this.buffered.length ? this.buffered.end(this.buffered.length - 1) / this.duration : 0 } },
            fulfilled: { get() { return this._fulfilled === true || (this._fulfilled = Math.abs(1 - this.bufferedProgress) < 0.01) } },
            checkFulfillment: { value() { if (this.fulfilled) buffered.style.width = '100%' } }
          })
          v.addEventListener('progress', () => buffered.style.width = v.bufferedProgress * 100 + '%')
          v.addEventListener('timeupdate', () => { progress.style.width = v.currentTime / v.duration * 100 + '%'; v.checkFulfillment() })
          if (!isChromeMobile) {
            v.networkState === v.NETWORK_LOADING && this._addSeekingHint(v)
            v.addEventListener('waiting', this._addSeekingHint.bind(this, v))
            v.addEventListener('canplay', this._removeSeekingHint.bind(this, v))
          }
          const relaxationTime = 900, widgets = [controls, menu, mBtn]
          let dragging, pointerOverTime, pointerOverLock
          videoContainer.addEventListener('pointerover', e => {
            if (dragging) return
            if (!isTouchDevice) {
              if (pointerOverLock) return
              pointerOverLock = true
            }
            if (e.timeStamp - pointerOverTime < relaxationTime) return
            let currOver = this.shadowRoot.elementFromPoint(e.x, e.y)
            if (controls.contains(currOver) || !v.contains(currOver)) return
            pointerOverTime = e.timeStamp
            toggleHide(...isTouchDevice ? [undefined, false] : [])
          })
          videoContainer.addEventListener('pointerdown', () => {
            clearTimeout(rush._tID)
            rush._tID = setTimeout(rush.ing, 1000)
            videoContainer.addEventListener('pointerup', () => {
              clearTimeout(rush._tID)
              rush.ed()
            })
          })
          const rush = html`
        <i-ꔹ accel style='position:absolute;left:5%;top:2%'>
          ${genShadowText('3×').outerHTML}
        </i-ꔹ>
      `
          rush.ing = () => {
            v.insertAdjacentElement('afterend', rush)
            v._origPlaybackRate = v.playbackRate
            v.playbackRate = 3
          }
          rush.ed = () => {
            rush.remove()
            v._origPlaybackRate && (v.playbackRate = v._origPlaybackRate)
          }
          {
            menu.addEventListener('pointerleave', e => {
              if (isTouchDevice || e.relatedTarget === mBtn) return
              toggleMenu()
            })
            videoContainer.addEventListener('pointerleave', () => {
              if (isTouchDevice) return
              pointerOverLock = false
              toggleHide(true, false)
            })
            controls.addEventListener('pointerleave', e => {
              if (isTouchDevice) return
              if (dragging) return
              if (e.timeStamp - pointerOverTime < relaxationTime || window.isTouchDevice) return
              pointerOverLock = true
              toggleHide(true)
            })
          }
          mBtn.addEventListener('click', toggleMenu)
          function toggleMenu() {
            menu.classList.toggle('show')
            menu.classList.toggle('fadein', !menu.classList.toggle('fadeout', !menu.classList.contains('show')))
          }
          function toggleHide(forceHide, keepMBtn = true) {
            if (controls.classList.contains('hide')) return widgets.forEach(el => el.classList.remove('hide'))
            widgets.forEach(el => el.classList[forceHide ? 'add' : 'toggle']('fadeout'))
            widgets.forEach(el => el.classList[forceHide ? 'remove' : 'toggle']('fadein', !controls.classList.contains('fadeout')))
            if (forceHide || !keepMBtn) menu.classList.remove('show')
            if (keepMBtn) {
              mBtn.classList.replace('fadeout', 'fadein')
              menu.classList.replace('fadeout', 'fadein')
            }
          }
          controls.addEventListener('dragstart', function (e) {
            dragging = true
            const { left: l1, top: t1 } = this.getBoundingClientRect()
            const { left: l2, top: t2 } = this.parentNode.getBoundingClientRect()
            const eOffset = { x: e.x - l1 + l2, y: e.y - t1 + t2 }
            let x_, y_, x, y
            function drag(e) {
              [x_, y_] = [x, y]; ({ x, y } = e)
              if (!x_ && !y_ || !x && !y) return
              this.style.cssText = `
            left: ${x_ - eOffset.x + 16 * devicePixelRatio}px;
             top: ${y_ - eOffset.y}px;
          `
            }
            this.addEventListener('drag', drag)
            this.addEventListener('dragend', function end(e) {
              this.removeEventListener('drag', drag)
              this.removeEventListener('dragend', end)
              dragging = false
            })
          })
          const skipTime = 5
          seekBackward.addEventListener('click', e => {
            e.stopPropagation()
            v.currentTime -= skipTime
            this.showAndFadeOut(`−${skipTime}s`)
          })
          seekForward.addEventListener('click', e => {
            e.stopPropagation()
            v.currentTime += skipTime
            this.showAndFadeOut(`+${skipTime}s`)
          })
          if (isChromeMobile) [seekBackward, seekForward].forEach(el => el.remove())
          v.addEventListener('play', e => {
            if (window._currVid === e.target) return
            if (!isTouchDevice) VidSet.pause()
            window._currVid = v
          })
          v.addEventListener('pause', () => {
            if (v.pushed) return
            v.pushed = true
            vidp.push(v)
          })
          playbackRate.addEventListener('click', function (e) {
            if (e.target === this) return
            v.playbackRate = e.target.dataset.x
            this._currRata && this._currRata.removeAttribute('class')
            this._currRata = e.target
            this._currRata.classList.add('selected')
            that.showAndFadeOut(`${v.playbackRate}×`)
          })
          vido.observe(v)
        }
        disconnectedCallback() {
        }
        appendSrc(...src) {
          const existedSrcs = new Set(
            [...this.video.querySelectorAll('source')]
              .map(src => src.getAttribute('src')).filter(Boolean)
          )
          return arrFst(src.map(s => (
            s = this._genSrcElem(s),
            !existedSrcs.has(s.src) && (s = this.video.appendChild(s), existedSrcs.add(s.src)),
            s
          )))
        }
        _genSrcElem(src) {
          return src instanceof HTMLSourceElement ? src : this._coinSrcElem(src)
        }
        _coinSrcElem(src) {
          const srcElem = document.createElement('source')
          src && src.constructor === Object
            ? Object.entries(src).forEach(([name, val]) => srcElem.setAttribute(name, val))
            : srcElem.src = src
          return srcElem
        }
        arrowControlPlayRate(direction) {
          let currIdx = [...this.playbackRate.children].findIndex(c => c.className === 'selected')
          if (currIdx === -1) currIdx = 1
          let toIdx = currIdx + (direction === 'ArrowDown' ? - 1 : 1)
          if (!(0 <= toIdx && toIdx < this.playbackRate.children.length)) toIdx = currIdx
          this.playbackRate.children[toIdx].click()
        }
        arrowControlVolume(direction) {
          const step = +window._currVid.getAttribute('volume-step') || 0.02
          let d = (direction === 'ArrowUp'
            ? (
              window._currVid.muted && (window._currVid.muted = false, window._currVid.volume = 0),
              +1
            )
            : -1
          ) * step
          d = roundNum(window._currVid.volume + d)
          window._currVid.volume = d < 0 ? 0 : d > 1 ? 1 : d
          this.showAndFadeOut(`🔊 ${roundNum(window._currVid.volume * 100)}%`)
        }
        numPadPress(num) {
          if (!this._numTo) this._numTo = { 0: 0.5 }
          let playbackRate = this.playbackRate.querySelector(`[data-x='${this._numTo[num] || num}']`)
          playbackRate && playbackRate.click()
        }
        showAndFadeOut(text) {
          const prevState = this.video.nextElementSibling.hasAttribute('show-what-just-done')
          prevState && this.video.nextElementSibling.remove()
          text = this.video.insertAdjacentElement(
            'afterend',
            genShadowText(text, {
              cssText: 'left: 5%; top: 2%',
              className: `${prevState ? 'semi-' : ''}fadein`
            })
          )
          text.setAttribute('show-what-just-done', '')
          fadeOutThenRemove(text)
        }
        _addSeekingHint(v) {
          v._suspending = true
          if (!v._suspending) return
          this._seekingHint = this._seekingHint ||
            this.shadowRoot.getElementById('videoContainer').appendChild(new Spi())
        }
        _removeSeekingHint(v) {
          if (!v) return
          v._suspending = false
          this._seekingHint = this._seekingHint && this._seekingHint.remove()
        }
        static pause() {
          window._currVid && window._currVid.pause()
        }
      })
      function arrFst(arg) {
        return Array.isArray(arg) && arg.length === 1 ? arg[0] : arg
      }
      if (typeof roundNum === 'undefined')
        window.roundNum = function (num) { return Math.round(100 * num) / 100 }
      document.addEventListener('keydown', e => {
        if (!window._currVid || document.activeElement !== window._currVid.getRootNode().host) return
        if (e.key === 'F12') return
        const T = e.target
        if (T.localName !== 'i-🎞️') return
        e.preventDefault()
        e.stopImmediatePropagation()
        switch (e.key) {
          case ' ':
            window._currVid[window._currVid.playing ? 'pause' : 'play'](); break
          case 'Enter':
            toggleFullScreen(true); break
          case 'ArrowLeft':
          case 'ArrowRight':
            T.shadowRoot.querySelector(`#seek${e.key === 'ArrowLeft' ? 'Back' : 'For'}ward`).click(); break
          case 'ArrowUp':
          case 'ArrowDown':
            T[e.ctrlKey ? 'arrowControlPlayRate' : 'arrowControlVolume'](e.key); break
          case '0': case '1': case '2':
            e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD && T.numPadPress(e.key); break
        }
      }, true)
      document.addEventListener('visibilitychange', () => {
        document.visibilityState === 'hidden' && VidSet.pause()
      })
      if (window.isChrome) {
        let fullscreen_scrollY
        document.addEventListener('fullscreenchange', () => document.fullscreenElement
          ? fullscreen_scrollY = scrollY
          : window.scrollTo(fullscreen_scrollY)
        )
      }
      screen.orientation.addEventListener('change', e => {
        if (e.timeStamp - window._screen_orientation_timeStamp < 1000) return
        window._screen_orientation_timeStamp = e.timeStamp
        toggleFullScreen()
      })
      function toggleFullScreen(fromKeydown) {
        fromKeydown
          ? exitFullscreen() || requestFullscreen()
          : screen.orientation.type.startsWith('landscape')
            ? requestFullscreen() : exitFullscreen()
      }
      function requestFullscreen() {
        window._currVid && (window._currVid.pause(), window._currVid.parentNode.requestFullscreen())
      }
      function exitFullscreen() {
        document.fullscreenElement && document.exitFullscreen()
      }
      function fadeOutThenRemove(el, sec = 1, delay = 2) {
        setTimeout(() =>
          el.style.cssText += `opacity: 0; transition: opacity ${sec}s ${delay}s linear;`, 100
        )
        setTimeout(() => el.remove(), (sec + delay) * 1000)
      }
      function genShadowText(innerText, { cssText, className } = {}) {
        return Object.assign(document.createElement('div'), {
          innerText,
          style: `
        position: absolute;
        text-shadow: 0 0 2px black, 0 0 1em black, 0 0 0.2em black;
        color: white;
        font-size: 1.25rem;
        ${cssText || ''}`,
          className
        })
      }
    })();
    ;
    ;
    Object.assign(window, {
      $id: (elemOrId, id) => {
        if (typeof elemOrId === 'string') [elemOrId, id] = [document, elemOrId]
        return (elemOrId.shadowRoot || elemOrId).getElementById(id)
      },
      body: document.body,
      flash: elem => restartAnimation(elem, 'flash'),
      html,
      msg: (...a) => new Tosta(...a),
    })
    const outsideSrc = { vid: [] }
    const evalSitesStr = (str, site = {}) => typeof str === 'string' ? str.replace(evalSitesStr.re, (_, $1) => site[$1]) : ''
    evalSitesStr.re = /\\?\$\{([^}_]{2,})\}/g
    const extractOrGenSiteName = (site = {}) => site.name || site.domain.replace(/\..+$/, '')
    const convertSiteInf = (site = {}, moreInf) => Object.assign(site, {
      name: extractOrGenSiteName(site),
      domain: site.domain.toLowerCase(),
      icon: evalSitesStr(site.icon, site).toLowerCase(),
      ...moreInf
    })
    btSites.forEach(site => convertSiteInf(
      site,
      typeof site.q === 'function' && { q: eval(evalSitesStr(site.q.toString(), site)) }
    ))
    Object.values(streamSites.archivedList).flat().forEach((site, _i, list) => site.ident && list.find(bSite => bSite.domain.toLowerCase() === site.ident.toLowerCase() && Object.assign(site, { ...bSite, ...site })))
    outsideSrc.streamSites = Object.entries(streamSites.archivedList).flatMap(([rank, sites], rankIndex) => sites.map(site => ({ ...convertSiteInf(site), rank, rankIndex })))
    outsideSrc.streamSites.default = streamSites.map(convertSiteInf)
    outsideSrc.vid.push(...outsideSrc.streamSites.default)
    outsideSrc.vid.push(...btSites.map(site => ({ ...site, type: 'BT' })))
    const proxies = proxyTracer(proxyURLs)
    const rules = URLForExRules
    rules.toString = function () { return this[0] }
    const cacheName = 'url-cid-excepts'
    const se = {
      ddg: {
        basicUrls: {
          name: 'DuckDuckGo',
          domain: 'duckduckgo.com',
          get q() {
            Object.defineProperty(this, 'q', { value: `https://html.${this.domain}/html?q=` })
            return this.q
          },
          get q_icon() { return domain => `https://external-content.${this.domain}/ip3/${domain}.ico` }
        },
        q(w, specify, { quotes = true } = {}) { return q.call(this, w, specify, { quotes }) },
        q_icon(domain) {
          return this.basicUrls.q_icon(domain)
        },
        result: resultPattern(/<a rel="nofollow" class="result__a" href="([^"]+?)">\s*(.*?)\s*<\/a>/, purifyDDGSearchLink),
        rejected_prompt: 'If this error persists'
      },
      gg: {
        basicUrls: {
          name: 'Google',
          domain: 'www.google.com',
          get q() {
            Object.defineProperty(this, 'q', { value: `https://${this.domain}/search?q=` })
            return this.q
          },
        },
        q,
        result: resultPattern(extractGoogleSearchResults)
      }
    }
    function q(q, specify, { quotes = true } = {}) {
      if (!q) return
      specify = specify && specify.constructor === Object && Object.entries(specify)
        .map(([key, val]) => specify[key] = val ? `+${key}:${val}` : '')
      return `${this.basicUrls.q}${quotes ? `"${q}"` : q}${specify || ''}`
    }
    function resultPattern(pattern, purifyLink) {
      return {
        pattern,
        purifyLink,
        first(resultText) {
          let link, title
          switch (true) {
            case typeof resultText !== 'string': break
            case typeof this.pattern === 'function':
              [[link, title] = []] = this.pattern(resultText) || Array(Array(2).fill('')); break
            case this.pattern instanceof RegExp:
              const mText = resultText.match(RegExp(this.pattern, ''))
              mText && mText.forEach(str => str && (str.startsWith('http') || str.startsWith('//') ? link = str : title = str))
          }
          if (typeof this.purifyLink === 'function') link = this.purifyLink(link)
          return { link, title }
        }
      }
    }
    function purifyDDGSearchLink(href) {
      if (!href) return href
      return decodeURIComponent(href).replace(/\/\/duckduckgo.com\/l\/\?uddg=(.+?)&amp;rut=.+$/, '$1')
    }
    function extractGoogleSearchResults(htmlStr = '') {
      if (!htmlStr) return htmlStr
      return extractGoogleSearchResults.resolveHtmlStr(htmlStr)
    }
    Object.assign(extractGoogleSearchResults, {
      resultPart: /<div (?:class=[^ ]+ )?id="(?:taw|res)"(?: role="main")?>[^]+?(?=<div id="bottomads)/,
      googleLink: { start: /^https:\/\/(www.)?google.com\/url\?/, extract: /(?<=url=).*(?=&usg=)/ },
      resolveHtmlStr(htmlStr = '') {
        let results = (htmlStr.match(this.resultPart) || [])[0]
        if (!results) return null
        const dom = html(results, 'div')
        try { dom.querySelector('.xpdopen').remove() } catch (e) { }
        const gs = dom.querySelectorAll('[class~=g]:not([class=g] [class=g])')
        results = Array.prototype.filter.call(gs, el => el.classList.length <= 2 || el.querySelector('h3'))
        if (!results.length) return null
        results = results.map(g => {
          let href = g.querySelector('a').getAttribute('href')
          href = prependToHref`https://google.com${href}`
          const link = extractGoogleSearchResults.checkUrl(href)
          const title = g.querySelector('h3').innerHTML
          let excerpt = this.extractExcerpt(g, '[data-sncf], .fzUZNc, .IsZvec', '.fzUZNc')
          excerpt = excerpt.length ? excerpt.map(v => (v.querySelectorAll('a').forEach(prependToHref.bind('https://google.com')), removeAllAttributes(v).innerHTML)).join('<br>') : ''
          return [link, title, excerpt]
        })
        let taw = dom.querySelector('#taw')
        if (taw) {
          if (!taw.querySelector('[role]')) taw = ''
          taw = taw.innerText && removeAllAttributes(taw)
        }
        results.otherInfo = { ...taw ? { taw } : {} }
        return results
      },
      extractExcerpt(g, selector, impSelector, classLenThan = 2) {
        const nodeNames = /\b(div|span|text)$/i
        return Array.prototype.filter.call(g.querySelectorAll(selector), el => el.firstChild && (el.classList.length >= classLenThan ? nodeNames.test(el.firstChild.nodeName) : el.classList.length && (el.matches(impSelector) || el.querySelector('span[style="-webkit-line-clamp:2"]'))) && !el.querySelector('svg'))
      },
      checkUrl(href) {
        return this.googleLink.start.test(href) ? decodeURIComponent(href.match(this.googleLink.extract)) : href
      }
    })
    const vii = {
      JAVLibrary: {
        sites: {
          'en': 'javlibrary.com/en',
          'zh-CN': ['javlibrary.com/cn']
        },
        get site() {
          let site = this.sites[this.langUse]
          if (Array.isArray(site)) site = site[0]
          return `${site.startsWith('http') ? '' : 'https://'}${site}`
        },
        async q(id, lang = _langs.chosen) {
          this.langUse = lang
          let pageHTML, url
          const prefind = html(
            pageHTML = await (
              await fetch(url = `${this.site}/vl_searchbyid.php?list&keyword=${id}&page=1`)
            ).text()
          )
          const page = !prefind.querySelector('.videotextlist') ? prefind :
            html(
              pageHTML = await (
                await fetch(url =
                  sort_table_rows(
                    prefind.querySelector('.videotextlist'),
                    [[2, -1], [1, -1, 'date']]
                  )
                    .shift()
                    .querySelector('[href]').getAttribute('href')
                    .replace('.', this.site)
                )
              ).text()
            )
          removeChilds(page, '#video_review td.text > :not(:last-child), #video_review td.icon')
          const [info] = 'video_info'.split(' ').map($id.bind(0, page))
          const vidDate = info.querySelector('#video_date .text')
          const manyYrs = numOfYearsSince(vidDate.innerText)
          vidDate.innerText += +manyYrs > 1 ? translate(` (${translateInterp(`${manyYrs} years ago`, /[\d.]+/, '${Y}')})`) : ''
          const review = insertAdjacentElements(
            html`<div id=video_reviews></div>`,
            dedupReviews(preTransformReviewEl(page.querySelectorAll('.review, .comment')))
              .refed_plus_refs
              .filter(_ =>
                !_.textContent.startsWith('[url=http') &&
                (_.innerHTML = _.innerHTML.replaceAll(/\[(url|img)]?.*?\[\/\1](<br>)*/g, (_, $1) => ({ url: `📎${translate([' (', 'URL ', 'removal', ')'])}`, img: '🖼️' })[$1]).replaceAll(/[-=]{3,}(<br>)*/g, '<hr>').replace(/(<br>)+/g, '$1'))
              )
              .map(_ => (_.insertAdjacentHTML('beforeend', `<span class=rev-scores>${_._recvScores}</span>`), _))
          );
          [info, review].forEach(elem => removeAllAttributes(elem, 'class translate', { defaultAllows: true, hrefToPrepend: this.site }))
          review.addEventListener('dblclick', function (e) { e.stopPropagation(); if (getSelection().isCollapsed || this === e.target) css_collapseOrExpandSmoothly(this, { collapsedHeight: '64px', collapsedClass: 'unrevealed-' }) })
          if (!info && lang === 'zh-CN') this.sites[lang] = this.sites[lang].concat(this.sites[lang].shift())
          return { url, info, review }
        }
      }
    }
    function arrayMoreThan(arr1, arr2) {
      [arr1, arr2] = [arr1, arr2].map(v => v.map(JSON.stringify))
      return arr1.filter(i => !arr2.includes(i)).map(JSON.parse)
    }
    function flat(arr) {
      return arr.reduce((Arr, val) => Arr.concat(Array.isArray(val) ? flat(val) : val), [])
    }
    function random(arr) {
      return arr[Math.round(Math.random() * (arr.length - 1))]
    }
    function nextOf(arr = [], idx) {
      if (idx === null) idx = undefined
      return arr[typeof idx === 'string' ? arr.indexOf(idx) + 1 : idx + 1] || arr[0]
    }
    function removeFromArr(arr, value, id, ...replaceWith) {
      if (!Array.isArray(arr)) return
      let index
      const hasRecord = arr.hasOwnProperty('Map') && arr.Map
        && arr.Map.constructor === Map && arr.Map.has(id)
      if (hasRecord) {
        index = arr.Map.get(id)
        arr.Map.delete(id)
      }
      else {
        (index = arr[typeof value === 'function' ? 'findIndex' : 'indexOf'](value))
          === -1 && (index = undefined)
      }
      index !== undefined && arr.splice(index, 1, ...replaceWith)
      return index + 1
    }
    window.Array.prototype[''] = function () { return this }
    function interleave([x, ...xs], ys = []) {
      return x === undefined
        ? ys
        : [x, ...interleave(ys, xs)]
    }
    function findLast(iterable, fn) {
      if (!(iterable && iterable[Symbol.iterator] && typeof fn === 'function')) return
      for (let i = iterable.length - 1; i >= 0; --i) if (fn(iterable[i])) return iterable[i]
    }
    function range(start, stop, step) {
      if (!step || isNaN(step)) step = start > stop ? -1 : 1
      return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + (i * step))
    }
    window.range = range
    Object.defineProperties(Element.prototype, {
      classListTree: { get() { return classListTree.call(this) } }
    })
    Object.defineProperties(Node.prototype, {
      _closest: {
        value(selector) {
          let _this
          const thisClosest =
            this.closest ? (_this = this, this.closest) :
              this.parentNode && (_this = this.parentNode, this.parentNode.closest)
          return typeof thisClosest === 'function' ? thisClosest.call(_this, selector) : null
        }
      }
    })
    function classListTree() {
      if (!!this.classListTree_Proxy) return this.classListTree_Proxy
      let target = this
      return this.classListTree_Proxy = new Proxy(target, {
        get(target, prop) {
          if (!DOMTokenList.prototype.hasOwnProperty(prop)) return
          let act = prop
          return (...args) => classListTree.call(target, act, ...args)
        }
      })
      function classListTree(act, ...args) {
        this.act = act
        this.args = args
        this.attr = '[data-classListTree]'
        this.selfContained = true
        this.done = false
        this.result = []
        let vert = args.indexOf('|')
        if (~vert) {
          args.splice(vert).splice(1).forEach(v => {
            switch (typeof v) {
              case 'boolean':
                this.selfContained = !!v
                break
              case 'string':
                if (!/\[data-css-/.test(v)) this.attr = v
                break
              default: null
                break
            }
          })
        }
        if (act === 'replace') {
          cssApply.call(this, 'remove', [args.shift()])
          cssApply.call(this, 'add', args)
          this.done = true
        }
        if (!this.done) cssApply.call(this)
        return (
          this.result.includes(undefined)
            ? this.classListTree
            : this.result[1]
        )
        function cssApply(act = this.act, args = this.args) {
          if (this.selfContained) this.result[0] = this.classList[act](...args)
          this.result[1] = Array.from(this.querySelectorAll(this.attr))
            .some(child => child.classList[act](...args))
        }
      }
    }
    window.$clear = $clear
    function $clear(selector = '[output]', node = sel.focusNode._closest('[input]')) {
      switch (selector) {
        case '[output]': case 'onclick':
          if (node) {
            if (node.hasAttribute('[input]')) node = node.querySelector('[outputs]')
            if (node) {
              const nodes = node.querySelectorAll(selector.startsWith('on') ? '[output]' : selector)
              nodes.forEach(node => node.remove())
              break
            }
          }
        default: case '': case 'all':
          if (!node) node = _console
          if (node.childElementCount > 1)
            while (node.childElementCount > 1) node.removeChild(node.lastChild)
          else node.childElementCount && node.removeChild(node.lastChild)
      }
      setTransiently_noReturn()
    }
    function getAttributes(elem, attrs = []) {
      if (typeof attrs === 'string') attrs = attrs.split(' ')
      if (!Array.isArray(attrs)) return {}
      if (!attrs.length) attrs = Array.prototype.map.call(elem.attributes, attr => attr.name)
      return Object.fromEntries(
        Object.values(
          pickKeys(elem.attributes, attrs)
        ).map(attr => [attr.name, attr.value])
      )
    }
    function setAttributes(elem, attrs = '') {
      attrs.split(' ').forEach(attr => elem.setAttribute(...attr.split('='), ''))
      return elem
    }
    function removeAllAttributes(elem, allows, { defaultAllows, hrefToPrepend } = {}) {
      if (!elem) return elem
      if (allows && typeof allows === 'string') allows = allows.split(' ')
      if (!Array.isArray(allows)) allows = removeAllAttributes._defaultAllows
      if (defaultAllows) allows = [...new Set(allows.concat(removeAllAttributes._defaultAllows))];
      [...elem.attributes].forEach(attr => {
        if (allows.includes(attr.name)) {
          if (attr.name === 'href' && typeof hrefToPrepend === 'string') prependToHrefOn(hrefToPrepend, elem)
        }
        else elem.removeAttribute(attr.name)
      })
      Array.prototype.forEach.call(elem.children, el => removeAllAttributes(el, allows, { hrefToPrepend }))
      return elem
    }
    removeAllAttributes._defaultAllows = 'id role href'.split(' ')
    function html(htmlStr, addEnclose) {
      if (htmlStr.nodeType) return htmlStr
      if (Array.isArray(htmlStr)) htmlStr = tmplStr(arguments)
      const { content } = Object.assign(document.createElement('template'), { innerHTML: htmlStr.trim() })
      return content.childElementCount <= 1
        ? content.firstElementChild
        : addEnclose ? html(`<${addEnclose}>${htmlStr}</${addEnclose}>`) : content
    }
    function htmlDecode(input) {
      return new DOMParser().parseFromString(input, 'text/html').documentElement.textContent
    }
    function sort_table_rows(tbody, priors = [[2, -1], [1, -1, 'date']], header = '.header') {
      tbody = tbody.localName === 'tbody' ? tbody : tbody.querySelector('tbody') || /^t[dr]$/.test(tbody.localName) && tbody.closest('tbody')
      if (!tbody) throw TypeError('No `<tbody>` was found.')
      header = header instanceof Element ? header : typeof header === 'string' ? tbody.querySelector(header) : null
      const trs = header ? [...tbody.children].filter(el => el !== header) : [...tbody.children]
        , dict = new Map(trs.map(tr => [tr, '']))
        , cmpText = (td, tdIdx, innerText) => ({ children: { [tdIdx]: { innerText } } } = td, innerText)
        , sortArg = (a, b, tdIdx) => [a, b].map(td => cmpText(td, tdIdx))
      priors.forEach(([tdIdx, dt, type = 'number']) => {
        trs.sort((a, b) => (
          [a, b] = sortArg(a, b, tdIdx),
          dt * (type === 'number' ? a - b : a.localeCompare(b))
        ))
        trs.forEach((tr, i) => dict.set(tr, dict.get(tr) + i))
      })
      return trs.sort((a, b) => dict.get(a).localeCompare(dict.get(b)))
    }
    function insertAdjacentElements(toElem, HTMLCollection, pos = 'beforeend') {
      for (const elem of HTMLCollection) toElem.insertAdjacentElement(pos, elem)
      return toElem
    }
    function $__(target, ...args) {
      return [...target.querySelectorAll(...args)]
    }
    function selInDocIng() {
      return sel.type === 'Range'
    }
    window.selectWholeText = selectWholeText
    function selectWholeText(target = '') {
      let fNode = target instanceof Element ? target : sel.focusNode
      if (fNode.nodeName === '#text') fNode = fNode.parentNode
      if (typeof target === 'string' && !fNode.hasAttribute(target)) return
      selContents(fNode)
    }
    function whenScrollStop(callback, elem = window, scrollStopDelay = 200) {
      if (typeof callback !== 'function') return
      let scrollTimer
      elem.addEventListener('scroll', function listenToScrolling() {
        elem._scrolling = true
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          delete elem._scrolling
          elem.removeEventListener('scroll', listenToScrolling)
          callback()
        }, scrollStopDelay)
      })
    }
    function isInView(el, mustBeTopmost) {
      const { top, bottom, x, y } = el.getBoundingClientRect()
      return top <= window.innerHeight && bottom >= 0 && (!mustBeTopmost || document.elementFromPoint(x, y) === el)
    }
    window.sel = window.sel || getSelection()
    Object.defineProperties(sel, {
      _cleanRange: {
        value(endpoint) {
          if (!this.rangeCount > 0) return
          this.getRangeAt(0).commonAncestorContainer.normalize()
          this._collapse(endpoint)
        }
      },
      _collapse: {
        value(endpoint = 'End') { sel.focusNode && sel[`collapseTo${endpoint}`]() }
      },
      _getCaretChars: {
        value: Object.assign(function (len = 1, { leftPartOnly } = {}) {
          if (!(this.focusNode && this.focusNode.data)) return []
          this.focusNode.parentNode.normalize()
          return Array.from(Array(leftPartOnly ? len : len * 2).keys(), num => num - len + 1)
            .map(backwardIdx => this._getCaretChars._get.call(this, backwardIdx))
        }, {
          _get(backwardIdx) { return this.focusNode.data[this.focusOffset + backwardIdx - 1] }
        }),
      },
      _getCharsBeforeCaret: {
        value(len) { return this._getCaretChars(len, { leftPartOnly: true }) }
      },
      _charBeforeCaret: {
        get() { return this._getCharsBeforeCaret()[0] || '' }
      },
      _indentManually: {
        value() {
          this._range = this.getRangeAt(0)
          this._range.insertNode(document.createTextNode('  '))
          this._range.collapse()
        }
      },
      _lastNonBlankOpts: {
        value: {}
      },
      _lastNonBlankCharNode: {
        get() {
          let lastNonBlankOffset = -1
          let focusNode = this.focusNode
          if (!(focusNode && focusNode.nodeType === Node.TEXT_NODE)) return { lastNonBlankOffset }
          let offset = sel.focusOffset, backOffset = 0
          const find = () => {
            let char
            while (offset > 0) {
              --backOffset
              if (
                !boundaryChars.blank.test(char = focusNode.data[--offset]) ||
                this._lastNonBlankOpts.notCrossLine && char === '\n'
              ) {
                lastNonBlankOffset = offset
                break
              }
            }
            if (lastNonBlankOffset !== -1) return
            focusNode = lastTextChild((focusNode.nodeType !== Node.TEXT_NODE ? focusNode : focusNode.parentNode).previousSibling)
            if (!focusNode) return
            offset = focusNode.data.length
            find()
          }
          find()
          delete this._lastNonBlankOpts.notCrossLine
          return lastNonBlankOffset !== -1
            ? { lastNonBlankNode: focusNode, lastNonBlankOffset, backOffset, lastNonBlankChar: focusNode.data[lastNonBlankOffset] }
            : { lastNonBlankOffset }
        }
      },
      _nextNonBlankCharNode: {
        get() {
          let nextNonBlankOffset = -1
          let focusNode = this.focusNode
          if (!(focusNode && focusNode.data)) return { nextNonBlankOffset }
          let offset = sel.focusOffset, forthOffset = 0
          const find = () => {
            let char
            while (offset < focusNode.data.length) {
              if (!boundaryChars.blank.test(char = focusNode.data[offset]) ||
                this._lastNonBlankOpts.notCrossLine && char === '\n'
              ) {
                nextNonBlankOffset = offset
                break
              }
              ++forthOffset
              ++offset
            }
            if (nextNonBlankOffset !== -1) return
            focusNode = nextTextChild(focusNode, true)
            if (!focusNode) return
            offset = 0
            find()
          }
          find()
          delete this._lastNonBlankOpts.notCrossLine
          return nextNonBlankOffset !== -1
            ? { nextNonBlankNode: focusNode, nextNonBlankOffset, forthOffset, nextNonBlankChar: focusNode.data[nextNonBlankOffset] }
            : { nextNonBlankOffset }
        }
      },
      _lastNonBlankCharNodeInline: {
        get() { this._lastNonBlankOpts.notCrossLine = true; return this._lastNonBlankCharNode }
      },
      _nextNonBlankCharNodeInline: {
        get() { this._lastNonBlankOpts.notCrossLine = true; return this._nextNonBlankCharNode }
      },
      _moveCaret: {
        value(offset = 1) {
          sel.collapse(sel.focusNode, sel.focusOffset + offset)
        }
      },
      _setFocusOffset: {
        value(focusOffset) {
          sel.setBaseAndExtent(sel.focusNode, focusOffset, sel.anchorNode, sel.anchorOffset)
        }
      },
      _lastNonBlankSequence: {
        get() {
          const { lastNonBlankOffset, lastNonBlankNode, backOffset: prev } = this._lastNonBlankCharNode
          if (!~lastNonBlankOffset) return { lastNonBlankSeqOffset: lastNonBlankOffset, lastNonBlankSeq: '' }
          let offset, lastNonBlankSeqOffset, backOffset = 0
          offset = lastNonBlankSeqOffset = lastNonBlankOffset
          while (offset > 0) {
            --backOffset
            if (boundaryChars.blank.test(lastNonBlankNode.data[--offset])) {
              ++backOffset
              break
            }
            lastNonBlankSeqOffset = offset
          }
          backOffset += prev
          return {
            lastNonBlankSeqNode: lastNonBlankNode,
            lastNonBlankSeqOffset,
            backOffset,
            lastNonBlankSeq: lastNonBlankNode.data.substring(lastNonBlankSeqOffset, lastNonBlankOffset + 1)
          }
        }
      },
      _nextNonBlankSequence: {
        get() {
          const { nextNonBlankOffset, nextNonBlankNode, forthOffset: next } = this._nextNonBlankCharNode
          if (!~nextNonBlankOffset) return { nextNonBlankSeqOffset: nextNonBlankOffset, nextNonBlankSeq: '' }
          let offset, nextNonBlankSeqOffset, forthOffset = 0
          offset = nextNonBlankSeqOffset = nextNonBlankOffset
          while (offset < nextNonBlankNode.length) {
            ++forthOffset
            if (boundaryChars.blank.test(nextNonBlankNode.data[++offset])) {
              --forthOffset
              break
            }
            nextNonBlankSeqOffset = offset
          }
          forthOffset += next
          return {
            nextNonBlankSeqNode: nextNonBlankNode,
            nextNonBlankSeqOffset,
            forthOffset,
            nextNonBlankSeq: nextNonBlankNode.data.substring(nextNonBlankOffset, nextNonBlankSeqOffset)
          }
        }
      }
    })
    function indent(text, exLv, backspace = 0) {
      if (!text) return '  '
      exLv = +(exLv && exLv.exLv || exLv || 0)
      let indentSpaces
      if (sel.focusNode && sel.focusNode.nodeType === Node.TEXT_NODE) {
        let i = sel.focusOffset - 1
        do { if (sel.focusNode.data[i] === '\n') break } while (--i >= 0)
        indentSpaces = sel.focusNode.data.slice(i >= 0 ? i : 0, sel.focusOffset).match(/^\s+/)
      }
      indentSpaces = indentSpaces ? indentSpaces[0].replace(/^\n/, '') : ''
      let prevTabs = '', prevNode = sel.focusNode
      if (!(prevNode.nodeType === Node.ELEMENT_NODE && prevNode.hasAttribute('info'))) {
        while (
          (prevNode = prevNode.previousSibling) && prevNode.nodeType === Node.TEXT_NODE
          && /^\s{2,}|\s{2,}$|^[^\n]*$/.test(prevNode.data)
        ) {
          prevTabs += prevNode.data.match(/[ \t]*$/)
        }
      }
      text = text.replace(/\n/g, `$&${prevTabs}${indentSpaces.replace(RegExp(` {${2 * backspace}}$`), '')}${'  '.repeat(exLv)}`)
      return text
    }
    function selContents(el) {
      const range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    function replaceSelectedText(replacementText = '', range) {
      range = range || sel.getRangeAt(0)
      range.deleteContents()
      const newNode = document.createTextNode(replacementText)
      range.insertNode(newNode)
      return newNode
    }
    function indentText(nodes) {
      nodes.forEach(node => node.nodeType === Node.TEXT_NODE
        ? node.data = node.data ? node.data.replace(/^/gm, '  ') : ''
        : indentText(node.childNodes)
      )
    }
    function outdentText(nodes) {
      nodes.forEach(node => node.nodeType === Node.TEXT_NODE
        ? node.data = node.data.replace(/^(  | )/gm, '')
        : outdentText(node.childNodes)
      )
    }
    function firstTextChild(parentNode = sel.focusNode, step = 1, recursive) {
      if (!(parentNode && parentNode.childNodes.length)) return
      let textNode, i = step === 1 ? -1 : parentNode.childNodes.length
      while (textNode = parentNode.childNodes[i += step]) {
        if (textNode.nodeType !== Node.TEXT_NODE) {
          if (recursive) {
            textNode = firstTextChild(textNode, 1, true)
            if (textNode) return textNode
          }
          else textNode = undefined
        }
        else break
      }
      return textNode
    }
    function firstTextDescendant(parentNode) {
      return firstTextChild(parentNode, 1, true)
    }
    function lastTextChild(parentNode = sel.focusNode) {
      return firstTextChild(parentNode, -1)
    }
    function nextTextChild(node, recursive) {
      if (!node) return null
      while (node = node.nextSibling) {
        if (node.nodeType === Node.TEXT_NODE) return node
      }
      return node && recursive ? nextTextChild(node.parentNode && node.parentNode.nextSibling) : null
    }
    function redirectInNewTab(event) {
      const T = event.composedPath()[0]
      let a;
      [T, T.parentNode].find(el => el && el.localName === 'a' && (a = el))
      if (!a || a.hasAttribute('target') || a.onclick) return
      if (!a.hasAttribute('target')) {
        event.preventDefault()
        a.setAttribute('target', '_blank')
        a.click()
      }
    }
    function click(...args) {
      let delay = args[args.length - 1]
      if (isNaN(delay)) delay = 40
      args.forEach((arg, i) =>
        setTimeout(typeof arg === 'function' ? arg.name === 'willClick' ? () => arg().click() : arg : () => arg.click(), i * delay)
      )
    }
    function icoImg(domain, defaultIcon) {
      if (typeof domain === 'object') {
        defaultIcon = domain.icon
        domain = domain.domain
      }
      const qIcon = se.ddg.q_icon(domain)
      return `\
    <img icon \
      src="${defaultIcon || qIcon}" \
      ${defaultIcon ? `
      onerror="this.removeAttribute('onerror'); this.src='${qIcon}'"
      onload="['onerror', 'onload'].forEach(v=>this.removeAttribute(v))"
      ` : ''}>`
    }
    function genListContent(arr, tag = 'li') {
      return arr.map(v => chainingAppend(document.createElement(tag), v))
    }
    function chainingAppend(elem, ...append) {
      elem.append(...append)
      return elem
    }
    'load'.split(' ').forEach(fname => window[`$${fname}`] = $script)
    $load.presets = {
      VSCode: async (language, { height = '55vh' } = {}) => {
        language = typeof language === 'string' && language ? language : 'JavaScript'
        const infoBlock = _console.log(`<span translate-merge=@hold>An <span translate-hold>${language}</span> editor will be created:</span>`)
        const { _info } = infoBlock
        switchLang(_info)
        if (!window.monaco) {
          await $load('@monaco-editor/loader')
          if (!isLangEn(_userLang)) monaco_loader.config({ 'vs/nls': { availableLanguages: { '*': _userLang.toLowerCase() } } })
          await monaco_loader.init()
          monaco.disposeAll = () => monaco.editor.getModels().forEach(model => model.dispose())
        }
        const el = _console.appendChild(document.createElement('div'))
        el.style.height = height
        const { _id } = monaco.editor.create(el, { language: language.toLowerCase(), theme: 'vs-dark' })
        el.removeAttribute('style')
        _info.innerHTML = `<span translate-merge=@hold>An <span translate-hold translate-id=1>${language}</span> editor with ID <span translate-hold translate-id=2>${_id}</span> has been created:</span>`
        const xBtn = _info.parentNode.querySelector('[close-btn]')
        xBtn.addEventListener('click', () => {
          let T = infoBlock
          while (T = T.nextElementSibling) {
            if (T.dataset.keybindingContext) {
              monaco.editor.getModel(T.firstElementChild.dataset.uri)
              monaco.editor.getModel(T.firstElementChild.dataset.uri).dispose()
              T.remove()
              infoBlock.remove()
              break
            }
          }
        })
        xBtn.removeAttribute('onclick')
        setTimeout(() => switchLang(_info, '', { forceAgain: true }))
        setTransiently_noReturn()
      }
    }
    window.$VSCode = $load.presets.VSCode
    function $script(...scriptsURLs) {
      if (Array.isArray(scriptsURLs[0])) scriptsURLs = scriptsURLs[0]
      return Promise.all(scriptsURLs.map(url =>
        typeof url === 'string'
          ? (
            !/^\s*(\w+:)?\/\//.test(url) && (url = `https://cdn.jsdelivr.net/npm/${url}`),
            loadElemFromUrl(url, { promise: true })
          )
          : undefined
      ))
    }
    const _scriptsInsertedAtEndOfDoc = window._scriptsInsertedAtEndOfDoc || document.body
    function loadElemFromUrl(type = '', opts) {
      let {
        src, href, defaultType = 'script',
        target = _scriptsInsertedAtEndOfDoc,
        async = false, defer = true, crossorigin = 'anonymous',
        put = 'appendChild', posOnSelf,
        onload, promise
      }
        = opts = opts && typeof opts === 'object'
          ? { src: type, ...opts }
          : typeof opts === 'string'
            ? { src: opts, href: opts }
            : typeof type === 'string'
              ? { src: type }
              : { posOnSelf: true }
      const typeIsElem = typeof type !== 'string'
        && 'HTMLLinkElement, HTMLScriptElement'.split(', ')
          .find(permittedElem => type instanceof window[permittedElem])
      let typeIs
      if (typeIsElem) {
        typeIs = typeIsElem.match(/HTML(.*)Element/)[1].toLowerCase()
        if (typeIs === 'script' && !type.src) return loadInlineScript(type, { onload })
        if (posOnSelf) target = type
      }
      let uri = elemLinkyAttr[typeIsElem ? typeIs : defaultType]
      const specifiedUri = getAttrForSrc(opts).value
      uri = specifiedUri || type[uri] || [src, href].find(v => typeof v === 'string')
      const alreadyLoaded = loadedUrl.has(uri)
      if (alreadyLoaded) type = loadedUrl.get(uri)
      else {
        type = Object.assign(
          document.createElement(typeIs || defaultType),
          {
            ...opts,
            uri,
            async, defer, crossorigin,
            ...typeIsElem && getAttributes(type)
          }
        )
        loadedUrl.set(uri, type)
        if (put === 'replaceWith' && typeIsElem) target = type
        if (target === _scriptsInsertedAtEndOfDoc) put = 'appendChild'
        target[put](type)
      }
      return promise
        ? new Promise(r => whenLoad(type, r, alreadyLoaded))
        : whenLoad(type, onload, alreadyLoaded)
    }
    const elemLinkyAttr = {
      link: 'href',
      script: 'src'
    }
    const loadedUrl = new Map
    function whenLoad(script, onload, alreadyLoaded) {
      if (typeof onload === 'function') {
        script.src && !alreadyLoaded
          ? script.addEventListener('load', () => setTimeout(onload, 0, script), { once: true })
          : onload(script)
      }
      return script
    }
    function getAttrForSrc(elem) {
      if (!(elem instanceof Element)) return {}
      const key = 'src, href, data'.split(', ').find(attr => elem[attr])
      const value = key && (elem.getAttribute(key) || elem[key])
      return { key, value }
    }
    function loadInlineScript(origScript,
      { target, put = 'replaceWith', onload } = {}
    ) {
      const newScript = document.createElement('script')
      const { isElem, text } = getScriptText(origScript)
      if (put === 'replaceWith' && isElem) target = origScript
      origScript = document.createTextNode(text)
      if (!target) target = _scriptsInsertedAtEndOfDoc
      newScript.appendChild(origScript)
      whenLoad(newScript, onload)
      target[put](newScript)
      return newScript
    }
    function getScriptText(script) {
      const isElem = script instanceof Element
      const text = isElem ? script.innerText : script
      return { isElem, text, [Symbol.toPrimitive]() { return text } }
    }
    function evalScriptText(script) {
      return (0, eval)(String(getScriptText(script)))
    }
    function rewriteSrcAttr(node) {
      if (node.nodeType === Node.TEXT_NODE) return
      const { key, value } = getAttrForSrc(node)
      if (!key || !value) return
      if (node.hasOwnProperty('_rewritten')) return delete node._rewritten
      node._rewritten = true
      if (node.localName === 'img') node.removeAttribute('srcset')
      if (/^(\/\/|(https?|data|blob):|#)/.test(value)) return
      regex.urlAsHref.lastIndex = 0
      node.setAttribute(key, value.replace(regex.urlAsHref, prependWhatToHrefSrc))
    }
    NodeList.prototype.scriptsChainLoad = scriptsChainLoad
    function scriptsChainLoad(scriptElems) {
      if (!scriptElems) scriptElems = this
      if (!(scriptElems && scriptElems.length)) return
      const { p, f } = postifyPromise()
      f()
      const amount = scriptElems.length
      return Array.prototype.reduce.call(
        scriptElems,
        (promises, script, count) => promises.then(() =>
          scriptsChainLoad.loadNext(script, { count, amount })
        ),
        p
      )
    }
    scriptsChainLoad.loadNext = function (script, { log, count, amount } = {}) {
      log && console.log(
        (++count ? `(Script ${count}/${amount})\n` : '') +
        'Loading script:', script, '\n', script.src
        ? `URL of script: ${script.src}`
        : `Inline script: ${script.innerText.substring(0, 64)}…`
      )
      const { p, f } = postifyPromise()
      script = loadElemFromUrl(script, { onload: f })
      return p
    }
    function postifyPromise() {
      let fuse
      return {
        p: new Promise(_fuse => fuse = _fuse),
        f: fuse
      }
    }
    const observeDOM4ReloadElem = new MutationObserver(mutationRecords => {
      mutationRecords.forEach(mutationRecord =>
        mutationRecord.type === 'childList'
          ? mutationRecord.target
            .querySelectorAll(
              'a, img, script, link, object, iframe'
            ).forEach(rewriteSrcAttr)
          : rewriteSrcAttr(mutationRecord.target)
      )
    })
    observeDOM4ReloadElem.startObserve = target => {
      if (!target) return
      observeDOM4ReloadElem.observe(target, {
        childList: true,
        attributeFilter: 'href src action data'.split(' '),
        subtree: true
      })
    }
    addEventListener('error', e => {
      if (!/script/i.test(e.message)) return
      const remediable =
        remedialMapForLoadingElements[e.filename] ||
        remedialMapForLoadingElements[extractHostName(e.filename)]
      remediable && remediable(e)
    })
    const remedialMapForLoadingElements = {
      'duckduckgo.com': e => {
        if (!window.DDG || window.DDG.page) return
        DDG.page = noopChain
        loadElemFromUrl(e.filename)
        setTimeout(() => {
          new DDG.Pages.Home()
          new DDG.Pages.SERP()
        })
      }
    }
    const remedialMapAliases =
      [
        ['duckduckgo.com', ['ddg.gg']]
      ]
    remedialMapAliases.forEach(
      ([domain, aliases]) => {
        aliases.forEach(alias =>
          remedialMapForLoadingElements[alias] =
          remedialMapForLoadingElements[domain]
        )
      }
    )
    function clearChildNodes(node) {
      while (node.firstChild) node.removeChild(node.lastChild)
    }
    function replaceChildNodes(node, ...newChildNodes) {
      clearChildNodes(node)
      node.append(...newChildNodes.length && newChildNodes || node._origChildNodes || [])
    }
    function removeChilds(node, selector = '*') {
      if (!node) return
      selector ? node.querySelectorAll(selector).forEach(el => el.remove()) : clearChildNodes(node)
    }
    function isElem(node) {
      return node && node.nodeType === Node.ELEMENT_NODE
    }
    function getNthLevelParent(_node, level) {
      return eval(`_node${'.parentNode'.repeat(level)}`)
    }
    Object.defineProperties(NodeList.prototype, {
      lastTextNode: { get() { return findLast(this, node => node.nodeType === Node.TEXT_NODE) } }
    })
    async function getHeaders(url, { fromCache = false, proxy = '' } = {}) {
      url = proxy + url
      let cacheName
      if (fromCache) [cacheName] = await caches.keys()
      return Object.fromEntries(fromCache
        ? [...(await (await caches.open(cacheName)).match(url)).headers]
        : [...(await fetch(url, {
          method: 'HEAD',
          ...navigator.serviceWorker && navigator.serviceWorker.controller &&
          { headers: { '--permit': true } }
        })).headers])
    }
    async function urlApi(url = '', { useProxy, format = 'text' } = {}) {
      const proxyUrl = useProxy ? (window.proxyURLs || window.proxies || proxyURLs || proxies).pickFast() : ''
      url = String(url).trim()
      if (!url.includes('.')) url += '.com'
      if (!url.startsWith('http')) url = 'https://' + url.replace(/^\/\//, '')
      return { content: await (await fetch(proxyUrl + url))[format](), url, proxyUrl }
    }
    async function previewPage(url) {
      if (Array.isArray(url)) {
        if (url.hasOwnProperty('raw')) url = url.raw[0]
        else url = url[0]
      }
      const { content, url: normedUrl, proxyUrl } = await urlApi(url)
      return reviewAndReplaceHTML(content, {
        url: (window._repeatedlyProxyLinks ? proxyUrl : '') + new URL(normedUrl).origin
      })
    }
    function reviewAndReplaceHTML(outerHTML = '', { url = '' } = {}) {
      window._prependUrl = url
      return prependUrlToPageCustomFields(prependToHrefSrc(outerHTML))
    }
    'lk'.split(' ').forEach(alias => window[alias] = previewPage)
    const regex = {
      siteDN: /^\s*(?:<([^>]*)>\s*)?(?:https?:\/\/)?([^/?]+)/,
      dn_n_file: /^.*?\/\/(?:[^.]+\.(?=[^/]+\.(?:[^/]{3,})+\/))*(.*?\/).*?(\/?[^/]*\.(?:jpg|png)?)/,
      urlAsHref_withName: /(?<=(?:href|src|action)=")(?!http|data|javascript|blob)(?:\.?\/+|(?=[?\w]))/gy,
      urlAsHref: /^$|^(?!\/\/|http|data|javascript|blob)(?:\.?\/+|(?=[?\w]))/gy,
      urlInJSON: /(?<!tps?:|(?:if|match|replace|split)\(["']?)(?<=\s*[(:=]\s*["']?(?!data:))((?=\\?\/(?!\/)))(?!(?<=[:=])\1)/g,
      urlInJSON_fileX: /(?<=["'])(?=\/[^"']*\.(?:aspx?|html?))/g,
      urlInCb: /(?<=\([^/]*?["'])(?=\/(?!\/))/g
    }
    function extractHostName(url, baseUrl = location) {
      return new URL(url, baseUrl).hostname
    }
    function $find(string = '', moreNodeTags = '', node) {
      const isRegex = string instanceof RegExp
      if (!isRegex) {
        if (typeof string !== 'string') return
        string = string.toLowerCase()
      }
      if (!(node instanceof HTMLElement)) node = contentPanel
      const walker = document.createTreeWalker(node)
        , textNodes = []
        , acceptNodeTags = 'p span summary ' + moreNodeTags
      let nodeFound
      while (nodeFound = walker.nextNode())
        acceptNodeTags.includes(nodeFound.localName)
          && (!string
            || (isRegex
              ? string.test(nodeFound.innerText)
              : nodeFound.innerText.toLowerCase().includes(string)
            )
          )
          && textNodes.push(nodeFound)
      return textNodes
    }
    ;
    const $test = {
      observe({ targets, elem } = {}, cbFn) {
        let targetsDo = Array.isArray(targets)
          , elemDo = elem instanceof HTMLElement
        if (!(targetsDo || elemDo)) {
          console.error('Arg #1 should be:\n  { targets?: [], elem?: HTMLElement }')
          return
        }
        if (typeof cbFn !== 'function') {
          console.error('Arg #2', cbFn, 'is not a function.')
          return
        }
        if (targetsDo) {
          targets = targets.filter(Boolean)
          targetsDo = fn => targets.forEach(target => target && fn(target))
          targetsDo(_ => _.underObservation = cbFn)
        }
        if (elemDo) {
          elemDo = new MutationObserver(([m]) => {
            console.log(m.addedNodes)
            cbFn()
          })
          elemDo.observe(elem, { childList: true })
        }
        window.addEventListener('dblclick', () => {
          targetsDo && targetsDo(_ => delete _.underObservation)
          elemDo && elemDo.disconnect()
          console.log(`${this.observe.name}() ended.`)
        }, { once: true })
        console.log(
          'Started to monitor modification in', [...targets, elem].filter(Boolean), '\n\n',
          ' Double-click the page to end monitoring.'
        )
      },
      img: {
        find() {
          posterSize = 'small'
          debug = false
          testMode = true
          concurrency.limit = 100
          document.body.querySelector('#btn-search').click()
          document.body.querySelector('[data-target-id="imgPanel"]').click()
          cmds.expandAll()
          return { 'ID count': imgPanel.childElementCount }
        },
        loadObser() {
          return $test.observe(
            { targets: [concurrency, checkPool] },
            () => console.log(imgLoadObser())
          )
        },
        checkNotFound() {
          let remain = document.body.querySelectorAll('summary'), vv, remainCount = remain.length
          Array.prototype.forEach.call(remain, v => (
            vv = v.nextSibling.firstChild,
            vv.localName === 'img' && vv.width
            && (--remainCount, vv.closest('details').remove())
          ))
          return remainCount
        }
      }
    }
    function $list() {
      return {
        awesome: $reap('😍'), fav: $reap('💗'), like: $reap('👍'),
        lastID: lastID || imgPanel.lastChild && imgPanel.lastChild.firstChild.innerText || undefined,
        time: dateToFileName(false)
      }
    }
    function $reap(str) {
      return $find(str).map(v => v.closest('details').firstChild.textContent)
    }
    function download(filename, text) {
      Object.assign(document.createElement('a'), {
        href: 'data:text/plain;charset=utf-8,' + encodeURIComponent(text),
        download: filename
      }).click()
    }
    function paramsFromUrl() {
      return window.location.search
        ? decodeURI(window.location.search)
          .match(/\w.*/g)[0]
          .match(/[^&=]+[^&]+/g)
          .map(v => v
            .split(/[\s,]+|(?<!\+)\+(?!\+)/)
            .map(u => (u = u.match(/[^=]+/g), u && (u[1] ? u[1] : u[0])))
          )
          .flat()
          .filter(Boolean)
        : []
    }
    async function tryTwice(f, cie) {
      if (typeof f !== 'function') return
      try { return await f() }
      catch (_) {
        console.error(_)
        try { return await f() }
        catch (e) { cie && console.info(e) }
      }
    }
    function doItTimes(doThing, times = 2, interval = 1000) {
      if (typeof doThing !== 'function') throw TypeError('The first function parameter is missing.')
      times = +times
      if (!times) return
      let tID, _times = 0
      _setTimeout()
      function _setTimeout() {
        doThing()
        clearTimeout(tID)
        if (++_times >= times) return
        tID = setTimeout(_setTimeout, interval)
      }
    }
    function setTransiently_noReturn() {
      noReturn = true
      setTimeout(() => noReturn = false)
    }
    ;
    const requestPersistentStorage = cb =>
      navigator.storage && navigator.storage.persist &&
      navigator.storage.persisted().then(persistent => persistent
        ? cb('already')
        : navigator.storage.persist().then(granted =>
          cb(granted ? 'allowed' : false)
        )
      )
    const concurrency = new Proxy({ limit: 3, ongoingSet: new Set, totalSet: new Set }, {
      get(t, k) {
        switch (k) {
          case 'current': return t.ongoingSet.size
          case 'add': case 'launch': case 'delete':
            t.underObservation && t.underObservation()
            return ID => (
              k !== 'add' && (
                k === 'launch' && (k = 'add'),
                t.ongoingSet[k](ID)
              ),
              t.totalSet[k](ID)
            )
          default: return Reflect.get(...arguments)
        }
      },
      set(t, k) {
        t.underObservation && t.underObservation()
        Reflect.set(...arguments)
        if (t[k] < 0) t[k] = 0
        return true
      }
    })
    function pickKeys(obj, keys, newObj = {}) {
      if (typeof newObj !== 'object') throw Error('Arg#3 is not an object')
      if (!obj) return null
      if (typeof keys === 'string') keys = keys.split(/,? +/)
      if (!Array.isArray(keys)) throw TypeError('Keys should be of type Array.')
      keys.forEach(key => obj[key] !== undefined && (newObj[key] = obj[key]))
      return newObj
    }
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
    function getInheritedEnumerableKeys(obj) {
      let keys = []
      switch (true) {
        case typeof obj === 'string':
          obj = String.prototype; break
        case Array.isArray(obj):
          obj = Array.prototype; break
        default:
          for (const key in obj) !Object.hasOwnProperty.call(obj, key) && keys.push(key)
      }
      keys = [...new Set(keys.concat(Object.getOwnPropertyNames(obj)))]
      return keys
    }
    ;
    Array.prototype.flat
      ||
      Object.defineProperty(Array.prototype, 'flat', {
        value(d = 1) {
          return d > 0
            ? Array.prototype.reduce.call(this, (acc, val) => acc.concat(Array.isArray(val) ? Array.prototype.flat.call(val, d - 1) : val), [])
            : Array.prototype.slice.call(this)
        }
      })
    Array.prototype.flatMap
      ||
      Object.defineProperty(Array.prototype, 'flatMap', {
        value(mapFunction) {
          return Array.prototype.concat.apply(Array.prototype, this.map(mapFunction))
        }
      })
    Array.prototype.at
      ||
      Object.defineProperty(Array.prototype, 'at', {
        value: at
      })
    Object.fromEntries
      ||
      Object.defineProperty(Object, 'fromEntries', {
        value(entries) {
          if (!entries || !entries[Symbol.iterator])
            throw new Error('Object.fromEntries() requires a single iterable argument')
          return [...entries].reduce((obj, [key, val]) => (obj[key] = val, obj), {})
        }
      })
    String.prototype.matchAll
      ||
      Object.defineProperty(String.prototype, 'matchAll', {
        value: function* (regexp) {
          const flags = regexp.global ? regexp.flags : regexp.flags + 'g'
          const re = new RegExp(regexp, flags)
          let match
          while (match = re.exec(this)) yield match
        }
      })
    String.prototype.replaceAll
      ||
      Object.defineProperty(String.prototype, 'replaceAll', {
        value(str, newStr) {
          return this.replace(new RegExp(str, 'g'), newStr)
        }
      })
    String.prototype.at
      ||
      Object.defineProperty(String.prototype, 'at', {
        value: at
      })
    function at(n) {
      n = Math.trunc(n) || 0
      if (n < 0) n += this.length
      if (n < 0 || n >= this.length) return undefined
      return this[n]
    }
    ;
    const boundaryChars = {
      general: [...'~`!@#%^&*()+=|\\{}[\]:;"\'<>,.?/-'],
      blank: /\s/,
      prop: {
        general: /^(?:\s*[^\s.~`!@#%^&*()+=|\\{}[\]:;"'<>,?/-]+\s*\.\s*)+$/,
        last: /^\s*\.?\s*$/,
        bracket: [
          /\s*([^\s~`!@#%^&*()+=|\\{}[\]:;"'<>,?/-]+)\s*\[(["'`])(?<!\\)\2]\s*$/,
          /\s*([^\s~`!@#%^&*()+=|\\{}[\]:;"'<>,?/-]+(?:\s*\[(["'`])(?:(?!\2).|\\\2)*?(?<!\\)\2]\s*)*)(?:\s*\[(["'`])(?:(?!\3).|\\\3)*?(?<!\\)\3]\s*)$/
        ]
      }
    }
    const brackets = {
      left: ['{', '[', '(', '<'],
      right: ['}', ']', ')', '>'],
      pair(char) { return this.right[this.left.indexOf(char)] || this.left[this.right.indexOf(char)] }
    }
    brackets.regex = RegExp(`([${[brackets.left, ...brackets.right].map(char => `\\${char}`)}])`)
    Object.entries(brackets).forEach(function ([k, v]) {
      if (!Array.isArray(v)) return
      this[k]._regexp = RegExp(`(?:${v.map(v => `\\${v}`).join('|')})\\s*$`)
      this[k].test = str => str && this[k]._regexp.test(str)
    }, brackets)
    const quotes = [...'"\'`']
    const leftPairs = [...brackets.left, ...quotes]
    const rightPairs = [...brackets.right, ...quotes]
    const pairs = [...new Set([...leftPairs, ...rightPairs])]
    function tryMatch(str = '', regex = /./) {
      return (str.match(regex) || []).pop()
    }
    tryMatch.placeholder = []
    function $str(obj, space = 2) {
      return JSON.stringify(obj, null, space)
    }
    function strPad(space) {
      return space === undefined || space === '' ? 2 : !isNaN(+space) ? +space : space.replace(/["'`]/g, '')
    }
    function evalStr(str, _this) {
      str = String(str)
      if (!_this) _this = this || {}
      try { return eval(`\`${str}\``) }
      catch (_) { return eval(`\`${str.replace(/(?<=\$\{)([\w$]+)/g, '(_this.$1 ?? $1)')}\``) }
    }
    window.__currUrl = ''
    Object.defineProperty(window, '_currUrl', {
      get() { return this.__currUrl },
      set(v) {
        CORSViaGM._currUrl = this.__currUrl = v
        navigator.serviceWorker.controller.postMessage({
          type: 'set',
          value: { _currUrl: v }
        })
      }
    })
    function prependToHref(host, href, _href) {
      if (_href) [host, href] = [href, _href]
      if (Array.isArray(host)) [host] = host
      regex.urlAsHref.lastIndex = 0
      if (regex.urlAsHref.test(href)) href = `${host}${!host.endsWith('/') && !href.startsWith('/') ? '/' : ''}${href}`
      return href
    }
    function prependToHrefOn(host, elem) {
      elem.setAttribute('href', prependToHref`${host}${elem.getAttribute('href')}`)
    }
    function prependToHrefSrc(html = '', url = '') {
      _currUrl = resolve_prependUrl(url)
      regex.urlAsHref_withName.lastIndex = 0
      return html.replace(regex.urlAsHref_withName, prependWhatToHrefSrc)
    }
    function prependWhatToHrefSrc(matched) {
      switch (matched) {
        default:
        case '':
        case '/': return `${_currUrl}${_currUrl.endsWith('/') ? '' : '/'}`
        case '//': return 'https:'
      }
    }
    function prependUrlToPageCustomFields(html = '', url = '') {
      _currUrl = resolve_prependUrl(url)
      return html
        .replace(regex.urlInCb, _currUrl)
        .replace(regex.urlInJSON_fileX, _currUrl)
        .replace(regex.urlInJSON, _currUrl)
    }
    function resolve_prependUrl(url) {
      return url || window._prependUrl || ''
    }
    function removeBlankInHTML(html = '') {
      return html.replace(/ {2,}|\r?\n/g, '')
    }
    function tmplStr(strArr = [''], fn = _ => _) {
      return interleave(
        strArr[0].map(fn),
        Array.prototype.slice.call(strArr, 1).map(fn)
      ).join('')
    }
    function urlsStrToRegExp(str) {
      return RegExp(
        `\\b(?:(${str
          .trim()
          .replace(/(?!<\\)\((?![:=!<])/g, '(?:')
          .replace(/\s+\|\s+/g, '|')
          .replace(/\./g, '\\$&')
          .split(/,\s*/)
          .join(')|(')
        }))`
      )
    }
    function parseStrToNumRange(str = '0..10++2') {
      return range(...str.match(/(-?\d+)/g).map(Number))
    }
    function splitTags(html) {
      return html.split(/<[^>]+>/).filter(Boolean)
    }
    ;
    Object.defineProperty(HTMLImageElement.prototype, '_pickPixel', { value: pickPixel })
    function pickPixel(x, y) {
      const img = this ?? pickPixel._img
      const canvas = pickPixel._canvas ??= (console.log(`document.createElement('canvas')`), document.createElement('canvas'))
      const ctx = pickPixel._ctx ??= canvas.getContext('2d')
      if (img !== pickPixel._img) {
        [canvas.width, canvas.height] = [img.naturalWidth, img.naturalHeight]
        ctx.drawImage(img, 0, 0)
      }
      pickPixel._img = img
      const pixel = ctx.getImageData(x, y, 1, 1)
      const [r, g, b, α] = pixel.data
      return [r, g, b, α / 255]
    }
    async function imgCORS(url) {
      return Object.assign(new Image(), { src: URL.createObjectURL(await (await fetch(url)).blob()) })
    }
    ;
    function proxyTracer(proxies = []) {
      return Object.defineProperties(proxies,
        {
          fetch: {
            value(url, requestInit) {
              if (!requestInit) requestInit = {}
              if (!requestInit.hasOwnProperty('autoRetry')) requestInit.autoRetry = true
              return this.for(url).fetch(requestInit)
            }
          },
          for: {
            value(url) {
              if (Array.isArray(url)) url = url[0]
              if (typeof url !== 'string') console.info('The URL', url, 'is not a string.')
              const proxyURL = this.prepareFor(url)
              return {
                fetch: requestInit => fetch(proxyURL + url, requestInit)
                  .then(res => {
                    this.fetched(proxyURL, url)
                    if (!res.ok) throw ({ status: res.status, statusText: res.statusText })
                    return res
                  })
                  .catch(e => {
                    this.reportUnusable(proxyURL, 'error')
                    if (requestInit.autoRetry-- > 0) return this.fetch(url, requestInit)
                    throw e
                  }),
                reportUnusable: err => this.reportUnusable(proxyURL, err)
              }
            }
          },
          prepareFor: {
            value(url, pickFast) {
              !(url && (typeof url === 'string' || Array.isArray(url.raw)))
                ? url = ''
                : url.raw && (url = url[0])
              const proxyURL = pickFast ||
                this.stats.has(this.currChoose) && this.stats.get(this.currChoose).unusable
                ? this.pickFast(true)
                : this.currChoose = this.currChoose || this[0] || ''
              const { urlsMap } =
                this.stats.get(proxyURL) ||
                this.stats.set(proxyURL, {
                  urlsMap: new Map, totalTime: 0, count: 0, allTimeScore: -0.00001
                }).get(proxyURL)
              urlsMap.set(url, boundStamp())
              return proxyURL
            }
          },
          currChoose: { value: '', writable: true },
          switchNext: {
            value() {
              let idx = this.indexOf(this.currChoose)
              !~idx || idx === this.length - 1 ? idx = 0 : ++idx
              this.currChoose = this[idx]
            }
          },
          stats: { value: new Map },
          fetched: {
            value(proxyURL, url) {
              const pU = this.stats.get(proxyURL)
              const { urlsMap } = pU
              const { [`in${$bStamp}`]: inB, [`out${$bStamp}`]: outB } = boundStamp(urlsMap.get(url))
              let { totalTime, count, allTimeScore } = pU
              ++count
              totalTime += (inB - outB) / 1000
              allTimeScore += count / totalTime
              Object.assign(pU, { allTimeScore, totalTime, count })
              urlsMap.delete(url)
            }
          },
          lastSortingTime: {
            value: currPageTime(), writable: true
          },
          pickFast: {
            value(force) {
              return this.sortProxies(force)[0].url
            }
          },
          sortedProxies: {
            get() {
              if (this._sortedProxies && this._sortedProxies.noNeed)
                return this._sortedProxies
              this._sortedProxies = this.map(url => ({
                url, ...pickKeys(this.stats.get(url), ['allTimeScore', 'unusable'])
              }))
              this._sortedProxies.noNeed = true
              return this._sortedProxies
            }
          },
          sortProxies: {
            value(force) {
              if (force) this._sortedProxies && delete this._sortedProxies.noNeed
              else if (currPageTime() - this.lastSortingTime < 500) return this.sortedProxies
              this.lastSortingTime = currPageTime()
              return this.sortedProxies.sort((a, b) =>
                a.allTimeScore && b.allTimeScore === undefined ? 1 :
                  a.unusable ? 1 :
                    b.unusable ? -1 :
                      b.allTimeScore - a.allTimeScore
              )
            }
          },
          reportUnusable: {
            value(proxyURL, reason) {
              if (!(reason && this.stats.has(proxyURL))) return
              this.stats.get(proxyURL).unusable = reason
              this.sortProxies(true)
            }
          }
        }
      )
    }
    const $bStamp = 'bound_timestamp'
    function boundStamp(obj) {
      return Object.assign(obj || {}, {
        [`${obj ? 'in' : 'out'}${$bStamp}`]: currPageTime()
      })
    }
    class LoadTimeTracking {
      constructor(urls) {
        this.threshold = [
          [500, 'very_good', 0],
          [1500, 'good', 0.05],
          [3000, 'slow', 1],
          [7500, 'too_slow', 5],
          [15000, 'timed_out', 75],
        ]
        this.tolerance = this.threshold[
          Math.round(this.threshold.length / 2 - 0.1)
        ][0]
        urls && this.forUrls(urls)
      }
      forUrls(urls) {
        let site, type
        this.siteRecs = {}
        this.siteSort = []
        urls.forEach((url, i) => (
          { site, type } = regex.matchDN(url),
          !this.siteRecs[site] && (
            this.siteRecs[site] = { queue: new Map() },
            this.siteSort.push([site, 0])
          ),
          this.siteRecs[site][type] = urls[i].replace(/^\s*(?:<([^>]*)>)?\s*/, '')
        ))
        this.domains = this.siteSort.map(s => ([s] = s, s))
        return this.siteRecs
      }
      trace(srcLink, regulate) {
        const siteDN = regex.matchDN(srcLink).site
          , siteRec = this.siteRecs[siteDN]
        if (siteRec.queue.has(srcLink)) {
          siteRec.latestTimeUsed = Date.now() - siteRec.queue.get(srcLink).startAt
          if (!isNaN(regulate)) siteRec.latestTimeUsed *= regulate
          if (typeof regulate === 'function') siteRec.latestTimeUsed = regulate(siteRec.latestTimeUsed)
          siteRec.queue.delete(srcLink)
          this.sortedSites = updateSiteSort(this.siteSort, [siteDN, siteRec.latestTimeUsed], this.threshold)
          typeof this.decision === 'function' && this.decision({
            sortedSites: this.sortedSites.map(([siteDN]) => siteDN)
          })
        }
        else {
          siteRec.queue.set(srcLink, { startAt: Date.now() })
          setTimeout(() => siteRec.queue.has(srcLink) && (
            this.trace(srcLink)
          ), this.tolerance)
        }
      }
    }
    Object.assign(regex, {
      matchDN(url) {
        if (!url) return null
        let [, type, site] = url.match(this.siteDN)
        type = type && (type = type.trim()) ? type : 'main'
        return { type, site, toString() { return site } }
      }
    })
    function updateSiteSort(siteRecs, [siteDomainName, latestTimeUsed], evaluation_indicator) {
      if (!evaluation_indicator) evaluation_indicator = [[0, 'unrated', 0]]
      if (!evaluation_indicator.rotationRate) {
        evaluation_indicator.rotationRate = new Map(evaluation_indicator.map(
          ([, grade, eliminated_index]) => [grade, eliminated_index]
        ))
        evaluation_indicator.rotationRate.rotation_chance = function (siteRec) {
          return this.get(siteRec[2] || evaluation_indicator[0][1]) * Math.random()
        }.bind(evaluation_indicator.rotationRate)
      }
      function siteRecs_shuffle() {
        return siteRecs.sort((rec1, rec2) => Reflect.apply(
          function (a, b) { return this.rotation_chance(a) - this.rotation_chance(b) },
          evaluation_indicator.rotationRate, [rec1, rec2]
        ))
      }
      const siteIdx = siteRecs.findIndex(([siteDN]) => siteDomainName === siteDN)
        , [, grade] = evaluation_indicator.find(([timeLimit], i, arr) =>
          latestTimeUsed <= timeLimit || i === arr.length - 1)
      siteRecs[siteIdx] = [siteDomainName, latestTimeUsed, grade]
      const relρ = i =>
        siteRecs.length <= 1 ? 0
          : i < siteRecs.length - 1 && latestTimeUsed > siteRecs[i + 1][1] ? 1
            : i !== 0 && latestTimeUsed < siteRecs[i - 1][1] ? -1 : 0
        , relρOfSite = relρ(siteIdx)
      if (!relρOfSite) return siteRecs_shuffle()
      let i = siteIdx
      const relρConds = {
        '-1': {
          cond: () => relρ(i) === -1,
          count: () => --i,
          do: () => [siteRecs[i - 1], siteRecs[i]] = [siteRecs[i], siteRecs[i - 1]]
        },
        1: {
          cond: () => relρ(i) === 1,
          count: () => ++i,
          do: () => [siteRecs[i], siteRecs[i + 1]] = [siteRecs[i + 1], siteRecs[i]]
        }
      }
      for (;
        relρConds[relρOfSite].cond();
        relρConds[relρOfSite].count()
      ) relρConds[relρOfSite].do()
      return siteRecs_shuffle()
    }
    ;
    const CSSRelaxTime = 1000
    const globalStyle = {
      set(key, val) {
        document.documentElement.style.setProperty(key, val)
      },
      get(key, numType) {
        let val = document.documentElement.style.getPropertyValue(key)
        if (numType) val = parseInt(val)
        return val
      }
    }
    function calcOffset(elem) {
      const offset = { left: 0, top: 0 }
      do {
        !isNaN(elem.offsetLeft) && (offset.left += elem.offsetLeft)
        !isNaN(elem.offsetTop) && (offset.top += elem.offsetTop)
      } while (elem = elem.offsetParent)
      return offset
    }
    function drawRipple(evt) {
      const div = document.createElement('div')
        , elem = evt.target
        , { left, top } = calcOffset(elem)
      div.classList.add('ripple')
      elem.appendChild(div)
      div.style.width = div.style.height = `${Math.hypot(elem.clientWidth, elem.clientHeight)}px`
      div.style.top = `${evt.pageY - top - div.clientHeight / 2}px`
      div.style.left = `${evt.pageX - left - div.clientWidth / 2}px`
      div.classList.add('rippleEffect')
      div.style.backgroundColor = 'currentColor'
      div.addEventListener('animationend', () => div.remove())
    }
    function setLock(stateObj, target) {
      if (stateObj instanceof Element) [stateObj, target] = [target, stateObj]
      const stateRec = {
        lock() { this.locking = true },
        unlock() { this.locking = false },
        softLock(time = CSSRelaxTime) {
          clearTimeout(this.lockingTimeSigil)
          this.lock()
          this.lockingTimeSigil = setTimeout(() => {
            this.unlock()
            delete this.lockingTimeSigil
          }, time)
        }
      }
      if (stateObj) return Object.assign(stateObj, stateRec)
      if (target) return target.cssLock = stateRec
    }
    function fadeOut(element,
      { delay: { before: delayBefore = 3000, after: delayAfter = 1000 } } = { delay: {} }) {
      element.classList.add('fadeOuting')
      let opacity = 1
      setTimeout(function decrease() {
        window._something_is_fadeouting = true
        opacity -= 0.001
        if (opacity <= 0.75) {
          setTimeout(() => element.remove(), delayAfter)
          delete window._something_is_fadeouting
          return
        }
        element.style.opacity = opacity
        requestAnimationFrame(decrease)
      }, delayBefore)
    }
    window.restartAnimation = restartAnimation
    function restartAnimation(elem, animationName, { sideClass } = {}) {
      if (!elem) return
      if (!animationName) return elem.replaceWith(elem)
      if (!(typeof animationName === 'string' || Array.isArray(animationName))) return
      if (typeof animationName === 'string' && animationName.includes(' ')) animationName = animationName.split(' ')
      if (Array.isArray(animationName)) return animationName.forEach(a => restartAnimation(elem, a, { sideClass }))
      elem.classList.remove(animationName)
      void elem.offsetWidth
      elem.classList.add(animationName)
      if (typeof sideClass === 'string') sideClass = sideClass.split(' ')
      Array.isArray(sideClass) && sideClass.forEach(cls => elem.classList.add(cls))
    }
    window.foldToTopAndRemove = foldToTopAndRemove
    function foldToTopAndRemove(elem) {
      elem.addEventListener('animationend', () => elem.remove(), { once: true })
      elem.classList.add('unfold-from-top-inverse')
    }
    function isScrollableOverflow(elem) {
      return elem && elem.scrollWidth > elem.clientWidth
    }
    function isViewOverflow(elem) {
      return elem && elem.scrollWidth > document.documentElement.clientWidth
    }
    function isMouseOn({ x, y, target } = {}, elem) {
      if (elem === false) return false
      elem = (elem || document).elementFromPoint(x, y)
      if (elem === target) return true
      return isMouseOn({ x, y, target }, elem && elem.shadowRoot || false)
    }
    parent.initForStyleSmoothly = initForStyleSmoothly
    function initForStyleSmoothly(elem, originalStyle,
      { customPrefix = 'expanded', observe } = {}
    ) {
      if (elem.style.getPropertyValue('--expanded-height')) return elem
      if (typeof originalStyle === 'string') originalStyle = Object.fromEntries(originalStyle.split(/,? +/).map(v => [v, 0]))
      if (!originalStyle) originalStyle = pickKeys(getComputedStyle(elem), 'height, width')
      const inlineProps = Object.keys(originalStyle)
      if (!/^--[\S]+-$/.test(customPrefix)) customPrefix = `--${customPrefix}-`
      inlineProps.forEach(prop => {
        if (observe) elem.style[prop] = originalStyle[prop]
        customPrefix && elem.style.setProperty(customPrefix + prop, originalStyle[prop])
      })
      new MutationObserver(updateStyleSmoothly.bind(elem, inlineProps, { customPrefix }))
        .observe(this instanceof Element && this || elem, {
          childList: true, characterData: true, subtree: true
        })
      return elem
    }
    function updateStyleSmoothly(elem, inlineProps = [], opts = {}) {
      if (this && Array.isArray(elem) || typeof elem === 'string') {
        [elem, inlineProps, opts] = [this, elem, inlineProps]
      }
      if (!(elem instanceof HTMLElement)) throw TypeError(`Param elem ( ${elem} ) not type of HTMLElement`)
      if (!elem._computedStyle) elem._computedStyle = getComputedStyle(elem)
      if (typeof inlineProps === 'string') inlineProps = inlineProps.split(' ')
      if (inlineProps && inlineProps.constructor === Object) {
        if (inlineProps.all === '') {
          inlineProps.transition =
            elem.style.transition || inlineProps.transition || '0.4s'
        }
        opts = { style: inlineProps }
        inlineProps = Object.keys(inlineProps)
        if (
          elem.style.transition ||
          elem._computedStyle.transitionDuration === '0s' ||
          inlineProps.includes('all') ||
          !inlineProps.some(
            function (prop) { return this.has(prop) },
            new Set(elem._computedStyle.transitionProperty.split(', '))
          )
        ) {
          opts.style.transition = elem.style.transition =
            elem.style.transition ||
            `${parseFloat(elem._computedStyle.transitionDuration) || 0.4}s`
        }
      }
      if (!Array.isArray(inlineProps)) throw TypeError(`Param \`inlineProps\` ( ${inlineProps} ) not type of Object.`)
      const { customPrefix, style } = opts || {}
      const customProps = customPrefix ? inlineProps.map(prop => customPrefix + prop) : []
      const records = {}
      if (!elem._styleBackup) elem._styleBackup = {}
      const gotCompletelyRestore = style && style.all === ''
      if (gotCompletelyRestore) {
        inlineProps = [...new Set(inlineProps.concat(Object.keys(elem._styleBackup)))]
        Object.entries(elem._styleBackup).forEach(([k, v]) => v !== '' && (style[k] = v))
      }
      inlineProps.forEach(prop => {
        elem._styleBackup[prop] = records[`old_${prop}`] =
          elem.style[prop] || elem._computedStyle[prop]
      })
      if (gotCompletelyRestore) delete elem._styleBackup;
      [...inlineProps, ...customProps].forEach(prop => elem.style.setProperty(prop, ''))
      let newProp
      const newStyle = prop => {
        if (style) newProp = style[prop]
        return newProp !== undefined ? newProp : elem._computedStyle[prop]
      }
      inlineProps.forEach(prop => elem.style.setProperty(
        customPrefix + prop,
        records[`new_${prop}`] = newStyle(prop)
      ))
      const setProps = fresh => inlineProps.forEach(prop =>
        elem.style[prop] = records[`${fresh}_${prop}`]
      )
      requestAnimationFrame(() => {
        setProps('old')
        requestAnimationFrame(() => {
          setProps('new')
          elem._stylePropsChanged = inlineProps.join(' ')
        })
      })
      return elem
    }
    function css_collapseOrExpandSmoothly(elem, { collapsedHeight, collapsedClass }) {
      let collapsed
      initForStyleSmoothly(elem)
      updateStyleSmoothly(elem, {
        height: elem.clientHeight && Math.floor(elem.clientHeight) !== Math.floor(parseFloat(collapsedHeight))
          ? collapsed = (collapsedHeight && typeof collapsedHeight === 'number' && (collapsedHeight += 'px'), collapsedHeight || 0)
          : elem.style.getPropertyValue('--expanded-height')
      })
      collapsed = collapsed !== undefined
      elem[`${collapsed ? 'set' : 'remove'}Attribute`]('collapsed', '')
      collapsedClass && elem.classList[collapsed ? 'add' : 'remove'](collapsedClass)
    }
    ;
    const pageStartTime = Date.now()
    function currPageTime() {
      return document.timeline ? document.timeline.currentTime : (Date.now() - pageStartTime) / 1000
    }
    function compactTimeString(timeString = Date(), compact = true) {
      return dateToFileName(new Date(Date.parse(timeString)), 0, 0)
        .replace(compact ? /\D/g : '', '')
    }
    function dateToFileName(date = new Date(), replaceColon = true, keepGMT = true) {
      if (date.toString() === 'Invalid Date') {
        date = new Date()
      }
      else if (date.constructor !== Date) {
        replaceColon = date
        date = new Date()
      }
      return date.toJSON().replace(/T.*/, '') + ' ' +
        date.toTimeString()
          .replace(/0* \(.*/, '')
          .replace(replaceColon ? /:/g : /^$/, '꞉')
          .replace('GMT+0', 'GMT+')
          .replace(keepGMT ? '' : / ?GMT.*/, '')
    }
    function timeoutIn(timeout = 3, { taskName, rival, log, doneAt, fallback, cLog } = {}) {
      const startAt = Date.now()
      const over = res => res(typeof fallback === 'function' ? fallback() : fallback)
      const _log = signal => log !== false && log !== undefined && (
        typeof signal === 'string'
          ? typeof log === 'function' ? log(timeout, signal) : console.log(log)
          : typeof signal !== 'function' && console.log(`${taskName ? `${taskName}: ` : ''}Timed out (${timeout} seconds have passed).`)
      )
      let done
      rival && rival.constructor === Promise && rival.then(() => {
        done = true
        log && (
          () => {
            const _case = String(log.check).toLowerCase()
            switch (_case) {
              case 'abort': case 'cancel':
                _log(log.check)
                break
              case '[object object]':
              case 'success': case 'done': case 'ok':
              default:
                typeof cLog === 'function' && cLog(
                  log.check,
                  `${taskName || 'Task'} was completed in ${typeof doneAt === 'function'
                    ? ((doneAt() - startAt - (rival._delay * 1000 || 0)) / 1000).toFixed(3)
                    : `less than ${timeout}`
                  } seconds.`
                )
            }
          }
        )()
      })
      return new Promise(res => setTimeout(() => {
        if (done) return
        over(res)
        _log(log === undefined ? log : log && log.check || log)
      }, timeout * 1000))
    }
    function getHHMM(date = new Date, str = true) {
      const dArr = [date.getHours(), date.getMinutes()].map(v => String(v).padStart(2, 0))
      return str ? dArr.join(':') : dArr.map(Number)
    }
    function isHHMMInRange(timeRange = [getHHMM(), getHHMM()], value = getHHMM()) {
      timeRange.overnight && timeRange[0] <= timeRange[1] && timeRange.reverse()
      return timeRange.overnight
        ? timeRange[0] <= value || value <= timeRange[1]
        : timeRange[0] <= value && value <= timeRange[1]
    }
    function sleep(seconds = 1) {
      return new Promise(r => setTimeout(r, seconds * 1000))
    }
    function numOfYearsSince(date) {
      return ((Date.now() - new Date(date)) / (365 * 86400000)).toPrecision(3).replace(/\.0+$/, '')
    }
    function setIntervalTillTrue(fn, interval = 1000) {
      if (fn()) return
      fn._itvId = setInterval(res => (res = fn()) && (clearInterval(fn._itvId), console.log(fn.name, res)), interval)
    }
    function slightlyThrottle(fn) {
      let tID
      return function () {
        clearTimeout(tID)
        tID = setTimeout(fn.bind(this))
      }
    }
    ;
    function fampl(text, convertToOutput) {
      const { keysValsMap, keysValsPairs, texts } = extractText(text)
      if (convertToOutput) text = resFullText(texts)
      return { keysValsMap, keysValsPairs, ...convertToOutput && { text } }
    }
    const re = {
      blank: /(^\s+$\n?)/g,
      title: /^(#.*|.+\r?\n-{3,})\r?\n/,
      k_t_v: {
        keys: /{(?!`)\s*((?:\\{|\\}|[^{};\r\n]|\s*,\s*)+?)\s*}/,
        to: /(\s*(?:[=-]>|[→:])\s*)/,
        vals: /(?:\[\s*((?:\\\[|\\]|[^[\];])+?)\s*]|((?:[^[{;\r\n](?!\\[\\ ]))+))/,
      },
      k_s_v: {
        keys: /{`((?:\\{`|\\`}|[^](?!{`|`})|[^](?=`}\s*[=-]>))+?)`}/,
        vals: /\[`((?:\\\[`|\\`]|[^](?!`]|{`)|[^](?=`]\r?\n))+?)`]/,
      },
      els: /(.*\r?\n)/
    }
    re.ktv = [
      '(?!\\s*[\\\\]+)[^\\n{\\\\]*', '(?:', re.k_s_v.keys, '|', re.k_t_v.keys, ')', re.k_t_v.to,
      '(?:', re.k_s_v.vals, '|', re.k_t_v.vals, ')', '(?:\\r?\\n)?'
    ].map(s => s.source || s).join('')
    const reOfspreadKeys = /(?:([^(,]+)|\(\s*([^)]+?)\s*\))([^,]*)/g
    const spreadKeys = (keys, head = '', count = 0) => {
      keys = keys.replace(
        reOfspreadKeys,
        (_match, conti, combi, tail) =>
          (conti || combi).split(/\s*\|\s*/)
            .map(c => (
              spreadKeys(tail, c, count + 1)
                .split(', ')
                .map(c => head + c).join(', ')
            )).join(', ')
      ) || head
      return (count ? keys : keys.replace(/ *, */g, ', '))
    }
    const ktvs = (keys, vals, [sKey, sVal]) => (
      (
        sKey
          ? keys = [`\`${keys}\``]
          : keys && (
            keys = spreadKeys(keys).split(/\s*,\s*/)
          ),
        sVal
          ? vals = [`\`${vals}\``]
          : vals && (
            vals = vals.trim().split(/\s*,\s*/)
          )
      ),
      { keys, vals }
    )
    const extractText = text => {
      const matchAllText = [...text.matchAll(RegExp(
        `${re.title.source}|${re.ktv}|${re.blank.source}|${re.els.source}`, 'gm'
      ))]
        , keysValsMap = {}
        , keysValsPairs = []
        , segmentPoints = []
      let heading
      const texts = matchAllText.map((v, i) => {
        let [, title, sKey, keys, to, sVal, vals, val, blank, els] = v
        let lineContent = (
          blank !== undefined && (segmentPoints.hitSp = i, blank)
          || els !== undefined && els
          || title && (segmentPoints.push(i), (heading = title) + '\r\n')
          || (
            { keys, vals } = ktvs(keys || sKey, val || vals || sVal, [sKey, sVal]),
            keysValsPairs.push([keys, vals]),
            keys.forEach(key => keysValsMap[key] = vals),
            heading && (vals['#heading'] = heading.replace(/^#+|-+$/, '').trim()),
            keys = sKey ? `{${keys}}` : `{ ${keys.sort().join(', ')} }`,
            to = sVal ? to : ` ${to.trim()} `,
            vals = sVal ? `[${vals}]` : `[ ${vals.join(', ')} ]`,
            `  ${keys}${to}${vals}\r\n`
          )
        ).replace(/ $| {3,}$/, '')
        return lineContent
      })
      texts.segmentPoints = segmentPoints
      return { keysValsMap, keysValsPairs, texts }
    }
    const resFullText = texts => texts
      .slice(0, texts.segmentPoints[0])
      .concat(
        texts.segmentPoints
          .map((n, i, a) => texts.slice(n, a[i + 1]))
          .map(para => {
            if (para.slice(0, 3).some(s => /(don'|do no)t sort/i.test(s))) return para
            const subSeg = []
            const push = line => subSeg[subSeg.length - 1].content.push(line)
            const paraBody = para.splice(1)
            paraBody.forEach((line, pos) => {
              if (re.blank.test(line) || re.blank.test(paraBody[pos - 1]) || !subSeg.length) {
                subSeg.push({ pos, content: [] })
              }
              if (!line.startsWith('  {'))
                subSeg[subSeg.length - 1].skip = true
              return push(line)
            })
            subSeg.forEach(({ content, skip }) => !skip && content.length > 1 &&
              content.splice(0, content.length, ...content.sort((a, b) => a.localeCompare(b)))
            )
            return [para.pop(), ...subSeg.flatMap(({ content }) => content)]
          })
          .sort((a, b) => a[0].localeCompare(b[0])).flat()
      )
      .join('')
    async function genCountrySelect() {
      if (typeof allCountriesInTheWorld === 'undefined') return (await sleep(), genCountrySelect())
      const select = document.createElement('select')
      Object.entries(allCountriesInTheWorld).forEach(([categoryTitle, countries]) => {
        const optgroup = document.createElement('optgroup')
        optgroup.setAttribute('label', categoryTitle)
        optgroup.setAttribute('translate', 'no')
        countries.forEach(({ lang, name, dir }) => {
          const opt = document.createElement('option')
          opt.innerText = name
          opt.setAttribute('value', lang)
          dir === 'rtl' && opt.setAttribute('dir', 'rtl')
          optgroup.append(opt)
        })
        select.append(optgroup)
      })
      select.insertAdjacentHTML('afterbegin', `<option hidden selected>(Please select)</option>`)
      return select
    }
    ;
    let getItem = key => op(o => o.
      get(key)
    )
      , setItem = (key, value) => op(o => o.
        put(value, key), 'readwrite'
      )
      , delItem = key => op(o => o.
        delete(key), 'readwrite'
      )
      , _clearDB = () => op(o => o.
        clear(), 'readwrite'
      )
      , clearDB = () => (console.log('🗑️ Local database cleared.'), _clearDB())
      , storeName = ''
      , rebuiltIDB = dbName => (
        console.log('indexedDB will be rebuilt.'),
        indexedDB.deleteDatabase(dbName), getIDB(dbName)
      )
      , onerror = e => { console.error(e.target.error); throw e.target.error }
      , idb
      , idbInit = (dbName = '') => idb = getIDB(dbName)
      , idbUnavailable = () => {
        const idbMethods = 'getItem, setItem, delItem, clearDB'.split(', ')
        window._isBundled
          ? eval(`[${idbMethods}] = Array(4).fill(noopChain)`)
          : idbMethods.forEach(idbMethod => window[idbMethod] = noopChain)
        idb = noopChain
      }
    const noopChain = genNoopChain()
    function getIDB(dbName) {
      return new Promise(res => (function () {
        this.onupgradeneeded = () => {
          this.result.createObjectStore(storeName)
          console.log('indexedDB first time loaded.')
        }
        this.onsuccess = () => res(
          this.result.objectStoreNames.contains(storeName)
            ? window.idb = this.result
            : rebuiltIDB(dbName)
        )
        this.onerror = onerror
      }).call(indexedDB.open(dbName)))
    }
    async function getStore({ rwType = 'readonly' } = {}) {
      return (await idb).transaction(storeName, rwType).objectStore(storeName)
    }
    async function op(call, rwType) {
      call = call(await getStore({ rwType }))
      return new Promise(res => {
        call.onsuccess = () => res(call.result)
        call.onerror = onerror
      })
    }
    function genNoopChain() {
      const _noopChain = () => noopChain
      const retEmptyStr = () => ''
      const noopChain = new Proxy(_noopChain, {
        get(target, key) {
          if (target.hasOwnProperty(key)) return target[key]
          switch (key) {
            case 'then': return undefined
            case Symbol.toPrimitive: return retEmptyStr
            default: return noopChain
          }
        }
      })
      return noopChain
    }
    ;
    function dedupReviews(reviews) {
      const dup_rev = {
        set [Symbol.for()]([text, elem]) {
          if (!Array.isArray(this[text])) this[text] = [elem]
          else this[text].push(elem)
        }
      }
      reviews.forEach(rev => splitTags(rev.innerHTML).forEach(txt => dup_rev[Symbol.for()] = [txt, rev]))
      const dedup_rev = new Map
      Object.values(dup_rev).forEach(el => {
        if (el.length > 1)
          el.forEach(e => {
            dedup_rev.set(e, (dedup_rev.get(e) || 0) - 1)
          })
        else {
          el = el.pop()
          dedup_rev.set(el, (dedup_rev.get(el) || 0) + 1)
        }
      })
      const final = { sing: [], refed: [], refs: [] };
      [...dedup_rev.entries()].forEach(([el, count]) =>
        final[count > 0 ? 'sing' : count < 0 ? 'refed' : 'refs'].push(el)
      )
      final.refed.sort((a, b) => ([a, b] = [a, b].map(_ => _.innerHTML.length), a - b)).map((s, i, arr) => {
        if (i !== 0 &&
          splitTags(arr[i - 1].innerHTML).sort().join('')
          === splitTags(s.innerHTML).sort().join('')
        ) {
          delete arr[i - 1]._rec
          s._rec = true
        }
        return s
      }).forEach((el, i) => el._rec && final.sing.push(el) && delete final.refed[i])
      Object.assign(final.sing, final)
      Object.defineProperty(final.sing, 'sing_plus_refs', { get() { return this.sing.concat(this.refs) } })
      Object.defineProperty(final.sing, 'refed_plus_refs', { get() { return this.sing.concat(this.refed, this.refs) } })
      return final.sing
    }
    function preTransformReviewEl(el) {
      if (el[Symbol.iterator]) return Array.prototype.map.call(el, preTransformReviewEl)
      el.remove()
      const [tUS, tDS] = Array.prototype.map.call(el.querySelectorAll('[class^=score]:not([class*=scores])'), _ => _.innerText)
      return Object.assign(html`<p translate=no><span>${replaceBBCode(el.querySelector('textarea').innerHTML).replaceAll('\n', '<br>')}</span></p>`, { _recvScores: `👍 ${tUS}&emsp;👎 ${tDS}` })
    }
    function replaceBBCode(html) {
      return replaceBBCode._unquote(html)
        .replace(/\[(color)=[\S\s]*?\]([\S\s]*?)\[\/\1\]/g, '$2')
        .replace(/\[(b)]([\S\s]*?)\[\/\1]/g, '<b>$2</b>')
    }
    replaceBBCode._unquote = html => {
      const html_ = html.replace(/\[(quote)(?!.*?\1=)=[\S\s]*?\]([\S\s]*?)\[\/\1\]\s*/g, '<q>$2</q>')
      return html_ === html ? `${html_.replace(/(<\/q>)((?:[^](?!\1))+)$/, '$1<br>$2')}` : replaceBBCode._unquote(html_)
    }
    Object.assign(window, { getItem, setItem, delItem, clearDB })
      ;
    ;
    let dbUnavailable = false, swNotNeeded = window._isBundled ?? true
    navigator.serviceWorker
      ? idbInit('JAVivid')
      : (dbUnavailable = true, idbUnavailable())
    let isTouchDevice = window.isTouchDevice =
      navigator.userAgentData && navigator.userAgentData.mobile ||
      /Mobi|Android/i.test(navigator.userAgent) ||
      window.ontouchstart ||
      window.matchMedia('(any-hover: none)').matches
    !isTouchDevice && document.documentElement.setAttribute('desktop', true)
    window.isFirefox = +String(navigator.userAgent.match(/Firefox\/[0-9]+/) || '').split('/')[1]
    window.isChrome = /Google/.test(navigator.vendor)
    window.ChromeVersion = isChrome && navigator.userAgentData && +(navigator.userAgentData.brands.find(v => /Chrom(e|ium)/.test(v.brand)) || {}).version
    if (window.ChromeVersion === false) window.ChromeVersion = undefined
    window.isChromeMobile = isChrome && isTouchDevice
    window.isFirefoxMobile = isFirefox && isTouchDevice
    const CSSSupports = {
      hostContext: (!isFirefox || CSS.supports('selector(:host-context(_'))
        && !isTouchDevice
    }
    if (isChrome) {
      document.documentElement.style.setProperty('--code-color-tint-for-chrome', 'rgba(215, 186, 125, 0.6)')
    }
    const getLanguage = () =>
      navigator.languages && navigator.languages.length && navigator.languages[0]
      || navigator.language
      || 'en'
    window._userLang = new URL(location).searchParams.get('lang') || getLanguage()
    window._isUserLangInCJK = () => window._userLangInCJK = _userLang.startsWith('zh')
    window._isUserLangInCJK()
    const exceptRulesFrom = {}
    let remoteFetched
    const checkRemoteFetch = new Promise(fetchSucceeded => remoteFetched = fetchSucceeded)
    checkRemoteFetch._delay = 5
    exceptRulesFrom.localDB = { raw: getItem('exceptPrefixes'), _from: 'local database' }
    exceptRulesFrom.localText = { raw: localExRulesText, _from: 'local text' }
    exceptRulesFrom.onlineText = async function () {
      await sleep(checkRemoteFetch._delay)
      let aborted
      const _abort = reason => void remoteFetched(aborted = reason || aborted)
      if (!window.CORSViaGM) return _abort('was aborted because the plug-in "CORS-via-GM" was not enabled')
      await window._CORSViaGM.inited
      if (location.href.toLowerCase().includes('dev-local')) return remoteFetched('dev-local')
      const expiredThreshold = devMode ? 10 : 100
      const time = +compactTimeString()
      const hast = await (dbUnavailable
        ? undefined
        : caches.match(URLForExRules))
      const pageLastReload = await (dbUnavailable
        ? time + 2 * expiredThreshold * Math.sign((devMode ? 0 : Math.random()) - 0.5)
        : getItem('page-last-reload') || 0)
      const maybeExpired =
        (hast === undefined || hast.headers.get('--time') < time - expiredThreshold)
        && pageLastReload < time - expiredThreshold
      devMode && console.log({ maybeExpired, last: pageLastReload, curr: time })
      setItem('page-last-reload', time)
      if (!maybeExpired) return remoteFetched('cancel')
      fadeLog('Fetching the latest exception prefix rules...')
      const task = { time: Date.now(), name: 'Remote Fetch' }
      let res, lastModified
      let text = maybeExpired
        ? res = URLForExRules.length
          ? await fetch(URLForExRules[0])
            .then(_ => (
              fadeLog`${task.name} ${translateInterp(
                `was completed in ${Date.now() - task.time} ms`, /[\d.]+/, '${ms}'
              )}.`,
              _
            ))
            .catch(() => {
              URLForExRules.shift()
              URLForExRules.length
                ? fetch(URLForExRules[0])
                : _abort('was aborted because there are no more exception prefix rules')
            })
          : _abort(translate`${'`URLForExRules`'} is empty, please add some sites.`)
        : hast
      if (aborted || !text) {
        fadeLog('No more exception prefix rules.')
        return { _from: exceptRulesFrom.onlineText._from }
      }
      text = htmlDecode(await text.clone().text())
      const notRaw = text.indexOf('<custom-tag>')
      if (~notRaw) {
        text = text.substring(notRaw + '<custom-tag>'.length, text.indexOf('</custom-tag>', notRaw))
      }
      if (!dbUnavailable) {
        if (res) {
          lastModified = compactTimeString(res.headers.get('last-modified'), 0);
          (await caches.open(cacheName)).put(
            URLForExRules,
            new Response(res.body, {
              headers: new Headers({
                '--time': time,
                'last-modified': lastModified
              })
            })
          )
        }
        (await caches.open(cacheName)).delete(URLForExRules)
      }
      return { raw: text, _from: exceptRulesFrom.onlineText._from, lastModified }
    }()
    exceptRulesFrom.onlineText._from = 'online text'
    const trustLevel = 'fact > database > text > local > online'.split(' > ')
    const calcFactor = v => (v._from || '').split(' ').reduce((p, c) => p * trustLevel.indexOf(c, 1), 1)
    function mergeExRules(newER) {
      let winER = window.exceptPrefixes
      newER.raw._from = newER._from
      const count = {}
      const getCount = () => Object.keys(winER).length - 1
      if (!winER) {
        winER = window.exceptPrefixes = newER.raw
        count.now = getCount()
        devMode && console.log('Number of exception rules:', count.now, '(set up using ' + newER._from + ')')
        return winER
      }
      if (newER.raw === winER) return winER
      count.was = getCount()
      const [f1, f2] = [winER, newER].map(calcFactor)
      winER = window.exceptPrefixes = Object.assign(
        ...
        [winER, newER.raw]
        [f1 < f2 ? 'reverse' : '']()
      )
      setItem('exceptPrefixes', winER)
      count.now = getCount()
      mergeExRules._countOfNew = count.now - count.was
      devMode && console.log('Number of exception rules:', count.now, '(added', mergeExRules._countOfNew, 'from ' + newER._from + ')')
      return winER
    }
    ;
    window.urlLogFilterOut = /\.(jpg|mp4)$/
    function initImgVidUrlsLTT() {
      const _L = '_LTT', _S = 'SiteDN', _I = 'imgs', _V = 'vids'
      const srcs = (srcType, o) => ({
        [`${srcType}${_L}`]: o = new LoadTimeTracking,
        [`${srcType}${_S}s`]: o = o.forUrls(urlSchema.urls[srcType]),
        [`${srcType}${_S}`]: Object.keys(o).shift()
      })
      Object.assign(window, srcs(_I), srcs(_V), { imgSiteRandom: false })
      Object.values(window[`${_V}${_L}`].siteRecs).forEach(siteRec =>
        siteRec.hasNoSrcsForTheseIDs = new Set
      )
    }
    let urlSchema_ID_regex
    const urlSchema =
    {
      urls: {
        imgs: [
          'dmm.co.jp'
        ]
          .map(site => `https://pics.${site}/\${indexI?\`digital/\${videoS}\`:\`mono/movie/adult\`}/$\\{cID}/$\\{cID}\${indexS}.jpg`),
        vids: [
          `cc3001.dmm.co.jp`
        ]
          .map(site => `https://${site}/litevideo/freepv/\${cIDDir}_\${qualCode}_w.mp4`)
      },
      'check final ID': (ID, whichPart) => ID && (normID(ID).match(idRe[whichPart]) || [])[0],
      'ID info': ID => ({ 'DVD ID': cFID(ID, 'p0'), 'Series Short Name': SSN(ID), 'Serial Number': cFID(ID, 'p2') }),
      'ID regex': Object.assign(
        urlSchema_ID_regex = /(?:([0-9]*[A-Z-]+[0-9]*) *(-) *([0-9]+[D-Z]?\b)|([A-Z0-9]+?)([- ]?)([0-9]+))/gi,
        { p0: /.*-.*/, p1: /([A-Z0-9-]+)(?=-.+$)|^[A-Z0-9]+$/i, p2: /(?<=-)\d+/ }
      ),
      'ID regex pro plus': RegExp(`${urlSchema_ID_regex.source}(\\.\\.\\d+(?:(?:\\+\\+|--)\\d+)?)?`, urlSchema_ID_regex.flags),
      'normalize ID': ID => ID && (
        ID = String(ID),
        ID.toUpperCase()
          .replace(/^\d+$/, '')
          .replace(idReP, '$1$4-$3$6$7')
          .replace(/[^\dD-Z]+$/, '')
          .replace(/\b(?<![+-]{2})\d+(?=(?:[D-Z]|(?:\.\.|\+\+|--).+)?$)/g, d => d.padStart(3, 0))
          .replace(/-(?!-|\d+(?=(?:[D-Z]|\.{2}.*)?$))/g, '')
      ),
      'extract IDs': str => (str.match(idReP) || []).filter(Boolean).map(ID => normID(ID)),
      'contract Series Short Name': ID => cFID(ID, 'p1'),
      'Content ID rules': {
        '': {
          amateur: {
            'find': /-/g,
            'replace': ''
          },
          default: {
            'find': /-0?(\d+)/,
            'replace': (_, p1) => (
              p1 = p1.padStart(5, 0),
              p1.startsWith(0) ? p1 : (_pr.length < 3 ? 0 : '') + p1
            )
          },
        },
        default: {
          'find': /-0?(\d+)/,
          'replace': (_, p1) => p1
        },
        get video() { return this.default }
      },
      'convert to Content ID': ID => (
        gen_ex(ID),
        (_ex.length ? _ex : ['']).map(pr => (
          _pr = pr,
          (pr + ID).toLowerCase().replace(...Object.values(cIDRules[_ex.urlDir || 'default']))
        ))
      ),
      'slugS': ({ posterSize = window.posterSize } = {}) => ({
        videoS: _ex.urlDir || 'video',
        indexS: index => index === 0
          ? _ex.urlDir === 'amateur' ? 'jp' : posterSm(posterSize) ? 'ps' : 'pl'
          : `jp-${String(index).padStart(_ex.urlDir === 'amateur' && 3, 0)}`
      }),
      slugS: ({ posterSize = window.posterSize } = {}) => ({
        videoS: 'video',
        indexS: index => index === 0
          ? posterSm(posterSize) ? 'ps' : 'pl'
          : `jp-${String(index)}`
      }),
      'img num per ID': 20 + 1,
      'check non-existence of img': function (img) { return window.CORSViaGM ? this.byURL(img.src) : img.width < 100 }.bind({ byURL: async imgURL => +(await getHeaders(imgURL))['content-length'] < 4000 }),
      pad: (cID, pNum) => pNum < 0
        ? cID.replace(RegExp(`0{0,${-1 * pNum}}(?=\\d{3}(?!\\d))`), '')
        : cID.replace(/\d+$/, d => d.startsWith('00') ? d : String(+d).padStart(pNum, 0))
    }
    let _pr, _ex
    const gen_ex = ID => _ex = window.exceptPrefixes[SSN(ID)] || []
    const {
      'urls': urlForm, 'check final ID': cFID, 'ID info': idInfo, 'ID regex': idRe, 'ID regex pro plus': idReP, 'contract Series Short Name': SSN,
      'normalize ID': normID, 'extract IDs': extractIDs, 'Content ID rules': cIDRules, 'convert to Content ID': toCID,
      'slugS': evalSlugs, 'img num per ID': pPerID, 'check non-existence of img': isImgPlac, pad: padCID
    } = urlSchema
    const posterSm = size => 'small'.includes(size)
    window.posterSize = 'large'
    function genImgUrls(ID, { cID, pref = genImgUrls.pref, pSize: posterSize, try1, from = 0, to = Infinity } = {}) {
      !cID && gen_ex(ID)
      let indexI
      const { videoS, indexS: indexSS } = evalSlugs({ posterSize })
      let imgUrls = Array(posterSm(posterSize) || try1 ? 1 : pPerID).fill().map(
        (_, indexS) => (
          indexI = indexS,
          indexS = indexSS(indexS),
          evalStr.call({ indexS, videoS, indexI },
            typeof pref === 'function'
              ? pref()
              : typeof pref === 'string'
                ? pref
                : random(urlForm)
          )
        )
      ).slice(from, to)
      if (cID) imgUrls = imgUrls.map(evalStr.bind({ cID }))
      return { imgUrls, ...!cID && { cIDs: toCID(ID) } }
    }
    function genImgUrl(ID, { cID, pref, pSize: posterSize = 'small' } = {}) {
      return genImgUrls(ID, { cID, pref, pSize: posterSize, try1: 1 }).imgUrls.pop()
    }
    const prework = {
      taskName: 'checkRemoteFetch',
      rival: checkRemoteFetch,
      log: (t, sig) =>
        `${prework.taskName} ${(() => {
          switch (sig) {
            case 'cancel': return 'is not yet needed'
            case 'abort': return `was ${sig}ed because there was no more source left`
            case 'dev-local': return `is not needed because it is now ${sig}`
            default: return sig || `will take more than ${t} seconds this time`
          }
        })()}.`,
      doneAt: () => self.checkRemoteFetch.doneAt,
      cLog: (_res, msg) => devMode && console.log(msg)
    }
    checkRemoteFetch.then(_ => {
      self.checkRemoteFetch.doneAt = Date.now()
      prework.log.check = _
    })
    self.checkRemoteFetch = {}
    const _remoteFetched = Promise.race([checkRemoteFetch, timeoutIn(10, prework)])
    const resolveID_ = (ID, i, arr) => resolveID(ID, i, arr.length)
    const resolveIDs = IDs => (console.log(
      `Start to fetch ${IDs.length} IDs, estimated time: ${(IDs.length / 2.7).toFixed(1)} seconds.`),
      Promise.all(IDs.map(resolveID_))
    )
    const resolvingSSNs = new Map
    const serverErrs = [
      ['Internal Server Error', 'error'],
      ['{\n   "Error": "Invalid URI']
    ]
    window['series not included'] = []
    async function resolveID(ID, i, len) {
      if (!(Array.isArray(ID) || typeof ID === 'string')) return
      if (Array.isArray(ID)) return resolveIDs(ID)
      if (/[\s,]/.test(ID)) return resolveIDs(ID.trim().split(/[\s,]+/))
      await _remoteFetched
      const idInf = idInfo(ID), { 'Series Short Name': SSN, 'DVD ID': DID, 'Serial Number': SN } = idInf
      const pct = len ? `(${((i + 1) / len * 100 || 100).toFixed(0)}%)` : ' '
      if (window['series not included'].includes(SSN)) {
        console.log(`‘${SSN}’ series is not included in FANZA (Inferred from what was just checked)`, pct)
        return {}
      }
      let found, fromNetwork
      if (resolvingSSNs.has(SSN) && DID) {
        await resolvingSSNs.get(SSN).promise
        if (found = window.exceptPrefixes[SSN] || window['series not included'].includes(SSN)) {
          console.log(`Resolved the ID ‘${DID}’ (Inferred based on what was checked a moment ago)`, pct)
          return {}
        }
      }
      const matchRe = RegExp(
        `<img src="//pics.dmm.co.jp/mono/movie/adult/(\\w*${SSN}${SN})/\\1p[st].jpg" alt="([^"]+)">`, 'gi')
      let text, proxyURL
      found = window.exceptPrefixes[SSN]
      if (!found) {
        fromNetwork = true
        if (!window.CORSViaGM) {
          _promptAboutInstallGM('Unable to send a search request for the exception rule encountered.')
          return {}
        }
        const makeP = () => resolvingSSNs.get(SSN).promise = new Promise(res => resolvingSSNs.get(SSN).res = res)
        if (!resolvingSSNs.has(SSN)) (resolvingSSNs.set(SSN, {}), makeP())
        const searchword = DID || SSN
        const url = `https://www.dmm.co.jp/search/=/searchstr=${searchword}`
        if (!len) console.log(`Querying ‘${searchword}’ from network...`)
        found = [...(text = await (await
          (proxyURL = fetch(url).catch(_ => resolvingSSNs.delete(SSN)))
        ).text()).matchAll(matchRe)]
      }
      if (text) {
        if (text.includes('foreignError')) {
          resolvingSSNs.delete(SSN)
          return 'foreignError'
        }
        let err
        if (err = serverErrs.find(([e]) => text.startsWith(e))) {
          resolvingSSNs.delete(SSN)
          proxyURL.reportUnusable && proxyURL.reportUnusable(err[1])
          return 'try again'
        }
      }
      const prefixes = found.length && [...new Set(found.map(fo => (fromNetwork ? (fo[1].match(RegExp('^(\\w*)' + SSN, 'i')) || [])[1] : fo)))]
      let titles
      if (fromNetwork) {
        if (found.length) {
          window.exceptPrefixes[SSN] = prefixes
          setItem('exceptPrefixes', window.exceptPrefixes)
          titles = found.map(fo => fo[2])
        }
        else if (DID) {
          const checkSSN = await resolveID(SSN)
          !checkSSN.founds.length && window['series not included'].push(SSN)
        }
        if (resolvingSSNs.has(SSN) && DID) {
          resolvingSSNs.get(SSN).res()
          resolvingSSNs.delete(SSN)
        }
      }
      found = {
        ...DID ? { 'DVD ID': DID } : { 'Studio Short Name': SSN },
        founds: found.map((fo, i) => ({
          'Content ID': fromNetwork ? fo[1] : toCID(DID)[i],
          prefix: prefixes[i],
          ...titles ? { title: titles[i] } : {},
        })),
        ...fromNetwork ? {} : { fromCache: true }
      }
      return found
    }
    function resolveNotFounds(IDs) {
      return resolveID(
        typeof IDs === 'string'
          ? [...new Map(IDs.trim().split(/[\s,]+/).map(ID => [SSN(ID), ID]))].map(v => v[1])
          : IDs
      )
    }
    function availableVidHosts(cID) {
      if (typeof cID !== 'string') return
      const found = vids_LTT.siteSort.find(([site]) =>
        !vids_LTT.siteRecs[site].hasNoSrcsForTheseIDs.has(cID)
      )
      return found && vids_LTT.siteRecs[found[0]].main
    }
    function genVidUrls(cID, hostname) {
      cID = padCID(cID, 3)
      const cIDDir = [1, 3, Infinity, Infinity].map(end => cID.slice(0, end)).join('/')
      return Object.fromEntries(
        [['low', 'sm'], ['med', 'dm'], ['high', 'dmb']].map(
          ([qual, qualCode]) => [qual, evalStr.call({ cIDDir, qualCode }, hostname)]
        )
      )
    }
    function genVidUrlsForTrial(cID) {
      let hostname = availableVidHosts(cID)
      if (!hostname) return
      return [
        ['', cID],
        ['asSrcForTry', padCID(cID, 5)]
      ]
        .filter(([, CID], i, arr) => !arr.slice(0, i).some(([, _CID]) => CID === _CID))
        .flatMap(
          ([asSrcForTry, cID]) => (
            Object.entries(genVidUrls(cID, hostname)).map(
              ([quality, qualUrl]) => ({
                ...asSrcForTry && { asSrcForTry: true }, quality, src: qualUrl
              })
            )
          )
        )
    }
    ;
    (async () => {
      const checkFromOnlineText = _from => _from.startsWith('online') && (remoteFetched(), !mergeExRules._countOfNew && fadeLog('No more exception prefix rules.'))
      for await (let rule of Object.values(exceptRulesFrom)) {
        try {
          rule = await rule
          rule && checkFromOnlineText(rule._from)
          if (!(rule && rule.raw)) continue
          if (rule.raw.constructor === Promise) rule.raw = await rule.raw
          if (!rule.raw) continue
          const {
            raw,
            _from,
            lastModified = typeof raw === 'string'
              ? raw.match(/(?<=(Updated on|last ?modified|Date|Time)(: ))[\d -:]{19}/gi)
              : ''
          } = rule
          const finish = processedRaw => {
            rule.raw = processedRaw
            fadeLog(
              translate`The rules have been imported from the ${_from}${lastModified ? translate` (${''}last updated at ${lastModified})` : ''}.`
            )
            mergeExRules(rule)
          }
          if (typeof raw === 'object') {
            finish(raw)
            continue
          }
          const { keysValsMap, keysValsPairs } = fampl(raw)
          keysValsPairs.forEach(([, vals]) => (
            vals.forEach((v, i) => (
              v.startsWith('::') && (
                delete vals[i],
                vals.urlDir = v.replace('::', '')
              )
            )),
            vals.splice(0, Infinity, ...vals.filter(v => v !== undefined)),
            !vals.length && vals.push(''),
            vals.studio = vals['#heading'], delete vals['#heading']
          ))
          finish(keysValsMap)
          checkFromOnlineText(_from)
        } catch (err) {
          console.error({ err, html: '<em><code>exceptPrefixes</code></em> fetch failed.' })
        }
      }
    })()
    self.translate = translate
    let _loadedLangs, _loadingLangs
    function translate(word, toLang, { elem, node, fromDOM = true } = {}) {
      if (Array.isArray(arguments[0])) return interleave(
        arguments[0].map(translateDirectly),
        Array.isArray(arguments[0].raw)
          ? Array.prototype.slice.call(arguments, 1).map(translateDirectly) : []
      ).join('')
      if (typeof word !== 'string') {
        if (word instanceof Element) {
          elem = word
          word = elem.innerText
          return translate(word, toLang, { elem })
        }
        return word
      }
      else if (!word.trim()) return word
      if (!(toLang && typeof toLang === 'string')) toLang = arguments[1] = window._langs.chosen
      if (!_loadedLangs) _loadedLangs = window._loadedLangs = {}
      if (!_loadedLangs[toLang]) {
        return isLangEn(toLang) ? word :
          _loadedLangs[`__loaded: ${toLang}`] ||
          (_loadedLangs[`__loaded: ${toLang}`] =
            (_loadingLangs ||
              (_loadingLangs = loadElemFromUrl(`./localization/${toLang}.js`, { promise: true }))
            ).then(() => {
              _loadedLangs[`__loaded: ${toLang}`] = `(${toLang})`
              translate(...arguments)
            })
          )
      }
      return _translate(word, toLang, { elem, node, fromDOM })
    }
    function translateDirectly(word) {
      return translate(word, window._langs.chosen)
    }
    function _translate(word, toLang, { elem, node, fromDOM } = {}) {
      if (typeof toLang !== 'string') return word
      const result =
        __translate(word, toLang) ||
        (brackets.left.test(word[0]) || brackets.right.test(word.at(-1))) &&
        word.split(brackets.regex).map(s => __translate(s, toLang, { or: true })).join('')
      switch (true) {
        case typeof result === 'function': return result(elem || node && node.parentNode, { textNode: node, fromDOM })
        default: return result || word
      }
    }
    function __translate(word, toLang, { or } = {}) {
      word = word.trim()
      if (!word) return word
      return _loadedLangs[toLang][word]
        || _loadedLangs[toLang][word.toLowerCase()]
        || or && word.split(/(?<=\w)(?=\s*\W+\s*$)/).map(str => _loadedLangs[toLang][str] || str).join('')
        || _loadedLangs[toLang][word.replace(/\s*\W+\s*$/, '')]
    }
    function translateInterp(str = '', regex = /\d/, ir = '${d}', { toLang, feature = /\$\{[^}]+}/g } = {}) {
      if (/\((?!\?)/.test(regex)) {
        regex = RegExp(regex.source.replace(/^([^(]*?)\((?!\?)/, '(?<=$1)').replace(/\)([^)]*?)$/, '(?=$1)'))
        return translateInterp(str, regex, ir, { toLang, feature })
      }
      if (!Array.isArray(ir)) ir = [ir]
      const ir_c = []
      const matched = []
      matched.units = new Map
      const idxs = [0]
      let $ir, irs, parens, offset
      const ir_str = str.replace(regex, function (match) {
        $ir = ir.shift()
        if (!$ir) $ir = ir_c[ir_c.length - 1] || ''
        ir_c.push($ir)
        matched.push(
          $ir.trimLeft().startsWith('${')
            ? (
              irs = $ir.match(feature),
              { parens, offset, length } = RegExp._sliceParams(arguments),
              matched.units.set(match, $ir),
              offset !== idxs[idxs.length - 1] && idxs.push(offset, offset + length),
              !parens.length && (parens = findImplicitGroups(match, $ir, feature)),
              Object.assign(irs.map((ir, i) => [ir, parens[i] !== undefined ? parens[i] : ir]), { $ir })
            )
            : match
        )
        return $ir
      })
      const translateStr = str => translate(str, toLang, { fromDOM: false })
      let tran_str = translateStr(ir_str)
      if (ir_str === tran_str) {
        const tran_strs = []
        if (idxs[idxs.length - 1] === str.length) idxs.pop()
        const ir_str_sections = idxs
          .map((idx, i) => str.substring(idx, idxs[i + 1]))
          .map(v => matched.units.get(v) || v)
        let pos = ir_str_sections.length, sub_str
        do {
          tran_str = translateStr(sub_str = ir_str_sections.slice(0, pos).join(''))
          if (tran_str !== sub_str || pos < 2) {
            tran_strs.push(tran_str)
            ir_str_sections.splice(0, pos)
          }
          --pos
          if (pos < 1) pos = ir_str_sections.length
        } while (ir_str_sections.length)
        tran_str = tran_strs.join('')
      }
      const replace = (ir, orig) => tran_str = tran_str.replace(ir, orig)
      let $matched
      ir_c.forEach($$ir => {
        $matched = matched.shift()
        Array.isArray($matched)
          ? $matched.forEach(([ir, p]) => replace(ir, p))
          : replace($$ir, $matched)
      })
      return /(?<!\\)\${/.test(tran_str) ? eval('`' + tran_str + '`') : tran_str
    }
    RegExp._sliceParams = function (_arguments) {
      _arguments = Array.from(_arguments)
      const idxOfOffset = _arguments.findIndex(arg => typeof arg === 'number')
      const match = _arguments[0]
      const parens = _arguments.slice(1, idxOfOffset)
      const [offset, input, groups] = _arguments.slice(idxOfOffset)
      const length = match.length
      return { match, parens, offset, length, input, groups }
    }
    function findImplicitGroups(str = '', ir = '', feature = /\$\{[^}]+}/) {
      return str.match(RegExp(`(?:(?!${[...new Set(ir.split(feature).filter(Boolean))].map(v => /\w/.test(v) ? v : `\\${v}`).join(')|(?!')}).)+`, 'g')) || [str]
    }
    const langAttr = lang => lang.attrs.lang
    !function () {
      const sortLangs = (a, b) => langAttr(a).localeCompare(langAttr(b))
      window._langs = [
        { term: '简体中文', attrs: { lang: 'zh-CN' } },
        { term: 'English', attrs: { lang: 'en' } },
      ].sort(sortLangs)
      const [userLang, userLangExact] =
        [v => v.replace(/-.*/, ''), v => v.toLowerCase()].map(f => f(window._userLang))
      const chosenLangs = window._langs.filter(item => langAttr(item).includes(userLang))
      if (!chosenLangs.length) return
      window._langs.chosen = langAttr(
        chosenLangs.length === 1
          ? chosenLangs[0]
          : chosenLangs.find(item => langAttr(item).toLowerCase() === userLangExact)
      )
    }()
    window.switchLang = switchLang
    async function switchLang(node, toLang, { forceAgain } = {}) {
      if (!node) return
      if (typeof toLang === 'boolean') forceAgain = toLang
      if (!(toLang && typeof toLang === 'string')) toLang = window._langs.chosen
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          await switchLang.forElemNode(node, toLang, { forceAgain })
          node.shadowRoot && await switchLang.forEachNode(node.shadowRoot, toLang, { forceAgain })
          break
        case Node.TEXT_NODE:
          await switchLang.forTextNode(node, toLang, { forceAgain })
      }
      return node
    }
    switchLang.forElemNode = async function (node, toLang, { forceAgain } = {}) {
      if (
        !(node instanceof HTMLElement)
        || node._isTranslating
        ||
        ['br', 'meta', 'link', 'style', 'script', 'kbd', 'object', 'iframe', 'template', 'video', 'audio', 'html-comp'].includes(node.localName)
        ||
        node.getAttribute('translate') === 'no' ||
        node.getAttribute('translate') !== 'always' && node.getAttribute('lang') === toLang && !forceAgain ||
        node.localName === 'code' && !node.hasAttribute('translate')
      ) return
      node._isTranslating = true
      if (node.hasAttribute('translate-merge')) {
        if (isLangEn(toLang)) {
          if (!isLangEn(node.getAttribute('lang'))) {
            replaceSubtree(node)
            function replaceSubtree(elem) {
              elem._origChildNodes && replaceChildNodes(elem)
              elem.removeAttribute('lang')
              elem.childElementCount && Array.prototype.forEach.call(elem.children, elem => {
                if (elem._origHTML) elem.innerHTML = elem._origHTML
                replaceSubtree(elem)
              })
            }
          }
        }
        else {
          if (!node._origChildNodes) node._origChildNodes = [...node.childNodes]
          let transText
          const mergeHint = node.getAttribute('translate-merge')
          switch (mergeHint) {
            case '':
              transText = node.innerText
              if (node.hasAttribute('translate-trim')) transText = transText.replace(/\s{2,}/g, ' '); break
            case '@hold': case '@nest':
              transText = switchLang.convertToMarkup(node); break
            default:
              transText = mergeHint
          }
          const transRet = await translate(transText, toLang, { elem: node })
          switch (true) {
            default:
            case typeof transRet === 'string':
              node.innerHTML = transRet; break
            case Array.isArray(transRet):
              const origChildNodes = [...node._origChildNodes]
              replaceChildNodes(node, ...tranTransRet(transRet, origChildNodes))
              function tranTransRet(transDicVal, origChildNodes) {
                const ret = tranTranTransRet(transDicVal)
                return ret
                function tranTranTransRet(dicVal, countInward = 0) {
                  let ret = dicVal.map(dV => {
                    if (Array.isArray(dV)) {
                      if (dV.some(Array.isArray)) {
                        return tranTranTransRet(dV, countInward + 1)
                      }
                      if (typeof dV[0] === 'string') {
                        const [_, tag, id] = dV[0].match(/(?<=^<)([^#>]+)#?([^>]*)/)
                        let elem = origChildNodes.findIndex(cNode =>
                          cNode.localName === tag &&
                          (!cNode.hasAttribute('translate-id') || cNode.getAttribute('translate-id') === id)
                        )
                        if (~elem) {
                          [elem] = origChildNodes.splice(elem, 1)
                          if (countInward) elem = elem.querySelector(`[translate-id=${id}]`)
                          if (!(elem.getAttribute('translate') === 'no' || [false, 0].includes(dV[1]))) {
                            if (typeof dV[1] === 'string') {
                              elem._origHTML = elem.innerHTML
                              elem.innerHTML = dV[1]
                            }
                            else switchLang(elem, toLang)
                          }
                          return elem
                        }
                      }
                    }
                    return dV
                  })
                  if (countInward) {
                    const elemWithTransId = Array.isArray(ret) && ret.find(_ => typeof _ !== 'string' && _ instanceof Element)
                    if (elemWithTransId) {
                      const elem = getNthLevelParent(elemWithTransId, countInward)
                      if (elem) {
                        if (!elem._origChildNodes) elem._origChildNodes = [...elem.childNodes]
                        replaceChildNodes(elem, ...ret)
                        ret = elem
                      }
                    }
                  }
                  return ret
                }
              }
              break
          }
        }
      }
      else await switchLang.forEachNode(node, toLang, { forceAgain })
      if (node.childNodes.length) node.setAttribute('lang', toLang)
      if (isLangEn(toLang)) {
        if (
          hasSomeAttrs(node, ['translate-hide', 'translate-plural']) &&
          node._translate_hide_node
        ) node._translate_hide_node.data = node._translate_hide_node._initText
        if (node.getAttribute('orig-dom-idx') === '0') {
          sortNodesByAttr(node, 'orig-dom-idx')
          Array.prototype.forEach.call(node.children, el => {
            if (!el.hasAttribute('orig-dom-idx')) return
            if (!['-', '+'].some(sign => el.getAttribute('orig-dom-idx').startsWith(sign))) return
            el.remove()
          })
        }
      }
      else {
        if (!node.hasAttribute('orig-dom-idx') && node.hasAttribute('tran-dom-idx'))
          ['tran-dom-idx', 'orig-dom-idx'].forEach(
            function (idx, i) { node.setAttribute(idx, this[i]) },
            node.getAttribute('tran-dom-idx').split(',')
          )
        if (hasSomeAttrs(node, ['tran-dom-idx', 'orig-dom-idx'], '0'))
          sortNodesByAttr(node, 'tran-dom-idx')
      }
      switchLang.forAttrs.forEach(attr =>
        node.hasAttribute(attr) && node.hasAttribute(`${attr}-en`) && (
          node.setAttribute(attr, translate(node.getAttribute(`${attr}-en`), toLang)),
          node.setAttribute('lang', toLang)
        )
      )
      if (node.style.height && !node.style.height.startsWith(0)) node.setAttribute('height-update-needed', '')
      delete node._isTranslating
    }
    switchLang.convertToMarkup = function (elem) {
      const nodeRepresentations = []
      elem.childNodes.forEach(node => {
        let text, subText
        switch (node.nodeType) {
          case Node.TEXT_NODE: text = node.data; break
          case Node.ELEMENT_NODE: text =
            `<${node.localName}${node.hasAttribute('translate-id') ? `#${node.getAttribute('translate-id')}` : ''}>` +
            `${subText = !node.hasAttribute('translate-hold') && switchLang.convertToMarkup(node),
            subText ? `${subText}</${node.localName}>` : ''}`
        }
        text && nodeRepresentations.push(text)
      })
      return nodeRepresentations.join('')
    }
    switchLang.forAttrs = ['placeholder', 'text-content', 'text-content-end']
    switchLang.forTextNode = async function (node, toLang, { forceAgain } = {}) {
      if (!node) return
      if (forceAgain) (['_lang', '_translatedBefore'].forEach(_ => delete node[_]))
      if (node._lang === toLang) return
      node._lang = toLang
      if (node.assignedSlot) node.assignedSlot.toLang = toLang
      if (isLangEn(toLang) && node._translatedBefore) {
        node.data = node._initText
        return
      }
      if (!node._translatedBefore)
        Object.assign(node, { _translatedBefore: true, _initText: node.data })
      const newText = await translate(node._initText, toLang, { node })
      if (newText !== undefined) {
        if (!newText) {
          if (isExpletive(node._initText)) {
            if (node.parentNode.childNodes.length > 1) {
              const span = document.createElement('span')
              node.replaceWith(span)
              span.append(node)
            }
            node.parentNode.setAttribute('translate-hide', '')
          }
          if (hasSomeAttrs(node.parentNode, ['translate-hide', 'translate-plural'])) {
            node.parentNode._translate_hide_node = node
          }
        }
        if (node.data !== newText) node.data = newText
      }
    }
    switchLang.forEachNode = async function (node, toLang, { forceAgain } = {}) {
      for (const _node of node.childNodes) await switchLang(_node, toLang, { forceAgain })
    }
    const observerFor_switchLang = {
      observeList: new Set([document.body]),
      addendumList: new Set(),
      ignoreList: [],
      addObserve(node) { this.observeList.add(node); this.observe(node) },
      addendum(node) { this.addendumList.add(node); switchLang(node) },
      observe(node) { this.observer.observe(node, this.init) },
      observer: new MutationObserver(muts => {
        muts.forEach(mut => {
          if (mut.type === 'childList' && observerFor_switchLang.whetherTranslate(mut.addedNodes[0]) === true) {
            observerFor_switchLang.switchLangOfNodes(mut.addedNodes)
            return
          }
          if (
            observerFor_switchLang.ignoreList.some(ignore =>
              !(mut.target.hasAttribute('lang') || ignore._options && ignore._options.translate)
              && ignore.contains(mut.target)
            ) ||
            mut.target && (
              observerFor_switchLang.notTranslateByDefault(mut.target) ||
              mut.type === 'attributes' && mut.oldValue === mut.target.getAttribute(mut.attributeName)
            )
          ) return
          switchLang(mut.target)
          observerFor_switchLang.switchLangOfNodes(mut.addedNodes)
        })
      }),
      init: {
        childList: true, subtree: true,
        attributeFilter: switchLang.forAttrs, attributeOldValue: true
      },
      observeAll() {
        if (isLangEn(window._langs.chosen)) return
        this.observeList.forEach(el => {
          this.observe(el)
        })
        this._observing = true
        clearTimeout(this._disconnectAMomentTID)
        delete this._disconnectAMomentTID
      },
      disconnectAMoment(duration = 1000, wasKeepDisconnect) {
        this.disconnect()
        clearTimeout(this._disconnectAMomentTID)
        this._disconnectAMomentTID = setTimeout(() =>
          this.keepDisconnect
            ? this.disconnectAMoment(duration, true)
            : wasKeepDisconnect
              ? this.disconnectAMoment(duration)
              : this.observeAll(),
          duration
        )
      },
      disconnect() {
        this.observer.disconnect()
        this._observing = false
      },
      notTranslateByDefault(elem) {
        return this.whetherTranslate(elem) !== true &&
          [elem, elem.parentNode].some(el => isElem(el) &&
            this.notTranslateByDefault_attrs.some(([k, v]) =>
              el.getAttribute(k) === v
            )
          )
      },
      notTranslateByDefault_attrs: [
        ['contenteditable', 'true'],
        ['translate', 'no']
      ],
      whetherTranslate(elem) {
        return isElem(elem)
          ? ['', 'yes'].includes(elem.getAttribute('translate')) || elem.hasAttribute('translate-merge')
          : 'non-element'
      },
      switchLangOfNodes(addedNodes) {
        addedNodes.forEach(node => !observerFor_switchLang.notTranslateByDefault(node) && switchLang(node))
      }
    }
    window.switchLangOfWholePage = switchLangOfWholePage
    async function switchLangOfWholePage(toLang, again) {
      if (!again) {
        if (typeof toLang !== 'string' || window._langs.chosen === toLang) return
      }
      else if (!toLang) toLang = window._langs.chosen
      observerFor_switchLang.observer.disconnect()
      window._userLang = window._langs.chosen = toLang
      window._isUserLangInCJK()
      await translate('.', toLang);
      [document.head, document.body].forEach(switchLang)
      observerFor_switchLang.observeAll()
    }
    function sortNodesByAttr(node, attr) {
      node.append(
        ...Array.prototype
          .filter.call(node.children, v => Number(v.getAttribute(attr)))
          .sort((a, b) => a.getAttribute(attr) - b.getAttribute(attr))
      )
    }
    function isLangEn(toLang) {
      return typeof toLang === 'string' && toLang.startsWith('en')
    }
    const expletiveWords = new Set(['the'])
    function isExpletive(word) {
      return expletiveWords.has(word.trim().toLowerCase())
    }
    function hasSomeAttrs(node, attrs = [], val = '') {
      if (!node) return
      const has = `${val ? 'get' : 'has'}Attribute`
      if (has === 'hasAttribute') val = true
      return attrs.some(attr => node[has](attr) === val)
    }
    ;
    const _api = window._api = {
      async googleSearch(q = '', plain) {
        const res = await (await fetch(`https://google.com/search?q=${q}`)).text()
        return plain ? res : extractGoogleSearchResults(res)
      },
      async googleSearchPredictions(q = '') {
        return JSON.parse(
          (
            (await (await fetch(`https://www.google.com/complete/search?q=${q}&client=gws-wiz`)).text()).match(/\[\[".*]]/)
            || [0]
          )[0]
        ) || []
      },
      switchLang() {
        observerFor_switchLang.disconnectAMoment()
        return switchLang(...arguments)
      }
    }
    const _api_noAbbr = new Set([_api.switchLang].map(v => v.name))
    Object.values(window._api).forEach(v =>
      !_api_noAbbr.has(v.name) &&
      (window[`$${v.name.match(/^[a-z]|(?<=[a-z])[A-Z]/g).join('').toLowerCase()}`] = v)
    )
    const _console = document.getElementById('_console')
    function evalFencedJSCode(code) {
      if (!code.trim()) return
      code = (code.startsWith('```') ? code.match(/```(.*)```/)[1].replace(/\.$/, '') : code) || '""'
      code = code.trim()
      if (code.endsWith('//.')) setTransiently_noReturn()
      else if (!code.endsWith('//..') && code.includes('_console.log')) noReturn = true
      try {
        return new AsyncFunction(`
      try { return (${code}\n) } catch(e) { return e }
    `)()
      }
      catch (e) {
        try {
          code = new AsyncFunction(code)
          return code().catch(e => (noReturn = false, e))
        }
        catch (e) {
          noReturn = false
          return e
        }
      }
      finally {
        setTimeout(() => noReturn = false)
      }
    }
    _console.clear = $clear.bind(undefined, '[output]', _console)
    const error = console.error.bind(console)
    let reason = ''
    console.error = (...errInf) => {
      if (!errInf.length) return
      let _errInf
      if (errInf.length === 1) _errInf = errInf.pop()
      reason = String(_errInf || errInf)
      switch (reason) {
        case 'UnknownError: The operation failed for reasons unrelated to the database itself and not covered by any other error code.':
          reason = 'sqlite'
          break
        default: reason = 'undefErr'
      }
      reason === 'undefErr'
        ? (
          _console._options.setOnce('err'),
          _console.log(_errInf && (_errInf.html || _errInf.message || _errInf) || ['Error:', ...errInf.map(v => !v || v.name || String(v))].join(' '))
        )
        : document.body.insertAdjacentHTML('afterbegin', `<i-🚨 slot='${reason}'>${errInf}</i-🚨>`)
      let a = [_errInf && (_errInf.err || _errInf.message || _errInf)].filter(Boolean)
      error(...a.length ? a : errInf)
    }
    observerFor_switchLang.addObserve(_console)
    observerFor_switchLang.ignoreList.push(_console)
    new MutationObserver(([m]) => {
      document.body.style['overflow-x'] = m.target.classList.contains('dbl-col')
        ? 'unset' : ''
    }).observe(_console, { attributeFilter: ['class'] })
    _console.addEventListener('click', e => !ac.contains(e.target) && ac._remove())
    window._lastPressedKey = { key: undefined, time: undefined }
    const ioBlockCount = {
      get input() {
        return this._in = this._in + (this.count('[input]') ? 1 : -this._in) || 1
      },
      get output() {
        return this._out = this._out + (this.count('[output]') ? 1 : -this._out) || 1
      },
      count(put) {
        return _console.querySelector(put)
      }
    }
    const delayOfInput = 20, delayOfRecord = 1000, delayOfDoubleHit = 500
    _console.log = function (...evaledVal) {
      let argListConverted
      if (evaledVal.length < 2) {
        evaledVal = evaledVal[0]
        argListConverted = true
      }
      const infoBlock = document.createElement('div')
      infoBlock.classList.add('border-bottom-short', _console._options.err && 'err')
      infoBlock.setAttribute('info-block', '')
      infoBlock.setAttribute('translate', _console._options.translate ? 'yes' : 'no')
      infoBlock.insertAdjacentHTML('afterbegin', `
    <div info class='code line-wrap pad-both'></div>
    ${_console._options.no_extra_close
          ? ''
          : `<span close-btn class='cmd-per-end'
          onclick='const bl = this.closest("[info-block]"); bl.classList.contains("unfold-from-top") ? foldToTopAndRemove(bl) : bl.remove();\
                   _console.querySelectorAll(\`[data-dup-id=\${bl.dataset.dupId}]\`).forEach(v=>foldToTopAndRemove(v))'
        >❌</span>`
        }
  `)
      const representInText = _console._options.text || _console._options.formatInText
      const info = infoBlock.querySelector('[info]')
      const jsonCTypes = new Set('Object Array'.split(' '))
      window.temp0 = evaledVal
      info[`insertAdjacent${representInText ? 'Text' : 'HTML'}`]('afterbegin',
        `${_console._options.formatInJSON
          ? JSON.stringify(evaledVal, null, 2)
          : /```.*```[\s.]*(?:str\([^)]*\)|--edit)/.test(qBox._value)
            ? evaledVal instanceof Error
              ? evaledVal
              : $str(evaledVal, strPad((qBox._value.match(/(?<=```.*```[\s.]*str)\(([^)]*)\)/) || [])[1]))
            : Array.isArray(evaledVal)
              ? argListConverted
                ? `[ ${evaledVal.map(v =>
                  jsonCTypes.has(Object.prototype.toString.call(v).slice(8, -1))
                    ? JSON.stringify(v, null, 2)
                    : v && v.toString && v.toString() || v
                ).join(', ')} ]`
                : evaledVal.map(JSON.stringify).join(' ')
              : typeof evaledVal === 'function' && evaledVal.hasOwnProperty('description')
                ? evaledVal.description
                : String(evaledVal) || '""'
        }`
      )
      if (info.querySelector('meta')) {
        info.classList.add('m-top', 'respect-origin')
        const innerScrollHeight = Math.max(...[...info.children].map(el => el.scrollHeight))
        if (innerScrollHeight > parseFloat(getComputedStyle(info).height)) {
          info.style['min-height'] = `calc(${innerScrollHeight}px + var(--font-size))`
        }
        observeDOM4ReloadElem.startObserve(info)
        info.querySelectorAll('link').forEach(loadElemFromUrl)
        info.querySelectorAll('script').scriptsChainLoad()
        info.querySelectorAll('form, form *').forEach(form =>
          form.childNodes.forEach(node =>
            node.nodeType === Node.TEXT_NODE &&
            /^\s+$/.test(node.data) &&
            node.remove()
          )
        )
        setTimeout(() => {
          const search = info.querySelector('form[id^=search], form[role^=search]')
          search && search.focus()
        }, delayOfDoubleHit)
      }
      else {
        if (!(evaledVal instanceof Error) && /```.*```.*--edit/.test(qBox._value)) {
          info.contentEditable = true
          setTimeout(() => info.innerHTML = '')
          infoBlock.classList.add('editable')
          infoBlock.setAttribute('input', '')
          const clrBtnTip = '\'msg(translate("[Button] Clear all corresponding outputs"),"clrBtn")\''
          infoBlock.insertAdjacentHTML('beforeend', `
        ${_console.querySelector('[input]>[setting-btn]') ? '' : '<span setting-btn class=cmd-per-end onclick=\'clickOut("Code_Editor_Area")\'></span>'}
        <span class='cmd-per-end right clear-output' onclick=$clear('on'+event.type,this.closest('[input]')) oncontextmenu=${clrBtnTip} onmouseover=${clrBtnTip}>ⓧ</span>
        <div class=line-num></div>
        <header><span>${info.id = `input${ioBlockCount.input}`}</span></header>
        <div outputs></div>
      `)
          const [lnNumDiv, header, outputs] = infoBlock.querySelectorAll('.line-num, header, [outputs]')
          info._header = header
          info.classList.add('editable')
          const xBtn = infoBlock.querySelector('[close-btn]')
          const close = xBtn.onclick.bind(xBtn)
          xBtn.onclick = null
          xBtn.addEventListener('click', function () {
            if (!info.innerText.trim()) return close()
            confirm(translate('Do you want to close?')) && close()
          })
          info.eval = async (input = info.innerText) => {
            const evaled = await evalFencedJSCode(input)
            const endOfInput = (input.match(/(?<=\/\/\.?)[^.].*$/) || [''])[0].trimRight()
            if (!noReturn) {
              _console._options.setOnce({
                formatInJSON: endOfInput === 'JSON',
                prependTo: outputs
              })
              _console.log(evaled)
            }
          }
          info._inputHistory = [['', [1, 1]]]
          Object.defineProperties(info._inputHistory, {
            ptr: {
              get() { return this._ptr },
              set(v) {
                this._ptr =
                  v < 0 ? 0
                    : v > this.length - 1 ? this.length - 1
                      : v
              }
            },
            _ptr: {
              value: 0,
              writable: true
            },
            isPtrEnd: {
              get() { return this.ptr === this.length - 1 }
            }
          })
          info._updateLnNum = () => updateLnNum(lnNumDiv, info, infoBlock)
          info.addEventListener('keydown', async e => {
            if (!sel.focusNode) return
            setTimeout(() => {
              _lastPressedKey.key = `${e.ctrlKey ? 'Ctrl' : ''} ${e.shiftKey ? 'Shift' : ''} ${e.key}`.replace('  ', ' ').trimLeft()
              _lastPressedKey.time = e.timeStamp
            })
            if (e.ctrlKey) {
              const key = e.key.toLowerCase()
              if (['y', 'z'].includes(key)) {
                const ptr = info._inputHistory.ptr
                info._inputHistory.ptr += !e.shiftKey && key === 'z' ? (recordInputHistory(info), -1) : 1
                if (ptr === info._inputHistory.ptr) return
                reputCaret(info)
                e.preventDefault()
                return
              }
            }
            if (sel.type === 'Range') {
              if (['Tab'].includes(e.key) || leftPairs.includes(e.key)) {
                e.preventDefault()
                const range = sel.getRangeAt(0)
                const frag = range.extractContents()
                let isBQ
                switch (true) {
                  case isBQ = brackets.left.includes(e.key):
                    frag.prepend(e.key)
                    frag.append(brackets.pair(e.key)); break
                  case isBQ = quotes.includes(e.key):
                    frag.prepend(e.key)
                    frag.append(e.key); break
                  default:
                    switch (e.key) {
                      case 'Tab': (e.shiftKey ? outdentText : indentText)(frag.childNodes); break
                    }
                }
                range.insertNode(frag)
                sel.empty()
                sel.addRange(range)
                range.commonAncestorContainer.normalize()
                _recordInputHistory()
                if (e.key === 'Tab') return
                if (isBQ && sel.anchorNode === sel.focusNode) {
                  if (sel.anchorNode.nodeName !== '#text') {
                    sel.setBaseAndExtent(sel.anchorNode.firstChild, 1, sel.focusNode.firstChild, sel.focusNode.firstChild.data.length - 1)
                  }
                  else {
                    const [s, e] = [sel.anchorOffset, sel.focusOffset].sort((a, b) => a - b)
                    sel.setBaseAndExtent(sel.anchorNode, s + 1, sel.focusNode, e - 1)
                  }
                }
                else if (range.startContainer === range.endContainer && range.endContainer.nodeType === Node.TEXT_NODE) {
                  sel.setBaseAndExtent(range.startContainer, range.startOffset + 1, range.endContainer, range.endOffset - 1)
                }
              }
              else {
                switch (e.key) {
                  case 'Home':
                    if (e.shiftKey && !sel._getCaretChars()[0]) {
                      e.preventDefault()
                      sel._setFocusOffset(sel.focusOffset + sel._nextNonBlankCharNode.forthOffset)
                    }
                    break
                  case 'Enter':
                    e.ctrlKey && await info.eval(sel.toString())
                    break
                }
              }
            }
            else {
              const [prevChar3, prevChar2, prevChar, nextChar, nextChar2] = sel._getCaretChars(3)
              const prevCharIsOpen =
                brackets.left.test(prevChar) ||
                brackets.left.test(sel.focusNode.previousSibling && sel.focusNode.previousSibling.textContent) ||
                brackets.left.test(sel._lastNonBlankCharNodeInline.lastNonBlankChar)
              const prevCharIsClosed = !prevCharIsOpen && (
                prevChar === ',' ||
                brackets.right.test(prevChar) ||
                brackets.right.test(sel.focusNode.previousSibling && sel.focusNode.previousSibling.textContent)
              )
              const prevCharsArePaired = prevCharIsClosed && brackets.left.test(prevChar2)
              if (e.key === 'Backspace') {
                if (prevCharIsOpen && brackets.pair(prevChar) === nextChar
                  || quotes.includes(prevChar) && prevChar === nextChar
                ) {
                  e.preventDefault()
                  sel.setBaseAndExtent(sel.focusNode, sel.focusOffset - 1, sel.focusNode, sel.focusOffset + 1)
                  sel.deleteFromDocument()
                  sel._collapse()
                }
              }
              else if (['Tab', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                if (!ac.isConnected) {
                  switch (e.key) {
                    case 'Tab':
                      e.preventDefault()
                      sel._indentManually()
                      break
                    case 'Enter':
                      if (e.ctrlKey) {
                        await info.eval()
                        break
                      }
                      const indentedText = indent('\n', prevCharIsOpen)
                      if (indentedText === '\n') break
                      e.preventDefault()
                      if ([prevChar2, prevChar].every(brackets.left.test) && brackets.right.test(nextChar) && !brackets.right.test(nextChar2)) {
                        sel._moveCaret(-1)
                        replaceSelectedText(indentedText)
                        sel._cleanRange()
                        sel._moveCaret()
                      }
                      else {
                        replaceSelectedText(indentedText)
                        sel._cleanRange()
                        if (nextChar !== '\n' && brackets.right.test(sel._nextNonBlankCharNode.nextNonBlankChar)) {
                          replaceSelectedText(indent('\n', 0, prevCharIsOpen || !(prevCharsArePaired && brackets.left.test(prevChar3))))
                          sel._cleanRange('Start')
                        }
                      }
                      break
                  }
                }
                else {
                  e.preventDefault()
                  switch (e.key) {
                    case 'Tab':
                    case 'Enter':
                      ac._choose(); break
                    case 'ArrowUp':
                    case 'ArrowDown':
                      ac._switch(e.key); break
                  }
                }
              }
              else {
                if (pairs.includes(e.key)) {
                  let ePD
                  switch (true) {
                    case ePD = e.key === nextChar:
                      sel.collapse(sel.focusNode, sel.focusOffset + 1)
                      break
                    case ePD = leftPairs.includes(e.key):
                      sel.collapse(replaceSelectedText(quotes.includes(e.key) ? e.key.repeat(2) : e.key + brackets.pair(e.key)), 1)
                      if (prevChar === '[' && nextChar === ']' && /["'`]/.test(e.key)) ac.autocomplete('propWord')
                      break
                  }
                  if (ePD) e.preventDefault()
                }
                else {
                  ac._clearPrevious()
                  if (e.repeat && !['Shift', 'ArrowLeft', 'ArrowRight'].includes(e.key)) ac._remove()
                  else if (!e.ctrlKey) switch (e.key) {
                    case ' ':
                      let { lastNonBlankSeq: newWord } = sel._lastNonBlankSequence
                      if (ac._wordSet.custom.includes(newWord)) ac._remove()
                      else { (newWord = tryMatch(newWord, /\w+/)) && ac._wordSet.custom.push(newWord) } break
                    case '.':
                      ac.autocomplete(); break
                    case 'Control':
                      ac.isConnected
                        ? ac._remove()
                        : _lastPressedKey.key && _lastPressedKey.key.endsWith(e.key)
                        && e.timeStamp - _lastPressedKey.time <= delayOfDoubleHit
                        && ac.autocomplete(); break
                    case 'ArrowLeft': case 'ArrowRight':
                      focusingWord.wordChanged && ac._remove(); break
                    case 'Home':
                      if (['\n', undefined].includes(prevChar) && boundaryChars.blank.test(nextChar)) {
                        e.preventDefault()
                        const { forthOffset } = sel._nextNonBlankCharNodeInline
                        sel._moveCaret(forthOffset)
                      }
                      break
                    case 'End':
                      if (['\n', undefined].includes(nextChar) && boundaryChars.blank.test(prevChar)) {
                        e.preventDefault()
                        const { backOffset } = sel._lastNonBlankCharNodeInline
                        sel._moveCaret(backOffset + 1)
                      }
                      break
                    default:
                      if (!['Shift', 'CapsLock'].includes(e.key)) {
                        e.key.length === 1
                          ? ac.autocomplete()
                          : ac._remove()
                      }
                  }
                }
              }
            }
          })
          info.addEventListener('keyup', async e => {
            if (e.ctrlKey) { sel.type === 'None' && refocus(info) }
            if (!sel._charBeforeCaret.trim()) return ac._remove()
            if (e.key === 'Enter' && e.ctrlKey) return
            if (e.key.startsWith('Arrow')) {
              recordLastSelection(info)
              ac._eager ? ac.autocomplete() : focusingWord.wordChanged && !focusingWord.propWord && ac._remove()
            }
            else {
              if (sel.isCollapsed) {
                if (
                  65 <= e.keyCode && e.keyCode <= 90
                  || 96 <= e.keyCode && e.keyCode <= 105
                  || ac._keysToCapture.includes(e.key)
                  || ac._eager
                  || ['Backspace', 'Delete'].includes(e.key)
                  || isChromeMobile && e.key === 'Unidentified'
                ) ac.autocomplete()
                if (!e.ctrlKey && (e.keyCode === 13 || 32 <= e.keyCode <= 126)) delFrontInputHistory(info)
              }
            }
          })
          setTimeout(() => {
            info.focus()
            recordInputHistory.obsr(info)
          })
          !isLangEn(_userLang) && setTimeout(() => { info.prepend(' '); info.innerText = '' })
          info.addEventListener('focus', () => {
            if (ac.isConnected) return
            observerFor_switchLang.disconnect()
            refocus(info)
          })
          info.addEventListener('focusout', e => {
            if (ac._focusing) return
            observerFor_switchLang.observeAll()
            if (!(
              isTouchDevice && (isFirefox ? ac.contains(e.explicitOriginalTarget) : true)
            )) ac._remove()
          })
          info.addEventListener('pointerdown', () => {
            info.addEventListener('pointerup', () => recordLastSelection(info), { once: true })
          })
          initForStyleSmoothly(info, 'height')
          header.head = header.firstElementChild
          header.head.Bak = header.head.innerText
          header.addEventListener('click', () => {
            if (sel.type !== 'Caret') {
              header.setAttribute('selected', '')
              selectWholeText(header.head)
              return
            }
            if (header.hasAttribute('selected')) {
              header.removeAttribute('selected')
              return
            }
            if (header.head.contentEditable !== 'true') {
              const height = info.clientHeight ? 0 : info.style.getPropertyValue('--expanded-height')
              updateStyleSmoothly(info, { height })
              infoBlock.style.setProperty('--line-num-border-right', height ? '' : 'none')
              info.style.outline = height ? '' : '1px solid'
              info.setAttribute('collapsed', height ? '' : true)
            }
          })
          header.addEventListener('dblclick', () => {
            header.head.contentEditable = true
            header.head.bak = header.head.innerText
          })
          header.head.addEventListener('keydown', ({ key }) => key === 'Enter' && setTimeout(() => header.head.blur()))
          header.head.addEventListener('focusout', () => {
            header.head.contentEditable = 'inherit'
            $id(header.head.bak).id = header.head.innerText =
              header.head.innerText.trim().replace(/\s/g, '_') || header.head.Bak
          })
        }
        else {
          infoBlock._info = info
          infoBlock.setAttribute('output', '')
          if (!_console._options.not_count) {
            const num = ioBlockCount.output
            info.id = `output${num}`
            infoBlock.insertAdjacentHTML('afterbegin', `
        <header class=num-circ><div>${num}</div></header>
      `)
            const header = infoBlock.querySelector('header')
            header.addEventListener('click', () => sel.selectAllChildren(info))
            if (num > 99) header.classList.add('long')
          }
        }
      }
      delete qBox._value
      try {
        _console._options.prependTo.prepend(infoBlock)
      } catch (e) {
        (_console._options.appendTo || _console).appendChild(infoBlock)
      }
      if (inCodeMode && _console.lastChild && !_console._options.noReturn)
        isInView(_console)
          ? infoBlock.scrollIntoView({ block: 'nearest' })
          : window.Tosta && new Tosta(infoBlock.firstElementChild.innerText, { className: 'code' })
      _console._options.clear()
      return infoBlock
    }
    Object.defineProperty(_console.log, 'description', { get() { return translate`I am a modified function that roughly resembles "console.log".` } })
    Object.defineProperty(_console, '_options', { value: {}, writable: false, configurable: false })
    _console._options.setOnce = function (...opts) {
      switch (true) {
        case Array.isArray(opts[0]):
          opts = opts[0]
          break
        case typeof opts[0] === 'object':
          opts = Object.entries(opts[0])
          opts.forEach(([opt, v]) => {
            this[opt] = v
            setTimeout(() => delete this[opt])
          })
          return
      }
      opts.forEach(opt => {
        this[opt] = true
        setTimeout(() => delete this[opt])
      })
    }
    _console._options.clear = () => 'text formatInText not_count'.split(' ').forEach(opt => delete _console._options[opt])
    _console.logEery = function (optionsSet) {
      _console._options.setOnce(optionsSet)
      return _console.log(...Array.prototype.slice.call(arguments, 1))
    }
    _console.logAndTranslate = _console.logEery.bind('', 'translate')
    _console.logWithoutCount = _console.logEery.bind('', 'not_count')
    _console.logTrifle = _console.logEery.bind('', ['translate', 'not_count'])
    _console.logFromTop = function () {
      const str = arguments.toString()
      if (_console.logFromTop.Set.has(str)) return
      _console.logFromTop.Set.add(str)
      setTimeout(() => _console.logFromTop.Set.delete(str))
      _console._options.setOnce('translate', 'not_count')
      const infoBlock = _console.log(...arguments)
      infoBlock.className = 'info-top unfold-from-top'
      const info = infoBlock.querySelector('[info]')
      if (!info.querySelector('p')) {
        const p = document.createElement('p')
        p.append(...info.childNodes)
        info.append(p)
        p.style.cssText = 'margin: var(--pad-size) auto'
        info.style.cssText = 'display: flex; align-items: center'
      }
      return infoBlock
    }
    _console.logFromTop.Set = new Set
    const fadeLog = (...info) => devMode && fadeOut(_console.logWithoutCount(translate(...info)))
    function refocus(info) {
      setTimeout(focusToLastSelection, 0, info)
    }
    function reputCaret(info = getEditing()) {
      focusToLastCaretPos(rewriteInput(info))
    }
    function getEditing() {
      return sel.focusNode && sel.focusNode._closest('[info]')
    }
    function updateLnNum(lnNumDiv) {
      clearTimeout(lnNumDiv._tid_updateLnNum)
      lnNumDiv._tid_updateLnNum = setTimeout(_updateLnNum, delayOfInput / 2, ...arguments)
    }
    function _updateLnNum(lnNumDiv, info, infoBlock) {
      lnNumDiv.innerHTML = '<div></div>'.repeat(Math.max(0, (info.innerText.match(/\n/g) || []).length))
      const lnNumDivWidth = `${lnNumDiv.getBoundingClientRect().width}px`
      info.style.left = lnNumDivWidth
      infoBlock.style.setProperty('--pencil-width', lnNumDivWidth)
    }
    function recordInputHistory(info = getEditing()) {
      if (!(info = info._closest('[info]'))) return
      if (_lastPressedKey.key !== 'Ctrl Enter') recordLastSelection(info)
      clearTimeout(info._tid_recordInputHistory)
      info._tid_recordInputHistory = setTimeout(_recordInputHistory, delayOfRecord, info)
    }
    function _recordInputHistory(info = getEditing()) {
      if (sel.type === 'None') return
      if (!info || !info.isConnected || !(info = info._closest('[info]'))) return
      info.normalize()
      if (info.innerText === info._inputHistory[info._inputHistory.ptr][0]) {
        info._inputHistory[info._inputHistory.ptr][1] = getLnCol()
        return
      }
      info._inputHistory.push([info.innerText, getLnCol()])
      ++info._inputHistory.ptr
      delFrontInputHistory(info)
      info._updateLnNum()
    }
    recordInputHistory._obsr = new MutationObserver(([m]) => {
      switch (m.type) {
        case 'childList':
        case 'characterData':
          recordInputHistory(m.target)
          break
        case 'attributes':
          if (m.target.hasAttribute('info'))
            m.target._header.firstElementChild.innerText = m.target.id
          break
      }
    })
    recordInputHistory._obsrInit = { childList: true, characterData: true, subtree: true, attributeFilter: ['id'] }
    recordInputHistory.obsr = info => recordInputHistory._obsr.observe(info, recordInputHistory._obsrInit)
    function delFrontInputHistory(info) {
      if (info._inputHistory.isPtrEnd) return
      info._inputHistory.splice(info._inputHistory._ptr + 1)
    }
    function getLnCol() {
      return [Math.max(1, getLnNum()), getCol()]
    }
    function getLnNum(entryNode = sel.focusNode && sel.focusNode._closest('[contenteditable]'), focusNode = sel.focusNode, inst = {}) {
      let ln = 0
      if (!(entryNode && entryNode.childNodes)) ln = 1
      else for (const node of entryNode.childNodes) {
        if (inst.found) break
        if (node === focusNode) inst.found = true
        switch (node.nodeType) {
          case Node.TEXT_NODE:
            ln += node.data.substring(0, (inst.found ? sel.focusOffset : Infinity)).match(/^/gm).length; break
          case Node.ELEMENT_NODE:
            ln += inst.found || node.localName === 'br' || getLnNum(node, focusNode, inst); break
        }
      }
      return ln
    }
    function getCol() {
      if (sel.focusNode.nodeType !== Node.TEXT_NODE) {
        const textNode = firstTextChild()
        return textNode ? textNode.data.length + 1 : 1
      }
      return sel.focusNode.data.substring(0, sel.focusOffset).match(/(?<=\n|^).*$/)[0].length + 1
    }
    function rewriteInput(info = getEditing()) {
      const [text, [ln, col]] = info._inputHistory[info._inputHistory.ptr]
      let offset = 0, reg = /^/gm, arr, lineCount = 0
      while (arr = reg.exec(text)) {
        offset = arr.index
        ++reg.lastIndex
        if (++lineCount >= ln) break
      }
      offset += col - 1
      info._lastOffset = Math.min(offset, text.length)
      flatInput(info, text)
      return info
    }
    function flatInput(info = getEditing(), text = info && info.innerText) {
      if (!info) return
      info.textContent = text
    }
    function focusToLastCaretPos(info) {
      if (!info._lastOffset) return
      const collapseToNode = firstTextDescendant(info) || info.appendChild(document.createTextNode(''))
      info._lastOffset = Math.min(info._lastOffset, (collapseToNode.innerText || collapseToNode.data).length)
      sel.collapse(collapseToNode, info._lastOffset)
    }
    function recordLastSelection(info) {
      pickKeys(sel, 'focusNode anchorOffset focusOffset', info._lastSel || (info._lastSel = {}))
    }
    function focusToLastSelection(info) {
      if (!(
        info._lastSel && info._lastSel.focusNode &&
        info._lastSel.focusNode.isConnected
      )) return
      try {
        sel.setBaseAndExtent(...
          'focusNode anchorOffset focusNode focusOffset'
            .split(' ').map(v => info._lastSel[v])
        )
      } catch (e) { }
    }
    window.ac = html`<div class='code autocomplete' contenteditable=false translate=no></div>`
    ac._eager = isChromeMobile || false
    ac._keysToCapture = '$ _ \\ ( )'.split(' ')
    ac._dictSet = {}
    ac._wordSet = {
      get 'Browser-Native-APIs'() {
        try { return getInheritedEnumerableKeys(focusingWord.propWord ? eval(focusingWord.propWord) : window) } catch (e) { return [] }
      },
      custom: ['_console.log']
    }
    ac._wordMode = Object.keys(ac._wordSet)
    ac._wordMode.filterOut = new Set
    Object.defineProperties(ac, {
      _wordDict: {
        get() {
          ['JS-Keywords', 'custom'].forEach(ac._wordMode.filterOut[focusingWord.propWord ? 'add' : 'delete'].bind(ac._wordMode.filterOut))
          return this._wordMode
            .filter(mode => !ac._wordMode.filterOut.has(mode))
            .flatMap(mode => ac._wordSet[mode])
        }
      }
    })
    ac._wordsMatched = []
    ac._wordFreq = new Proxy({}, {
      get(target, key) { return target.hasOwnProperty(key) && target[key] || 0 }
    })
    ac.style.setProperty('--candidates-per-scroll', ac._css__candidates_per_scroll = 8)
    ac.addEventListener('choose', function (e) {
      let wordChosen = e.detail.target || this._selected || this.firstElementChild
      if (!wordChosen) return
      wordChosen = wordChosen.textContent
      --ac._wordFreq[wordChosen]
      const acText = eval('`' + wordChosen + '`')
      !focusingWord.isDot && sel.setBaseAndExtent(focusNodeFallback(), offsetFallback(focusingWord.startOffset), focusNodeFallback(), offsetFallback(focusingWord.endOffset))
      const newNode = replaceSelectedText(indent(acText))
      acText.endsWith('()') ? sel.collapse(newNode, newNode.data.length - 1) : sel._cleanRange()
      _recordInputHistory()
      ac._remove()
    })
    ac.addEventListener('select', function (e) {
      if (this === e.target) return
      this._selected.classList.remove('select')
      this._selected = e.target
      e.target.classList.add('select')
      this._selected.scrollIntoView({ block: 'nearest' })
    })
    ac.addEventListener('pointerdown', () => ac._focusing = true)
    ac.addEventListener('pointerup', () => delete ac._focusing)
    ac.addEventListener('click', function (e) { this._choose(e.target.closest('li')) })
    ac.addEventListener('contextmenu', e => {
      const word = e.target.closest('li').innerText
      const delCus = ac._wordSet.custom.indexOf(word)
      if (~delCus) {
        const _msg = `${translate('Removed the self-making word: ')}<code>${ac._wordSet.custom[delCus]}</code>`
        delete ac._wordSet.custom[delCus]
        ac._wordSet.custom = ac._wordSet.custom.flat()
        try { msg(_msg) } catch (e) { console.log(_msg) }
      }
      else if (isViewOverflow(ac)) {
        const m = msg(`<code>${word}</code>`)._msgDiv.firstElementChild
        m.scrollLeft = m.scrollWidth
      }
    })
    ac._choose = target => ac.dispatchEvent(new CustomEvent('choose', { detail: { target } }))
    ac._switch = arrow => {
      if (!ac._selected) {
        ac._selected = ac[`${arrow === 'ArrowDown' ? 'first' : 'last'}ElementChild`]
        ac._selected && ac._selected.dispatchEvent(new CustomEvent('select', { bubbles: true }))
        return
      }
      ac._selectedTo = ac._selected[`${arrow === 'ArrowUp' ? 'previous' : 'next'}ElementSibling`]
      if (!ac._selectedTo) {
        ac._selectedTo = ac[`${arrow === 'ArrowDown' ? 'first' : 'last'}ElementChild`]
      }
      ac._selectedTo.dispatchEvent(new CustomEvent('select', { bubbles: true }))
    }
    ac._remove = () => {
      if (!ac.isConnected) return
      [ac, wordHighlightBlock].forEach(el => el.remove())
      focusingWord.clear()
    }
    ac._clearPrevious = () => {
      delete ac._selected
    }
    ac.autocomplete = function (clearBeforehand) {
      focusingWord.clear()
      clearTimeout(this.delayedAC)
      this.delayedAC = setTimeout(autocomplete, delayOfInput)
      if (clearBeforehand) {
        _recordInputHistory()
        reputCaret()
      }
    }
    const wordHighlightBlock = html`<div class=word-highlight-block translate=no></div>`
    function autocomplete() {
      if (!ac._wordMode.length) return
      focusingWord.wordChanged
      if (!(focusingWord.propWord || focusingWord.trimmedWord) || focusingWord.word.endsWith('\n')) return ac._remove()
      const focusedWord = focusingWord.isDot ? '' : focusingWord.trimmedWord || focusingWord.propWord
      if (ac._wordToBeAC === `${focusingWord.trimmedWord} ${focusingWord.propWord}`)
        return ac.childElementCount && !(
          focusingWord.propWord === '(Array.prototype)' && sel._lastNonBlankCharNode.lastNonBlankChar === ']'
        )
          ? updateACPos() : ac._remove()
      ac._wordToBeAC = `${focusingWord.trimmedWord} ${focusingWord.propWord}`
      ac._wordsMatched = focusingWord.isDot
        ? getInheritedEnumerableKeys(eval(focusingWord.propWord))
        : focusingWord.trimmedWord
          ? sortByLiteralDifference(focusingWord.trimmedWord, ac._wordDict, {
            matchFirst: focusingWord.trimmedWord.length === 1, wordFreq: ac._wordFreq
          })
          : ac._wordDict.sort()
      ac.innerHTML = ''
      if (!ac._wordsMatched.length) return ac._remove()
      ac.append(...genListContent(ac._wordsMatched))
      if (focusingWord.trimmedWord && !focusingWord.isDot) {
        const cWords = focusedWord.toLowerCase()
        ac.childNodes.forEach(li => {
          let bWordChars = li.textContent
          const liLowText = bWordChars.toLowerCase()
          let idx = liLowText.indexOf(cWords)
          if (!~idx) {
            idx = cWords.indexOf(liLowText)
            if (~idx && bWordChars.length < cWords.length) idx = 0
          }
          if (~idx) {
            li.innerHTML =
              bWordChars.slice(0, idx) +
              `<b>${bWordChars.slice(idx, idx + focusedWord.length)}</b>` +
              bWordChars.slice(idx + focusedWord.length)
          }
          else {
            let aWords = [...bWordChars], bWords = aWords.slice()
            const charsSet = {}
            aWords.forEach(w => ++charsSet[w] || (charsSet[w] = 1))
            bWordChars = liLowText
            const cWordChars = [...cWords]
            cWordChars.forEach((char, i) => {
              idx = bWordChars.indexOf(char, i)
              if (!~idx) idx = bWordChars.lastIndexOf(char, bWordChars.length - i)
              if (!~idx) idx = bWordChars.lastIndexOf(char)
              if (~idx) {
                if (aWords[idx].startsWith('<b>'))
                  idx = bWordChars.lastIndexOf(char, idx - 1)
                if (!~idx)
                  idx = bWordChars.indexOf(char)
                if (aWords[idx].startsWith('<b>'))
                  idx = bWordChars.indexOf(char, idx + 1)
                if (aWords[idx] && aWords[idx].startsWith('<b>'))
                  idx = bWordChars.indexOf(char, idx + 1)
                if (~idx)
                  aWords[idx] = `<b>${aWords[idx]}</b>`
              }
            })
            cWordChars.forEach(char => {
              idx = bWordChars.lastIndexOf(char)
              if (~idx) {
                if (bWords[idx].startsWith('<b>'))
                  idx = bWordChars.lastIndexOf(char, idx - 1)
                if (~idx)
                  bWords[idx] = `<b>${bWords[idx]}</b>`
              }
            })
            li.innerHTML = aWords.map((w, i) => (
              --charsSet[w],
              w.startsWith('<b>')
                ? w : bWordChars[i].startsWith('<b>') && charsSet[w] >= 0
                  ? bWordChars[i]
                  : w
            )).join('')
            const partFullyMatch = midTextIncludes(li.innerHTML.toLowerCase(), cWords)
            if (partFullyMatch) {
              const slidx = liLowText.indexOf(partFullyMatch)
              li.innerHTML =
                li.textContent.slice(0, slidx) +
                `<b>${li.textContent.slice(slidx, slidx + partFullyMatch.length)}</b>` +
                li.textContent.slice(slidx + partFullyMatch.length)
            }
            else {
              const allCharsMatchedButUnordered = [...liLowText].sort().join('') === [...cWords].sort().join('')
              bWords = [...li.querySelectorAll('b')]
              bWordChars = bWords.map(v => v.textContent).join('').toLowerCase()
              let nonPair = new Set
              let preIdx = -1
              cWordChars.forEach(char => {
                idx = bWordChars.indexOf(char, ++preIdx)
                if (!~idx || idx !== preIdx) return nonPair.add(preIdx)
                preIdx = idx
              })
              if (~preIdx) bWords.filter((_v, i) => nonPair.has(i)).forEach(v => replaceTag(v))
              !allCharsMatchedButUnordered && mergeTag(li)
              nonPair = [...nonPair].map(v => cWordChars[v])
              bWords = [...li.querySelectorAll('i')]
              bWords.forEach(v =>
                !nonPair.includes(v.textContent.toLowerCase())
                && cWords.includes(v.textContent.toLowerCase())
                && replaceTag(v, 'b')
              )
              if (!allCharsMatchedButUnordered) {
                bWords = [...li.querySelectorAll('b')].sort((a, b) =>
                  b.textContent.length - a.textContent.length
                )
                const invSibs = (bW, nodeName) => [bW.nextSibling, bW.previousSibling]
                  .filter(sib => sib && sib.nodeName === nodeName.toUpperCase())
                bWords.forEach(bW => {
                  invSibs(bW, 'b').forEach(sib => replaceTag(sib))
                  invSibs(bW, 'i').forEach(sib =>
                    bW.textContent.length <= sib.textContent.length * 1.5 &&
                    replaceTag(bW)
                  )
                })
                mergeTag(li)
                bWords = [...li.querySelectorAll('b,i')]
                if (cWords.includes(bWords.map(v => v.textContent).join('').toLowerCase())) {
                  mergeTag(li, { sameTag: false })
                }
              }
            }
          }
        })
        const rm = []
        let similar = 0, identical, liText
        ac.childNodes.forEach(li => {
          if (li.textContent.toLowerCase() === cWords) return identical = cWords
          liText = li.textContent.replace('()', '')
          if (liText.length < cWords.length) return rm.push(li)
          if (strIncludes(li.textContent, cWords)) return ++similar
          if (
            identical ||
            similar > 3 ||
            !isFirstNon$_CharLowerEqual(li.textContent, cWords) && (
              liText.length / cWords.length > 0.66 ||
              ac.childElementCount > ac._css__candidates_per_scroll && (
                !li.querySelector('b') ||
                li.querySelector('b, i').textContent[0].toLowerCase() !== cWords[0]
              )
            )
          ) rm.push(li)
        })
        rm.forEach(li => li.remove())
      }
      if (!ac.childElementCount) return ac._remove()
      updateACPos()
    }
    function updateACPos() {
      const range = new Range()
      range.setStart(focusNodeFallback(), offsetFallback(focusingWord.startOffset))
      range.setEnd(focusNodeFallback(), offsetFallback(focusingWord.endOffset))
      const rect = range.getBoundingClientRect()
      let { left, bottom, top, width, height } = rect
      top += scrollY
      bottom += scrollY
      wordHighlightBlock.style.left = `${left}px`
      wordHighlightBlock.style.top = `${top}px`
      wordHighlightBlock.style.width = `${width}px`
      wordHighlightBlock.style.height = `${height}px`
      range.detach()
      ac.style.left = ''
      ac.style.right = ''
      ac.style.setProperty('--word-left', left + (focusingWord.isDot ? width : 0))
      ac.style.setProperty('--word-bottom', bottom)
      ac.style.setProperty('--max-word-len', Math.max(...Array.prototype.map.call(ac.children, v => v.textContent.length)))
      ac.style.setProperty('width', ac.children.length > ac._css__candidates_per_scroll ? 'var(--scroll-width)' : '')
      body.append(ac, wordHighlightBlock)
      ac.scrollIntoView({ block: 'nearest' })
      if (ac.getBoundingClientRect().right > body.clientWidth) {
        ac.style.left = 'unset'
        ac.style.right = 0
      }
      if (isViewOverflow(ac)) ac.style.left = 0
    }
    function offsetFallback(offset) {
      return focusingWord.node && focusingWord.node.isConnected
        ? [offset, sel.focusOffset].find(v => !isNaN(v))
        : sel.focusOffset
    }
    function focusNodeFallback() {
      return focusingWord.node && focusingWord.node.isConnected && focusingWord.node || sel.focusNode
    }
    function mergeTag(elem, { sameTag } = {}) {
      return elem instanceof HTMLElement
        ? elem.innerHTML = mergeTag._repl(elem.innerHTML, sameTag)
        : elem = mergeTag._repl(elem, sameTag)
    }
    mergeTag._repl = (str, sameTag) => str.replace(mergeTag._reg(sameTag), '')
    mergeTag._reg = (sameTag = true) => RegExp(`</(\\w+)><${sameTag ? '\\1' : '\\w+'}>`, 'g')
    function mergeTagAndMid(innerHTML) {
      innerHTML = innerHTML.match(mergeTagAndMid._reg)
      if (innerHTML) innerHTML = innerHTML.shift().replace(mergeTagAndMid._reg2, '')
      return innerHTML
    }
    mergeTagAndMid._reg = /<\w+>.*<\/\w+>/
    mergeTagAndMid._reg2 = /<\w+>|<\/\w+>/g
    function midTextIncludes(innerHTML, str) {
      innerHTML = mergeTagAndMid(innerHTML)
      return innerHTML && str.includes(innerHTML) && innerHTML
    }
    function replaceTag(node, tag = 'i') {
      node.replaceWith(Object.assign(
        document.createElement(tag), { textContent: node.textContent }
      ))
    }
    const focusingWord = {
      get wordNotChanged() {
        focusWord()
        return focusingWord.word === focusingWord.wordWas
      },
      get wordChanged() {
        return !this.wordNotChanged
      },
      clear() {
        'word trimmedWord propWord isDot node startOffset endOffset caretOffset'.split(' ').forEach(
          key => delete focusingWord[key]
        )
      }
    }
    function focusWord() {
      if (!(sel.focusNode && sel.focusNode.nodeName === '#text')) return {}
      const str = sel.focusNode.data
      let offset = sel.focusOffset - 1
      let word = str[offset]
      const isDot = word === '.'
      if (boundaryChars.general.includes(word) || '\\' === str[offset - 1]) {
        word = ''
        ++offset
      }
      if (!~offset || word === ' ') word = ''
      else while (offset > 0 && !(
        boundaryChars.blank.test(str[offset - 1]) ||
        boundaryChars.general.includes(str[offset - 1]) ||
        '\\' === str[offset - 2]
      )) {
        word = str[--offset] + word
      }
      offset = sel.focusOffset - 1
      while (offset < str.length - 1 && !(
        boundaryChars.blank.test(str[offset + 1]) ||
        boundaryChars.general.includes(str[offset + 1])
      )) {
        word += str[++offset]
      }
      ++offset
      const endOffset = offset, startOffset = endOffset - word.length
      Object.assign(focusingWord, {
        isDot,
        wordWas: focusingWord.word,
        node: sel.focusNode,
        word, trimmedWord: word.trim(),
        startOffset,
        endOffset,
        caretOffset: sel.focusOffset
      })
      focusingWord.propWord = (sel._nextNonBlankSequence.nextNonBlankSeq.match(/^\/\/<(.*)>$/) || [])[1]
      if (!focusingWord.propWord) {
        offset = startOffset
        let topProp = startOffset, parentProp = startOffset, substr, parentPropHit
        while (--offset >= 0) {
          substr = str.substring(offset, startOffset)
          if (!parentPropHit) {
            if (boundaryChars.prop.last.test(substr)) continue
            if (!boundaryChars.prop.general.test(substr)) break
            topProp = offset
            parentProp = offset + 1
            parentPropHit = true
            continue
          }
          if (boundaryChars.prop.general.test(substr)) topProp = offset
          else if (!boundaryChars.prop.last.test(str.substring(offset, topProp))) break
        }
        focusingWord.propWord = str.substring(topProp, parentProp)
      }
      if (!focusingWord.propWord) {
        if (sel._lastNonBlankCharNode.lastNonBlankChar !== ']') {
          let _str = str, focusNode = focusingWord.node
          _str = _str.substring(0, endOffset + 2)
          if (focusNode.previousSibling && focusNode.previousSibling.nodeType === Node.TEXT_NODE) {
            focusNode = focusNode.parentNode
            focusNode.normalize()
            _str = focusNode.textContent.substring(0, sel.focusOffset + 2)
          }
          let bracketProps
          boundaryChars.prop.bracket.find(reg => (bracketProps = _str.match(reg)) && (focusingWord.propWord = bracketProps[1]))
        }
      }
      if (!focusingWord.propWord) {
        let chars, offsetToCaret = 0
        while (chars = sel._getCharsBeforeCaret(++offsetToCaret), chars[0]) {
          if (!/^[\]`]?\s*\.?\s*[A-z]{0,14}$/m.test(chars.join(''))) break
          if (chars[0] === ']') { focusingWord.propWord = '(Array.prototype)'; break }
          if (chars[0] === '`') { focusingWord.propWord = '(String.prototype)'; break }
        }
      }
      if (!focusingWord.word) {
        const { lastNonBlankSeq, lastNonBlankSeqOffset: startOffset } = sel._lastNonBlankSequence
        if (lastNonBlankSeq) {
          Object.assign(focusingWord, {
            trimmedWord: lastNonBlankSeq,
            startOffset,
            endOffset: startOffset + lastNonBlankSeq.length
          })
        }
      }
      return focusingWord
    }
    function convertDotToObj(arr, obj) {
      if (typeof arr === 'string') arr = arr.split('.')
      if (!Array.isArray(arr)) throw TypeError('The parameter is only accepted as <Array> or <string>.')
      if (!(obj && typeof obj === 'object')) obj = this !== window ? this : {}
      return pathTo(arr, obj)
    }
    function pathTo(path = [], obj = {}, endVal = 0) {
      return Array.isArray(path)
        ?
        (
          path.reduce((obj, key, i) =>
            obj.hasOwnProperty(key)
              ? i < path.length && (
                obj[key] = typeof obj[key] === 'object' ? obj[key] : {}
              )
              : pathTo(key, obj, i === path.length - 1 && endVal),
            obj
          ),
          obj
        )
        : obj[path] = endVal === false ? {} : endVal
    }
    window.genDictForAutocomplete = genDictForAutocomplete
    function genDictForAutocomplete(dictName, words) {
      if (typeof words === 'string') words = words.trim().split(/\n+/).map(v => v.trim())
      else if (words instanceof Set) { words = [...words]; words._isFromSet = true }
      else if (!Array.isArray(words)) throw TypeError('The parameter `words` is only accepted as <Array> or <Set> or <string>.')
      if (!words._isFromSet) words = [...new Set(words)]
      const dict = {}, lexOrd = {}
      const pushWord = (obj, word) => (obj[word[0]] || (obj[word[0]] = [])).push(word)
      words.forEach(word => {
        pushWord(dict, word)
        pushWord(lexOrd, word.split('.').map(v => [...v].sort().join('')).join('.'))
      })
      const nest = {}
      words.forEach(convertDotToObj, nest)
      ac._dictSet[dictName] = { words, dict, lexOrd, nest }
      ac._wordSet[dictName] = words
      ac._wordMode.push(dictName)
    }
    function sortByLiteralDifference(
      compareStr = '', refStrArr = [],
      {
        matchFirst: mustMatchFirst, threshold = 0.36, trimParen = true, wordFreq
      } = {}
    ) {
      let litDiff = refStrArr.map(refStr => (
        refStr = String(refStr),
        literalDifference(
          compareStr,
          trimParen ? refStr.replace('()', '') : refStr
        )
      ))
      const filtered = []
      litDiff = litDiff.filter((diff, i) =>
        (!mustMatchFirst && compareStr.length / threshold ** 2 >= refStrArr[i].length ||
          isFirstNon$_CharLowerEqual(compareStr, refStrArr[i])
        ) &&
        diff <= refStrArr[i].length * threshold ** 0.8 &&
        compareStr.length * threshold <= refStrArr[i].length &&
        filtered.push(refStrArr[i])
      )
      const filteredStrByDiff = {}
      const near = [], rest = []
      filtered.forEach((str, i) =>
        (
          (filteredStrByDiff[str]
            = str.replace(/\s|[)\]}]$/g, '') === compareStr
              ? 0 : litDiff[i] + (wordFreq && wordFreq[str] || 0)
          )
            <= Math.max(1, str.length / compareStr.length)
            ? near : rest
        ).push(str)
      )
      if (filteredStrByDiff.hasOwnProperty(`${compareStr}()`))
        filteredStrByDiff[`${compareStr}()`] = 1e-8
      near.sort((a, b) => filteredStrByDiff[a] - filteredStrByDiff[b])
      const firstLetter = firstNon$_CharLower(compareStr)
      const lift = [], tooFar = []
      rest.forEach(str =>
        ((isFCE(compareStr, str) || isFirstNon$_CharLowerEqual(firstLetter, str)) &&
          str.length / compareStr.length <= threshold
          ? lift : tooFar
        ).push(str)
      )
      tooFar.sort((a, b) => a.length - b.length)
      refStrArr = [...new Set([...near, ...lift, ...tooFar])]
      return refStrArr
    }
    function literalDifference(cprStr, refStr) {
      return Math.abs(1 -
        (
          literalDifference_oneDirection(cprStr, refStr) +
          literalDifference_oneDirection(refStr, cprStr, { cacheIt: false })
        ) / 2)
    }
    function literalDifference_oneDirection(comparator = '', ref = '',
      { cacheIt = true } = {}
    ) {
      if (comparator === ref) return 1
      if ([comparator, ref].some(v => typeof v !== 'string' && !(v && typeof v === 'object')))
        return Number(comparator === ref)
      const chars = { com: comparator, ref }
      const [comChars, refChars] = [comparator, ref].map((str, i) =>
        typeof v === 'object'
          ? v
          : literalDifference_oneDirection.splitToChars(str, i && cacheIt)
      )
      let comIdx, refIdx, idxDiff = 0
      Object.keys(comChars).forEach(char => {
        while (comChars[char] && refChars[char]) {
          [comIdx, refIdx] = [comChars[char], refChars[char]]
            .map(literalDifference_oneDirection.parseIdx)
          literalDifference_oneDirection.clearToNext(comChars, char, comIdx)
          literalDifference_oneDirection.clearToNext(refChars, char, refIdx)
          idxDiff +=
            (
              comIdx - refIdx +
              (comIdx + 1) / comparator.length - (refIdx + 1) / ref.length
            )
            / 2
        }
      })
      const unmatched = {}
      Object.entries({ comChars, refChars }).forEach(([k, v]) =>
        unmatched[`${k}Idxs`] = Object.values(v).join(' ').split(' ').filter(Boolean)
      )
      const countUnmatched = which => unmatched[`${which}CharsIdxs`]
        .reduce((sum, idx) => sum + ++idx / chars[which].length, 0)
      idxDiff += Object.keys(chars).reduce((sum, countOf) => sum + countUnmatched(countOf), 0)
      idxDiff /= strIncludes(comparator, ref)
        ? comparator.length / Math.max(comparator.length, ref.length) + ref.length
        : 1
      return 1 - idxDiff
    }
    Object.assign(literalDifference_oneDirection, {
      splitCharsCache: new Map,
      splitToChars(str, cacheIt) {
        if (this.splitCharsCache.has(str)) return { ...this.splitCharsCache.get(str) }
        const labels = {};
        [...str].forEach((s, i) => labels[s] = (labels[s] ? labels[s] + ' ' : '') + i)
        if (cacheIt) this.splitCharsCache.set(str, { ...labels })
        return labels
      },
      parseIdx: Object.assign(
        idxStr => (
          idxStr = idxStr.match(literalDifference_oneDirection.parseIdx.re),
          idxStr && +idxStr[1]
        ),
        { re: /(\d+) ?/ }
      ),
      clearToNext(chars, char, idx) {
        chars[char] = chars[char].substring(String(idx).length + 1)
        if (!chars[char]) delete chars[char]
      }
    })
    function firstToLowerCase(str) {
      str = String(str)
      return str.slice(0, 1).toLowerCase()
    }
    function firstNon$_Char(str) {
      str = String(str)
      return str.length === 1 ? str : String(str.match(/[^$_.]/) || '')
    }
    function firstNon$_CharLower(str) {
      str = String(str)
      return firstToLowerCase(firstNon$_Char(str))
    }
    function isFirstNon$_CharLowerEqual(str1, str2) {
      [str1, str2] = [str1, str2].map(String)
      return firstNon$_CharLower(str1) === firstNon$_CharLower(str2)
    }
    function isFCE(str1, str2) {
      [str1, str2] = [str1, str2].map(String)
      return str1[0] === str2[0]
    }
    function strIncludes(str1, str2) {
      [str1, str2] = [str1, str2].map(String)
      if (str1.length < str2.length) [str1, str2] = [str2, str1]
      return str1.toLowerCase().includes(str2.toLowerCase())
    }
    ;
    addEventListener('DOMContentLoaded', () => genDictForAutocomplete(
      'JS-Keywords', `
null
true
false
delete
function*
in
of
instanceof
new
new.target
super
this
typeof
void
yield
yield*
async
await
then
break
class
const
continue
debugger
empty
for
for await ( of ) {\\n}
for ( in ) {\\n}
for ( of ) {\\n}
function
function*
if () {\\n} else {\\n}
if
else
import
import.meta
let
return
switch
throw
try {\\n} catch (e) {\\n}
try
catch
while () {\\n}
while
do {\\n} while ()
do
extends
static
`), { once: true })
      ;
    ;; '/// for users:'
    const shy_setting = new Proxy({
      imgs: { numPerGroup: undefined, lazyLoad: false, concurrency: {}, delta: 1 },
      video: true,
      delay: { query: undefined },
      judgeBlockTime: devMode ? 4 : 4
    }, {
      set(t, k, v) {
        return typeof v === 'object' && v
          ? !Object.entries(v).forEach(([_k, _v]) => this.set(t[k], _k, _v))
          : Reflect.set(...arguments)
      }
    })
    const _test_changeSettingsFor_show = ({ limit = 2 } = {}) => Object.assign(shy_setting, { imgs: { numPerGroup: 1, concurrency: { limit } }, video: false, judgeBlockTime: 10 })
      ;; '/// for pro-users:'
    let noReturn, testMode = false
      ;; '/// for developers:'
    let debug = false
    const _cacheName = 'JAVivid'
    Object.defineProperties(window, {
      _cached: { async get() { return (await caches.open(_cacheName)).keys() } },
      _inspectCached: { async value(pathnameOnly = true) { return (await _cached).map(req => pathnameOnly ? new URL(req.url).pathname : req.url) } },
      _pPerID: { get() { return Math.min(pPerID, shy_setting.imgs.numPerGroup) || pPerID } },
      _delayForQuery: { get() { return shy_setting.delay.query * 1000 || 0 } },
      ...devMode && { ulk: { get() { backupSettings.userProfile.compliance = { inPriva: true, eighteen: true, country: 'en-IL' }; banR18.click(); return banR18._checked ? 'Input again!' : 'Unlocked.' } } }
    })
    const devTold = { '!checkRemoteFetch.doneAt': 0 }
    let inCodeMode, _inCodeMode
    let viewList, awesomeList, favList, likeList, dislikeList, lastID
      , qAutofills, qInput, qCaret
      , pagePos, scrollYOld, stickyOffset
    let orgName, _promptAboutInstallGM, _gP
    const htmlEl = document.documentElement, body = document.body
    addEventListener('message', e => {
      if (e.data.hasOwnProperty('iframeHeight')) {
        errIfr.style.height = `calc(${e.data.iframeHeight}px + 0.5rem)`
        body.style.height = `calc(150vh + 2rem)`
      }
    })
    if (location.protocol.includes('file') && typeof urlSchema === 'undefined') {
      if (/pic|tu/i.test(document.title)) {
        body.insertAdjacentHTML('afterbegin',
          `<div><iframe id='errIfr' src='./HTML components/i-🚨.html'
        style='width:100%; margin:0; border:hidden; border-bottom:2px solid black;'
        onload='this.contentWindow.postMessage("iframeHeight", "*")'></iframe></div>`
        )
        throw 'Failed to import urlSchema module.'
      }
    }
    const videoPlay = {
      quality: {
        pixels: { low: 180, med: 320, high: 400 }
      }
    }
    videoPlay.quality.opts = Object.keys(videoPlay.quality.pixels)
    videoPlay.quality.pref = videoPlay.quality.opts[0]
    const initDarkThemeFS = detectSysTheme() === 'dark'
    const genBackupSettings = () => ({
      lang: { pref: undefined },
      imgs: { delta: undefined },
      delay: { query: undefined },
      videoPrefQuality: { path: 'videoPlay.quality.pref', value: videoPlay.quality.pref },
      videoPrefSrcs: outsideSrc.streamSites.default.map(site => site.domain),
      uiPrefs: { darkThemeFS: initDarkThemeFS, darkThemeTime: Object.assign([], { checked: !initDarkThemeFS }) },
      codeEditor: { dblCol: undefined },
      userProfile: { compliance: {} }
    })
    let backupSettings = genBackupSettings()
    const getPrefSite = (domainName, ut = 'main') => imgsSiteDNs[domainName][ut]
      , switchSites = ({ sortedSites }) => !switchSites.cooldowning && ([imgsSiteDN] = sortedSites)
      , getImgDN = imgSec => (
        imgSec = imgSec.querySelector('img') || imgSec._imgUrl || {},
        imgSec = regex.matchDN(typeof imgSec === 'string' ? imgSec : imgSec.src || imgSec.dataset && imgSec.dataset.src),
        imgSec = imgSec && imgSec.site
      )
    onload()
    const qFormPlus = $id('q-form-plus')
      , qForm = $id('q-form')
      , qBox = $id('search-box')
      , qBtn = $id('btn-search')
      , init_qInputFromUrl = () => qInputFromUrl = paramsFromUrl().filter(v => v.match(idReP))
      , tabGroup = $id('tab-group')
      , banR18 = $id('ban r18')
      , banR18Yes = (yes = true) => banR18.querySelector('i-🔘').checked = yes
      , infiniteScroll = $id('infinite scroll')
      , qSet = new Set()
      , fontSize = parseInt(getComputedStyle(body).fontSize)
      , pageScrollDiff = Math.floor(fontSize * 22 / 3 + 48)
      , inftyScroll = { able: infiniteScroll.querySelector('i-🔘').checked }
      , incrLastID = () => imgPanel.lastElementChild && (
        lastID = imgPanel.lastElementChild.id.match(/(.+?)(\d+)$/),
        lastID && (
          lastID.IDNumLen = lastID[2].length,
          lastID = `${lastID[1]}${(+lastID[2] + shy_setting.imgs.delta).toString().padStart(lastID.IDNumLen, 0)}`
        )
      )
      , typeDots = '<span type-dots translate=no><i-🖨️>...</i-🖨️></span>'
    switchSites.cooldown = (delay = 2000) => {
      if (switchSites.cooldowning) return !'Already cooldowning'
      switchSites.cooldowning = true
      clearTimeout(window.switchSites_cooldown)
      return window.switchSites_cooldown = setTimeout(() =>
        switchSites.cooldowning = false, delay
      )
    }
    switchSites.ifNecessary = imgSec => switchSites.cooldown() && (imgsSiteDN = nextOf(imgs_LTT.domains, getImgDN(imgSec)))
    nav._initialOffsetHeight = nav.offsetHeight
    htmlEl.style.setProperty('--nav-initial-height', `${nav._initialOffsetHeight}px`)
    nav.show = () => nav.classList.replace('hide', 'show')
    let qInputRaw, qInputRawOld, qInputFromUrl, qInputOld = [], qInputNew = qInputOld, qInputUpdated
    let timeStartAt, startedBrowsing
    window.toggleDescHide = function (el) {
      if (!el) return
      const pes = el.previousElementSibling
      if (pes.localName !== 'span' || !pes.querySelector('[cmd]')) return
      el.classList.toggle('hide')
    }
    window.getNES = function (elem) {
      return new Function('return' + thisNESC.replace('.classList', '')).call(elem)
    }
    const thisNESC = '(this.nextElementSibling || this.parentNode.nextElementSibling).classList'
    let lastID_B
    const cmds = window.cmds = {
      time: () => translate`Elapsed time${': '}${parseFloat(parseFloat((Date.now() - timeStartAt) / 60000).toFixed(1))
        || 0} ${'mins'}`,
      fav: () => getLikest('fav'),
      like: () => getLikest('like'),
      roll: () => { setItem('viewHist_B', { lastID_B: lastID }); lastID = undefined },
      rollback: async () =>
        ({ lastID_B } = await getItem('viewHist_B') || {}).lastID && loadImgSec(lastID_B),
      expandAll: () => Array.prototype.forEach.call(imgPanel.children, c => c.setAttribute('open', '')),
      c: async () => navigator.clipboard && navigator.clipboard.writeText($str($list())).then(
        () => [console, _console].forEach(_ => _.log(translate`${'ID collection list'} copied`)),
        () => [console, _console].forEach(_ => _.log(translate`Clipboard write failed`))
      ),
      d: () => download(translate`ID collection list${' ('}${dateToFileName()}${')'}.json`, $str($list())),
      code: () => {
        setTimeout(() => {
          qForm.dispatchEvent(new CustomEvent('submit', { cancelable: true, detail: { eval: '`````` --edit' } }))
          new MutationObserver(function ([m]) {
            try { m.addedNodes[0].querySelector('[contenteditable]').innerText = '\n' }
            catch (e) { }
            finally { this.disconnect() }
          }).observe(_console, { childList: true })
        })
      },
      get cmds() {
        return `<div onclick="(_=>{_=sel.anchorNode.parentNode;_.localName==='span'&&_.hasAttribute('cmd')&&($id('search-box').value=\`:\${_.innerText}\`)&&$id('q-form-plus').cssLock.softLock(5000); sel.type==='Range'?selectWholeText('cmd'):toggleDescHide(getNES(event.target))})()"><span>cmds</span>:<p></p>`
          + Object.keys(this).sort()
            .filter(cmd => !Object.getOwnPropertyDescriptor(this, cmd).get)
            .map(cmd => `
        <span style='cursor:pointer'>•
          <span cmd=${cmd} translate=no\
                onpointerenter='!isTouchDevice&&${thisNESC}.remove("hide");this.removeAttribute("onpointerenter")'>${cmd}
          </span>
        </span>
        <span class=hide style='color:beige'>\
          ${this[cmd]._explain ? `(<span>${this[cmd]._explain}</span>)` : ''}\
        </span>`.trim().replace(/\n* +/g, ' ').replaceAll('> <', '><')
            ).join('\n') +
          `</div>`
      }
    }
    const sameCmds = {
      c: ['copy'],
      cmds: ['cmd', 'help'],
      d: ['download'],
      time: ['t']
    }
    const cmdsExplains = {
      c: 'Copy <span>list<span translate-plural>s</span></span>',
      d: 'Download <span>list<span translate-plural>s</span></span>',
      expandAll: 'Expand <span>all </span><span>image groups</span>',
      fav: 'View <span>favorite-list</span>',
      like: 'View <span>like-list</span>',
      time: 'View <span>the time spent browsing</span>',
      roll: 'Pretend to forget the ID of the last group of images currently loaded',
      rollback: `<span orig-dom-idx=0><span orig-dom-idx=1>The reverse transform </span><span orig-dom-idx=2>of </span><span orig-dom-idx=3>the <span class='code pointer' onclick="flash(this.closest('[info]').querySelector('[cmd=roll]'))">roll</span> command</span></span>`,
      code: 'Code editor'
    }
    Object.entries(sameCmds).forEach(([cmd, sames]) => sames.forEach(same =>
      Object.defineProperty(cmds, same, { get: function () { return this[cmd] } })
    ))
    Object.keys(cmdsExplains).forEach((cmd) => cmds[cmd]._explain = cmdsExplains[cmd])
    const getLikest = async (whichList) => {
      !whichList.endsWith('List') && (whichList = whichList + 'List')
      whichList = whichList === 'likeList' ? ['likeList'] : ['awesomeList', 'favList']
      const viewHist = await getItem('viewHist')
      whichList.forEach(list => {
        _console._options.setOnce('translate')
        _console.log(`<span>${list}</span>:<br>` + (
          viewHist && viewHist[list].length
            ? viewHist[list].join('\n')
            : list === 'awesomeList'
              ? '(<span>Double-click </span><span translate-hide>the </span><span q=l>"</span>Fav<span q=r>" </span><span>button </span><span>to </span><span>add IDs to this list</span>)'
              : `(<span>None</span>. <span>You <span translate-with="yet">haven't </span><span>clicked on </span>any </span><span q=l>"</span>${list.charAt(0).toUpperCase() + list.substring(1).replace('List', '')}<span q=r>" </span><span>button </span><span translate-hide>yet</span>)`
        ))
      })
    }
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const theme = htmlEl.dataset.theme = e.matches ? 'dark' : 'light'
      syncThemeToOtherElems()
      darkTheme.querySelector('i-🔘').checked = theme === 'dark'
    })
    async function onload() {
      document.head.prepend(Object.assign(document.createElement('title'), { innerText: 'JAVivid' }))
      orgName = `https://github.com/${document.title}`
      let resignedName = 'https://github.com/JAVivif'
      aboutLink.href = `${resignedName}/${document.title}`
      if (!_langs.chosen.startsWith('en')) {
        await translate('.')
        if (isFirefoxMobile) {
          document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
            shyBtn.innerText === 'Shy' && switchLangOfWholePage('', true)
          }, CSSRelaxTime))
        }
      }
      setTimeout(() => observerFor_switchLang.observeAll())
      if (devMode) {
        console.info('devMode:', devMode)
        devInstrs.includes('ulk') && setIntervalTillTrue(function Ulk() { return ulk.startsWith('U') })
      }
      if (!location.protocol.startsWith('file')) {
        if (!window._isBundled) {
          Object.assign(window, await import('./ID-rules/~trunking.js'))
          if (!swNotNeeded) {
            import('/sw.js')
            const sw = navigator.serviceWorker
            await new Promise(r => sw.controller ? r() : sw.addEventListener('controllerchange', r))
          }
          else {
            setTimeout(() => {
              document.title = translate(document.title)
              doItTimes(() => switchLang(document.getElementById('setting')?.shadowRoot.querySelector('dl.visible:nth-child(2) > header:nth-child(1)'), true))
            })
          }
        }
      }
      Object.defineProperty(genImgUrls, 'pref', {
        get() { return imgSiteRandom || getPrefSite(imgsSiteDN) }
      })
      initImgVidUrlsLTT()
      imgs_LTT.decision = switchSites
      qAutofills = await getItem('qAutofills')
      if (qAutofills && qAutofills.constructor === Object) {
        ({ qInput, qCaret } = qAutofills)
        qBox.value = qInput || qBox.value || ''
        qBox.selectionStart = qBox.selectionEnd = qCaret
      }
      if (!qBox.value) {
        qBox.value = init_qInputFromUrl().join(' ')
        qBox.style.cssText += 'font-style: oblique'
      }
      pagePos = await getItem('pagePos')
      if (pagePos) {
        ({ scrollYOld, stickyOffset } = pagePos)
        stickyOffset === true && window.scroll(0, scrollYOld + pageScrollDiff)
      }
      if (scrollY > nav._initialOffsetHeight) {
        nav.classList.replace('show', 'hide')
        nav.classListTree.replace('before', 'after', '|', false)
      }
      const menuChecked = Object.entries(JSON.parse(localStorage.getItem('menuChecked') || '{}'))
      menuChecked.forEach(([mode, checked]) => menu.querySelector(`[for='${mode}']`).setAttribute('checked', checked))
      viewList = await getItem('viewHist');
      (
        { awesomeList, favList, likeList, dislikeList, lastID } =
        typeof viewList !== 'function' && viewList || (
          viewList = {
            awesomeList: new Set(), favList: new Set(), likeList: new Set(),
            dislikeList: new Set(), lastID
          }
        )
      )
      self.awesomeList = awesomeList = new Set(awesomeList)
      self.favList = favList = new Set(favList)
      self.likeList = likeList = new Set(likeList)
      self.dislikeList = dislikeList = new Set(dislikeList);
      [codeMode, inftyScroll, qFormPlus].forEach(el => setLock(el))
      if (!localStorage.getItem('ban r18')) {
        localStorage.setItem('ban r18', 'has been set')
        banR18Yes()
      }
      setTimeout(async () => {
        if (menu.querySelector('[for=darkTheme]').checked) htmlEl.dataset.theme = 'dark'
        if (menu.querySelector('[for=codeMode]').checked) _inCodeMode = true
        checkCodeClass()
        if (menu.querySelector('[for=codeMode]').checked && !inCodeMode) {
          _inCodeMode = inCodeMode = true
          checkCodeClass()
        }
        if (dbUnavailable || !Object.keys(backupSettings.userProfile.compliance).length) banR18Yes() && await sleep()
        banR18._checkSubs()
        if (menu.querySelector('[for="infinite scroll"]').checked) inftyScroll.able = true
      }, CSSRelaxTime)
      const notPermittedHostnames = `
    github.io, gitlab.io, glitch.me,
    js.org, eu.org, web.app,
    netlify.(com|app), now.sh | vercel.(com|app),
    herokuapp.com, neocities.org
  `.trim()
      const permittedHostnames = `
    pages.dev, onrender.com, gitee.io, coding.me | coding-pages.com,
    1mb.(co|dev|site), is-great.(net|org) | fast-page.org | html-5.me
  `.trim()
      const notPermittedHostnameMatch = location.hostname.match(urlsStrToRegExp(notPermittedHostnames))
      if (notPermittedHostnameMatch) {
        const info = _console.logWithoutCount(
          translate`
      Please do not host this page on the following domains:${''}
      <li url>${notPermittedHostnames.split(/,\s*/).join('</li><li url>')}</li>${'<br>'}
      If you really want free hosting, it is recommended to find other sites as follows:${''}
      <li url-pm>${permittedHostnames.split(/,\s*/).join('</li><li url-pm>')}</li>
    `.trim()
        )
        info.querySelectorAll('[url]')[notPermittedHostnameMatch.slice(1).findIndex(Boolean)]
          .append(translate` ← This is the current match`)
      }
      setTimeout(() => {
        if (window.CORSViaGM) {
          CORSViaGM.initiated = CORSViaGM.init()
          if (!localStorage.getItem('CORSViaGM-enabled')) {
            localStorage.setItem('CORSViaGM-enabled', Date.now())
            fadeOut(_console.logWithoutCount(translate(CORSViaGM.initiated)))
          }
        }
        else {
          localStorage.removeItem('CORSViaGM-enabled')
          _console._options.setOnce('translate')
          const installationPrompt = _console.logWithoutCount()
          const promptText = '💡 ProTip: You can load "CORS-via-GM" (a userscript used in Tampermonkey) to enable the powerful CORS feature!'
          installationPrompt.querySelector('[close-btn]').remove()
          installationPrompt._info.id = 'installationPromptInfo'
          installationPrompt._info._translate = () =>
            installationPrompt._info.innerHTML = translate(promptText)
              .replace('CORS-via-GM', `<a href=https://greasyfork.org/scripts/465261>$&</a>`)
              .replace('Tampermonkey', `<a href=https://www.tampermonkey.net>$&</a>`)
          installationPrompt._info._translate()
          let count = 0
          _promptAboutInstallGM = (cond = true, preamble) => {
            if (typeof cond === 'string') preamble = cond
            if (cond) {
              if (++count > 2) return
              _console._options.setOnce('translate')
              const tip = _console.logFromTop((preamble ? `<span>${preamble}</span><br-br></br-br>` : '') + '<span translate-merge=@hold>Remember the tips about "<span translate-id=c cors>CORS-via-GM</span>"? This is where it comes in!</span>')
              if (!tip) return
              tip.dataset.dupId = 'NoCORSViaGM'
              setTimeout(() => {
                const cors = tip.querySelector('[cors]')
                cors.classList.add('code', 'button')
                cors.addEventListener('click', () => isInView(installationPrompt, true)
                  ? flash(installationPrompt._info)
                  : (installationPrompt.scrollIntoView(false), whenScrollStop(() => flash(installationPrompt._info)))
                )
              })
            }
          }
        }
      }, CSSRelaxTime * (window._isBundled ? 0.4 : 1))
        ;; '/// for pro-users:'
      setTimeout(async () => { try { eval(await getItem('custom:run-after-loading')) } catch (e) { } })
    }
    window.onbeforeunload = () => !dbUnavailable && (remDarkTheme(), refreshLocalStorage(), rememberPageState())
    function remDarkTheme() {
      localStorage.setItem('theme', htmlEl.dataset.theme || '')
    }
    function refreshLocalStorage() {
      return awesomeList &&
        setItem('viewHist', {
          awesomeList: [...awesomeList],
          favList: [...favList],
          likeList: [...likeList],
          dislikeList: [...dislikeList],
          lastID
        })
    }
    function rememberPageState() {
      if (['all', 'db'].some(v => devInstrs.includes(v))) {
        clearDB()
        localStorage.clear()
        console.log(translate`🗑️ localStorage ${'cleared'}.`)
      }
      else {
        localStorage.setItem('menuChecked', JSON.stringify(Object.fromEntries(
          Reflect.ownKeys(menu.children)
            .filter(v => isNaN(v) && menu.children[v].localName === 'li')
            .map(v => [v, menu.children[v].firstElementChild.checked])
        )))
      }
      setItem('pagePos', {
        scrollYOld: scrollY,
        stickyOffset: nav.classList.contains('after')
      })
    }
    function backupSettingsAfter(delay = 100) {
      clearTimeout(backupSettingsAfter._tid)
      backupSettingsAfter._tid = setTimeout(set_backupSettings, delay)
    }
    function set_backupSettings() {
      return setItem('backupSettings', backupSettings)
    }
    const setupLockAndRelease = (elem, tID_cssLock) => time => (
      elem.cssLocking = true,
      clearTimeout(tID_cssLock),
      tID_cssLock = setTimeout(() => elem.cssLocking = false, Math.max(time || CSSRelaxTime / 5, 200))
    )
    const [lockAndReleaseNav, lockAndReleaseSb] = [nav, _sidebar].map(setupLockAndRelease)
    addEventListener('scroll', navTransition)
    let oldScrollY
    function navTransition() {
      if (nav.cssLocking || _gP && _gP.isShow) {
        oldScrollY = scrollY
        return
      }
      lockAndReleaseNav(100)
      if (scrollY > oldScrollY) {
        if (scrollY > nav._initialOffsetHeight && !qForm.classList.contains('focus')) {
          nav.classList.replace('show', 'hide')
          if (nav.classList.contains('before')) {
            nav.classListTree.replace('before', 'after')
            nav.classList.add('from-top')
            setTimeout(() => nav.classList.remove('from-top'))
          }
        }
        else if (fontSize * 7 < scrollY && scrollY < nav._initialOffsetHeight
          && qForm.classList.contains('focus')) {
          nav.classListTree.replace('before', 'after')
          qForm.classListTree.replace('after', 'before')
          if (!_inCodeMode) {
            qBox.blur()
            nav.classList.replace('show', 'hide')
          }
        }
      }
      else {
        const inActiveCode = /code.*editable/.test(document.activeElement.className)
        if (scrollY > nav._initialOffsetHeight) {
          if (nav.classList.contains('before')) {
            nav.classListTree.replace('before', 'after')
          }
        }
        else {
          if (!nav.classList.contains('show') && nav.classList.contains('after')) {
            nav.classListTree.replace('after', 'before')
            qForm.classListTree.replace('before', 'after')
          }
        }
        if (qForm.className.includes('before focus')
          || inActiveCode && scrollY <= nav._initialOffsetHeight
        ) qForm.classListTree.replace('after', 'before')
        if (scrollY < fontSize * 7) {
          nav.classListTree.replace('after', 'before')
          qBtn.alignHeightWithBox()
        }
        if (!inActiveCode || scrollY <= nav._initialOffsetHeight)
          nav.show()
      }
      oldScrollY = scrollY
    }
    addEventListener('click', redirectInNewTab)
    body.addEventListener('click', e => {
      if (menuKey.contains(e.target) && sel.type !== 'Caret') sel.empty()
      if (e.timeStamp - _sidebar.justHide < 300)
        return (e.stopImmediatePropagation(), e.preventDefault())
      if (['li'].includes(e.target.localName) && !_console.contains(e.target))
        return drawRipple(e)
    }, true)
    const mergeTouchAndMouse = cb => e_d => cb(whenFingerDown(e_d))
    isTouchDevice
      ?
      body.addEventListener('touchstart', mergeTouchAndMouse(e_d => {
        body.addEventListener('touchend', ...whenFingerUp(e_d))
      }))
      :
      body.addEventListener('pointerdown', mergeTouchAndMouse(e_d => {
        body.addEventListener('pointerup', ...whenFingerUp(e_d))
        body.addEventListener('pointerleave', ...whenFingerLeave(e_d))
      }))
    const whenFingerUpMust = e_p => !(_console.contains(e_p.target) && selInDocIng())
    const whenFingerDown = e_d => (body._finger_done = false, _sidebar.tarry = _sidebar.classList.contains('show'), e_d)
    const whenFingerUp = e_d => [e_p => (body._finger_done = 1, whenFingerUpMust(e_p) && _sidebar.showOrHide(e_d, e_p)), once]
    const whenFingerLeave = e_d => [e_p => !body._finger_done && whenFingerUpMust(e_p) && _sidebar.showOrHide(e_d, e_p), once]
    const once = { once: true }
    async function calcImgLoading({ updateProBar = true, evtSrc } = {}) {
      if (evtSrc) {
        const { img, imgSec } = evtSrc
        const { _imgsCanceledCount = 0 } = imgSec
        imgLoading -= _imgsCanceledCount + (!await isImgPlac(img) ? 1 : _pPerID - imgSec.querySelectorAll('img:not([data-src])').length)
        imgToLoad -= _imgsCanceledCount + (imgSec.hasAttribute('data-not-found') ? _pPerID : 0)
      }
      if (isNaN(imgLoading) || imgLoading < 0) (console.log('Strangely!', imgLoading), imgLoading = 0)
      if (!imgLoading) imgToLoad = 0
      if (updateProBar) proBar.set(100 * ((imgToLoad - imgLoading) / imgToLoad || 1))
      return imgLoading
    }
    function recalcImgLoading(imgSec) {
      if (!imgSec || !imgSec.querySelector('img[data-src]')) return
      imgLoading -= imgSec.querySelectorAll('img[data-src]').length
      imgToLoad -= _pPerID
      calcImgLoading()
    }
    customElements.whenDefined('i-🍫').then(() => setInterval(() => {
      {
        if (!concurrency.current && !'0%100%'.includes(proBar.dataset.progress)
          || !calcImgLoading({ updateProBar: false })
          && (imgToLoad
            || proBar.queue.length
            && +proBar.queue[proBar.queue.length - 1].num !== 100
            && !proBar.dataset.inProgress)
        ) {
          proBar.queue.length = imgLoading = imgToLoad = 0
          proBar.set(100)
        }
      }
      {
        const { ongoing } = iLoadStat()
        let hinderedImg
        if (([hinderedImg] = ongoing) && hinderedImg
          && (hinderedImg = $id(hinderedImg))
          && hinderedImg.querySelector('i-ꔹ')
        ) {
          loadImgSec.reload(hinderedImg)
        }
        throttledFetching_queue.next()
      }
    }, 10000))
    nav.addEventListener('dblclick', e => {
      if (e.target !== e.currentTarget &&
        e.target.parentNode !== e.currentTarget) return
      window.scroll(0, 0)
    })
    nav.addEventListener('click', e => {
      if (_sidebar.contains(e.target)) return
      if (_sidebar.tarry) {
        e.stopPropagation()
        e.preventDefault()
        return
      }
    }, true)
    new IntersectionObserver(([{ intersectionRect: { height } }]) => {
      if (typeof nav === 'undefined') return
      if (height < fontSize * 5) height = fontSize
      if (height < nav._initialOffsetHeight / 2) height -= fontSize / 6
      globalStyle.set('--nav-visible-height', `${height}px`)
    }, { threshold: [...Array(21).keys()].map(v => v / 20) }).observe(nav)
    menuKey.addEventListener('pointerdown', () => {
      menuKey.className === 'before' ? _sidebar.show() : _sidebar.hide()
    })
    _sidebar.addEventListener('focusout', e => {
      if (nav.cssLocking || _sidebar.cssLocking || typeof setting !== 'undefined' && setting.classList.contains('show') || _sidebar.tarry) return
      if (_sidebar.contains(e.target)) return _sidebar.focus()
      _sidebar.hide()
      _sidebar.justHide = e.timeStamp
    })
    new MutationObserver(([m]) => {
      m.target.classList.contains('hide')
        ? (
          menuKey.classListTree.replace('after', 'before'),
          globalOverlay.classList.replace('fadein', 'fadeout'),
          nav.classList.remove('shadow')
        )
        : (
          globalOverlay.classList.replace('fadeout', 'fadein'),
          nav.classList.add('shadow')
        )
    }).observe(_sidebar, { attributeFilter: ['class'] })
    _sidebar.getFocus = () => {
      if (_sidebar.classList.contains('show')) return
      _sidebar.classList.replace('hide', 'show')
      _sidebar.focus()
      setTimeout(() => selInDocIng() && sel.collapseToEnd())
    }
    _sidebar.show = () => {
      lockAndReleaseSb()
      _sidebar.getFocus()
      menuKey.classListTree.replace('before', 'after')
      inftyScroll.lock && inftyScroll.lock()
    }
    _sidebar.hide = () => {
      lockAndReleaseSb()
      if (window.setting && setting.classList.contains('show')) {
        body.style = ''
        menuKey.classList.remove('force-show')
        setting.classList.remove('show')
        setting.addEventListener('transitionend', () => !setting.classList.contains('show') && _sidebar.removeAttribute('setting-show'), { once: true })
      }
      inftyScroll.unlock && inftyScroll.unlock()
      setTimeout(() => _sidebar.tarry = false)
      _sidebar.classList.replace('show', 'hide')
    }
    _sidebar.sOH_activatable = {
      show: { textarea: false, input: false, 'i-🎞️': false, table: false, tbody: false, tr: false, th: false, td: false, },
      hide: { input: true, 'i-🍞': false }
    }
    _sidebar.checkSOH = (sOH, el) => _sidebar.sOH_activatable[sOH][el.target.localName] !== false
    _sidebar.showOrHide = (e_d, e_p) => {
      if (
        _sidebar.cssLocking
        || codeMode.cssLock && codeMode.cssLock.locking
        || sel.type === 'Range'
        || typeof setting === 'undefined'
        || setting.classList.contains('show') && !menuKey.contains(e_d.target)
        || e_d.target.hasAttribute('contentEditable')
        || _console.contains(e_d.target) && (
          e_d.target.closest('.monaco-editor') ||
          document.activeElement.contains(e_d.target) ||
          isScrollableOverflow(e_d.target) ||
          isScrollableOverflow(e_d.target.closest('[info]'))
        )
      ) return
      if (e_d.type.startsWith('touch') && e_d.changedTouches[0])
        [e_d, e_p].forEach(e_ => Object.assign(
          e_, ((x, y) => ({ clientX: x, clientY: y } = e_.changedTouches[0], { x, y }))()
        ))
      if (Math.abs(e_d.y - e_p.y) > 2 * fontSize || Math.abs(e_d.y - e_p.y) / Math.abs(e_d.x - e_p.x) > 0.666) return
      if (e_d.x - e_p.x >= 0 && _sidebar.checkSOH('hide', e_d)) {
        if (!_sidebar.contains(e_d.target)) _sidebar.hide()
        else
          !(Array.prototype.some.call(menu.children, el => el === e_d.target) || aboutLink === e_d.target)
            && e_d.x - e_p.x > 3 * fontSize
            && _sidebar.hide()
      }
      else if (e_p.x - e_d.x > 3 * fontSize && _sidebar.checkSOH('show', e_d)
        && !e_d.target.hasAttribute('dont-touch-sidebar')) {
        _sidebar.show()
        _sidebar.getFocus()
      }
    }
    darkTheme.addEventListener('click', function () {
      this.querySelector('i-🔘').click()
      backupSettings.uiPrefs.darkThemeTime.disabled = true
    })
    darkTheme.addEventListener('check', function (e) {
      const { checked } = e.detail
      const now = checked ? 'dark' : 'light'
      switchTheme(now, { isManual: true })
      if (now !== this.dataset.now)
        [this.dataset.alt, this.dataset.now] = [this.dataset.now, this.dataset.alt]
    })
    function switchTheme(to, { isManual } = {}) {
      htmlEl.dataset.theme = to
      !isManual && syncBtnToTheme(to)
      syncThemeToOtherElems()
      return to
    }
    function syncBtnToTheme(to) {
      if (typeof to !== 'string') to = 'dark'
      body.querySelector('i-🔘[for=darkTheme]').checked = htmlEl.dataset.theme === to
    }
    function syncThemeToOtherElems() {
      if (!isFirefox) return
      [setting, _gP].forEach(el => el && (el.dataset.theme = htmlEl.dataset.theme))
    }
    new MutationObserver(syncBtnToTheme).observe(htmlEl, { attributeFilter: ['data-theme'] })
    codeMode.addEventListener('click', function () {
      this.querySelector('i-🔘').click()
    })
    codeMode.addEventListener('check', function () {
      _inCodeMode = this.querySelector('i-🔘').checked
      checkCodeClass(0)
    })
    codeMode.addEventListener('contextmenu', function () {
      msg('[Shortcut key] <kbd>Alt</kbd> + <kbd>C</kbd>', 'codeMode')
      this.cssLock.softLock(0)
    })
    banR18.addEventListener('click', e => {
      const { compliance } = backupSettings.userProfile
      const { inPriva, eighteen, country } = compliance
      const isIllegal = banR18._isIllegalIn(country)
      const len = Object.keys(compliance).length
      if (len && inPriva && eighteen && !isIllegal) {
        banR18._btn.removeAttribute('disabled')
        banR18._checkSubs()
        delete banR18._isRechecking
        return
      }
      e.stopImmediatePropagation()
      if (banR18._isRechecking) {
        delete banR18._isRechecking
        banR18Yes()
        return
      }
      const reasonsForRejection = [];
      [
        [inPriva, 'you are not in a private environment'],
        [eighteen, 'you are under eighteen years old'],
        [country === undefined ? country : !isIllegal, 'your local regulations prohibits R18']
      ]
        .forEach(([k, r]) => k !== undefined && !k && reasonsForRejection.push(r))
      if (reasonsForRejection.length) {
        msg('<span>Sorry</span>,' + (reasonsForRejection.length > 1 ? '<br>' : ' ') + '<span>' + reasonsForRejection.join('</span>,<br>and <span>') + '</span>')
        banR18._btn.setAttribute('disabled', '')
        banR18._checked = true
        return
      }
      if (len < 3) {
        clickOut('userProfile', 'compliance')
        setTimeout(() => {
          msg(len ? 'Please fill in completely' : 'Please fill in to determine whether the R18 mode can be lifted')
          if (len) {
            const compliancePage = $id(setting, 'compliance')._dl
            'inPriva, eighteen, country'.split(', ').forEach(key => {
              if (compliance.hasOwnProperty(key)) return
              const el = compliancePage.querySelector(`[key=${key}]`)
              restartAnimation(el, 'outline-blink', { sideClass: 'reset outline' })
              el.addEventListener('change', () => el.classList.remove('outline'), { once: true })
            })
          }
          menuKey.addEventListener('click', () => {
            banR18._isRechecking = true
            banR18.click()
          }, { once: true })
        }, SliMen.cssDelay.animationDuration * 2)
      }
    });
    [banR18, infiniteScroll].forEach(el => {
      el.addEventListener('click', function () {
        this.querySelector('i-🔘').click()
      })
      el.addEventListener('check', function () {
        inftyScroll.able = this.querySelector('i-🔘').checked
      })
    })
    banR18._subs = banR18.closest('ul').querySelectorAll(`ul>li[as-sub=${banR18.getAttribute('has-sub')}]`)
    banR18._subs.forEach(li => li.style.setProperty('--height', `${li.scrollHeight}px`))
    banR18._checkSubs = function () {
      if (banR18._btn.hasAttribute('disabled')) return
      const hide = (this._checked = this.querySelector('i-🔘').checked) ? 'add' : 'remove'
      this._subs.forEach(li => li.classList[hide]('hide'))
    }
    banR18._btn = banR18.querySelector('i-🔘')
    banR18._illegalInCountryNames = new Set(['zh-CN', 'ko-KR', 'en-SG', 'en-VN', 'en-PH', 'th-TH'])
    banR18._isIllegalIn = countryName => !countryName || banR18._illegalInCountryNames.has(countryName)
    const modulesReady = Promise.all(
      ['i-🎿', 'i-🔘', 'i-🍞', 'i-〽️']
        .map(module => customElements.whenDefined(module))
    );
    [syncBtnToTheme].forEach(v => modulesReady.then(v))
    modulesReady.then(async () => {
      const prevSettings = await getItem('backupSettings')
      prevSettings && !dbUnavailable && Object.assign(backupSettings, prevSettings)
      const setting = new SliMen({
        title: 'Settings',
        isTop: true,
        list: [
          {
            icon: '🌐',
            term: 'Languages',
            id: 'lang',
            list: window._langs,
            listFlavor: 'choose',
            filter: el => el.localName === 'dt',
            props: { listContainer: { _checkmark: new CheckMark() } },
            init({ listContainer }) {
              listContainer.setAttribute('translate', 'no')
              const prevPrefLang = backupSettings.lang.pref
              if (prevPrefLang && !location.search.includes('lang=')) {
                console.info(`User lang preferred: ${prevPrefLang}`)
                _langs.chosen = prevPrefLang
              }
              if (!isLangEn(_langs.chosen)) {
                switchLang(document.head)
                switchLangOfWholePage(prevPrefLang, true)
              }
              const chosenLangEl = Array.prototype.find.call(
                listContainer.children,
                elem => elem.getAttribute('lang') === _langs.chosen
              )
              if (!chosenLangEl) return
              chosenLangEl.dispatchEvent(new CustomEvent('choose', { composed: true }))
            },
            async listenToDesc(e) {
              const T = e.target
              if (T.localName !== 'dt') return
              const spin = new Spi(T.clientHeight / 3)
              spin.style.left = 'calc(var(--dl-padding-side) + 0.25ch)'
              T.querySelector('i-〽️').classList.add('hide')
              T.insertAdjacentElement('afterbegin', spin)
              const toLang = backupSettings.lang.pref = langAttr(T.dataItem)
              const tick = chmk => { spin.remove(); (chmk = T.querySelector('i-〽️')) && chmk.classList.remove('hide') }
              isChromeMobile && setTimeout(tick, CSSRelaxTime)
              await switchLangOfWholePage(toLang)
              window.installationPromptInfo && window.installationPromptInfo._translate()
              body.querySelectorAll(`[lang]:not([lang|=${toLang}])`).forEach(el => switchLang(el))
              tick()
              backupSettingsAfter()
            },
            preload: true,
            wrapWithSpan: false
          },
          {
            icon: '⌨',
            term: 'Code Editor Area',
            id: 'Code_Editor_Area',
            list: [{
              term: 'Double column',
              indicator: new SBtn(backupSettings.codeEditor.dblCol, { fuse: false }),
              props: { dt: { _bakId: 'dblCol' } },
              list: true,
              init({ dt }) {
                _console.classList[dt.indicator.checked ? 'add' : 'remove']('dbl-col')
              },
              listener(e) {
                if (e.target.localName !== 'i-🔘') return
                _console.classList[e.target.checked ? 'add' : 'remove']('dbl-col')
              },
              preload: true
            }],
            listenToDesc(e) {
              const T = e.target
              if (T.localName === 'i-🔘') {
                const dt = T.closest('dt')
                if (dt._bakId) backupSettings.codeEditor[dt._bakId] = dt.indicator.checked
              }
              backupSettingsAfter()
            },
            preload: true
          },
          {
            icon: '🎞️',
            term: 'Display Control',
            list: [
              {
                term: 'Loading of images',
                list: [
                  {
                    term: '<span style=font-style:oblique>Δ</span> <input placeholder=-1 class="two-digits code-font"></input>',
                    def: 'The increment/decrement value of the serial number when the next one is automatically loaded when scrolling to the bottom',
                    listener: hearInputNum('imgs.delta')
                  }
                ]
              },
              {
                term: 'Video Play',
                list: [
                  {
                    term: `Default Quality
                  ${isFirefox ? '<div replace-select-arrow>' : ''}
                  <select id=videoPrefQuality ${isFirefox ? 'replace-select-arrow' : ''}>
                    ${Object.entries(videoPlay.quality.pixels).map(([ql, px]) => `
                    <option value=${ql}>${px}p</option>`)}
                  </select>
                  ${isFirefox ? '</div>' : ''}
                `,
                    def: '(only for the trailer)',
                    listener: e => {
                      if (e.target.localName !== 'option') return
                      backupSettings.videoPrefQuality.value = videoPlay.quality.pref = e.target.value
                      backupSettingsAfter()
                    }
                  }
                ]
              },
              {
                term: 'Query',
                list: [
                  {
                    term: '<span>Seconds to wait before querying</span> <input placeholder=5 class="two-digits code-font"></input>',
                    def: 'How many seconds after the image is loaded to start getting video information and resources?',
                    listener: hearInputNum('delay.query')
                  },
                  {
                    term: 'Selection of online streaming resource sites',
                    list: [
                      {
                        term: `<div><p sml>(<span>Maximum of 5 selections, more than that will be decided in top-to-bottom order only</span>)</p>
                          ${outsideSrc.streamSites.map(site => `<label><input type=checkbox value=${site.domain}>&nbsp;&nbsp;${site.name}</label>`).join('<br>')}</div>`,
                        listener: [
                          ['change', function () {
                            backupSettings.videoPrefSrcs = [...this.querySelectorAll('input')].filter(_ => _.checked).slice(0, 5).map(_ => _.value)
                            outsideSrc.vid = outsideSrc.vid.filter(({ type }) => type === 'BT').concat(outsideSrc.streamSites.filter(({ domain }) => backupSettings.videoPrefSrcs.includes(domain)))
                            backupSettingsAfter()
                          }],
                          ['generate', function () {
                            this.querySelectorAll('input').forEach(_ => _.checked = backupSettings.videoPrefSrcs.includes(_.value))
                            this.dispatchEvent(new Event('change'))
                          }]
                        ]
                      }
                    ],
                    style: { listContainer: 'padding-top: unset' },
                    preload: true
                  },
                ],
                style: { listContainer: 'no-dividing-line' }
              }
            ],
            listFlavor: 'flat',
            preload: true
          },
          {
            icon: '👁️‍🗨️',
            term: 'UI',
            id: 'ui',
            list: [
              {
                term: 'Auto Dark Theme',
                list: [
                  {
                    term: 'follow the system',
                    id: 'darkFS',
                    indicator: new SBtn(backupSettings.uiPrefs.darkThemeFS, { fuse: false, for: 'darkFS' }),
                    listener: [
                      'check',
                      function () {
                        toggleOtherBtn(this, 'dark')
                        const isChecked = this.indicator.checked
                        if (isChecked) {
                          localStorage.removeItem('theme')
                          switchTheme(detectSysTheme())
                        }
                        backupSettings.uiPrefs.darkThemeFS = isChecked
                        backupSettingsAfter()
                      }
                    ]
                  },
                  {
                    term: 'start periodically',
                    id: 'darkOnTime',
                    indicator: new SBtn(backupSettings.uiPrefs.darkThemeTime.checked, { fuse: false, for: 'darkOnTime' }),
                    def: (() => {
                      let idx = 0
                      const inp = p => `<input idx=${idx++} placeholder=${String(p).padStart(2, 0)} style='width:2ch'></input>`
                      return `
              <span>
                Start on<span> </span><code>${inp(17)}:${inp(0)}</code><span>,</span>
                end on<span> </span><code>${inp(7)}:${inp(0)}</code>
              </span>`
                    })(),
                    listener: [
                      'check',
                      e => {
                        const dt = e.currentTarget, isChecked = dt.indicator.checked
                        toggleOtherBtn(dt, 'dark')
                        css_collapseOrExpand(dt.dd, {
                          [`force${isChecked ? 'Expand' : 'Collapse'}`]: true
                        })
                        backupSettings.uiPrefs.darkThemeTime.checked = isChecked
                        isChecked && delete backupSettings.uiPrefs.darkThemeTime.disabled
                        checkRangeSetDark(dt.dd)
                      }
                    ],
                    listenToDesc: [
                      ['change',
                        e => {
                          let v = e.target.value
                          if (v !== '') {
                            let isHour = !(+e.target.getAttribute('idx') % 2)
                            v = Math.round(v)
                            v = v > (isHour ? 24 : 60) ? (isHour ? 23 : 59) : v < 0 ? 0 : v
                            v = e.target.value = String(v).padStart(2, 0)
                          }
                          backupSettings.uiPrefs.darkThemeTime[e.target.getAttribute('idx')] = v
                          delete backupSettings.uiPrefs.darkThemeTime.disabled
                          checkRangeSetDark(e.target.closest('dd'))
                        }
                      ],
                      ['create',
                        e => {
                          const { dt, dd } = e.detail
                          const dTime = backupSettings.uiPrefs.darkThemeTime
                          if (!Array.isArray(dTime)) return backupSettings.uiPrefs.darkThemeTime = []
                          const isChecked = dt.indicator.checked = backupSettings.uiPrefs.darkThemeTime.checked
                          dd.querySelectorAll('input')
                            .forEach((input, i) => dTime[i] && (input.value = dTime[i]))
                          setTimeout(() => checkRangeSetDark(dd))
                          css_collapseOrExpand(dd, { [`force${isChecked ? 'Expand' : 'Collapse'}`]: true })
                        }
                      ]
                    ],
                    listFlavor: 'flex'
                  }]
              }
            ],
            listFlavor: 'flat',
            preload: true
          },
          {
            icon: '🛡️',
            term: 'User Profile',
            id: 'userProfile',
            list: [
              {
                term: 'Compliance Check',
                id: 'compliance',
                list: [
                  {
                    term: ['Your country or region', await genCountrySelect()],
                    attrs: 'key=country'
                  }, {
                    term: '<label flex>You are over 18 years old<input type=checkbox>',
                    attrs: 'key=eighteen'
                  }, {
                    term: '<label flex>Now in a private place<input type=checkbox>',
                    attrs: 'key=inPriva'
                  }
                ],
                listenToDesc: [
                  ['change', ({ target }) => {
                    let value
                    switch (target.localName) {
                      case 'input': value = target.checked; break
                      case 'select': ({ value } = target.selectedOptions[0]); break
                    }
                    backupSettings.userProfile.compliance[target.closest('dt').getAttribute('key')] = value
                    backupSettingsAfter()
                  }],
                  ['generate', ({ detail: { listContainer } }) => {
                    const val = () => backupSettings.userProfile.compliance[dt.getAttribute('key')]
                    let dt, T
                    listContainer.querySelectorAll('dt').forEach(_dt => {
                      dt = _dt;
                      [['input[type=checkbox]', 'checked'], ['select', 'value']].find(([s, k]) => {
                        T = dt.querySelector(s)
                        if (!T) return
                        const v = val()
                        if (v) T[k] = v
                        return true
                      })
                    })
                  }]
                ],
              }
            ],
            style: { listContainer: 'no-dividing-line' },
          },
          {
            icon: '🛠',
            term: 'Other Settings',
            list: [
              {
                term: 'Clear app offline cache <i-🍛 class=shadow>Clear</i-🍛>',
                def: 'To force an update to a new version that may exist',
                attrs: 'data-act=clear-offline'
              },
              {
                term: 'Reset app settings <i-🍛 class=shadow>Reset</i-🍛>',
                attrs: 'data-act=reset'
              }
            ],
            listenToDesc({ target }) {
              if (target.localName !== 'i-🍛') return
              switch (target.closest('dt').dataset.act) {
                case 'clear-offline':
                  if (window.clearCaches) {
                    clearCaches()
                    msg('Caches removed')
                  } break
                case 'reset':
                  backupSettings = genBackupSettings()
                  backupSettingsAfter()
              }
              target.classList.add('disable')
            },
            addDividingLine: true
          },
          {
            icon: '🐻',
            term: 'Useless Legacy Features',
            offIf: 0 && !isTouchDevice,
            list: [{
              term: '<span><span>Use </span><span>Persistent Storage</span></span>',
              indicator: new SBtn(
                navigator.storage && navigator.storage.persist && navigator.storage.persisted(),
                { fuse: false }
              ),
              desc: removeBlankInHTML(`
<span>
  <span data-brief-desc><span>❔ </span>See why this option exists and how to revoke the selection</span>
  <span data-full-desc><br>
    <ul less-indent>
      <li><b><span>Why</span>:</b><br>
        <span>
          Browsers on mobile devices <span translate-hint="exist">have </span>
          <span orig-dom-idx=0 tran-dom-idx=0>
            <span orig-dom-idx=1 tran-dom-idx=2>
              <span orig-dom-idx=0>
                <span orig-dom-idx=1>the <span>bug</span></span>
                <span orig-dom-idx=2> of </span>
                <span orig-dom-idx=3>losing the latest or even all the <i>in-browser storage</i> </span>
              </span>
            </span>
            <span orig-dom-idx=2 tran-dom-idx=1>
              <span orig-dom-idx=0>
                <span orig-dom-idx=1>after </span>
                <span orig-dom-idx=2>exiting</span>
              </span>
            </span>
          </span><span>. </span>
        </span>
        <span>
          <span>So </span>
          <span orig-dom-idx=0>
            <span orig-dom-idx=1><span>the </span><b>Persistent Storage</b> permission </span>
            <span orig-dom-idx=2>needs to be tried to be used</span>
          </span><span>. </span>
        </span>
      </li>
      <br><br>
      <li hint-of-method><b><span hint><span>How </span><span>to</span> revoke</span>:</b><br>
        <ul less-indent>
          <li>
            <span>For</span> <span>Firefox</span><span>: </span>
            <span>Click </span><span>the </span>
            <span orig-dom-idx=0>
              <span orig-dom-idx=1>file <span></span>icon </span>
              <span orig-dom-idx=2>in </span>
              <span orig-dom-idx=3>the <span>address bar </span><span>menu</span></span>
            </span><span>, </span>
            <span>then </span><span>click </span>"<b>Clear Cookies and Site Data</b>"
            <span> (Rather than just clear "Permissions")</span>.
          </li>
          <li>
            <span>For</span> <span>Chrome</span><span>: </span>
            <span>Go to </span><span> </span>
            <b>Settings</b> › <span>Advanced</span> › <b>Reset and clean up</b> › <span>Restore settings to their original defaults</span>.
          </li>
        </ul>
        <p>And then you may need to reload the page for changes to apply.</p>
      </li>
    </ul>
  </span>
</span>`),
              listener(e) {
                if (e.target.localName !== 'i-🔘') return
                const dt = e.currentTarget
                let userRefuse
                if (isChrome) {
                  if (userRefuse = !confirm(translate(
                    'Warning to Chrome users: After this option is turned on, if you want to turn it off, you will ' +
                    'need to reset the browser (Caveat: It will cause the login status of all other websites to be cleared!!), ' +
                    'are you sure to continue?'
                  ))) return e.preventDefault()
                }
                requestPersistentStorage(granted => {
                  dt.indicator.checked = granted
                  !granted && msg('Permission denied' + (
                    isChrome ? (userRefuse ? '' : ' by the browser') : ''
                  ))
                  if (dt.indicator.checked) {
                    const dd = dt.nextElementSibling
                      , [fullDesc, hint, hintMethod] = ['data-full-desc', 'hint', 'hint-of-method'].map(v => dd.querySelector(`[${v}]`))
                    css_collapseOrExpand(fullDesc, { forceExpand: true })
                    restartAnimation(hintMethod, 'outline-blink', { sideClass: 'reset outline' })
                    restartAnimation(hint, 'underline-blink', { sideClass: 'reset underline' })
                    return
                  }
                })
              }
            }]
          }
        ],
        style: { listContainer: 'no-dividing-line; dd-h1' }
      })
      function hearInputNum(keysPath) {
        return [
          ['generate', ({ detail: { dt } }) => {
            const input = dt.querySelector('input')
            const [s, i] = [`shy_setting.${keysPath} = backupSettings.${keysPath}`, `dt.querySelector('input')`]
            eval(eval(`backupSettings.${keysPath}`) !== undefined ? `${i}.value = ${s}` : `${s} = +${i}.placeholder`)
            if (input.placeholder === input.value) input.value = ''
          }],
          ['change', e => {
            const v = +(e.target.value || e.target.getAttribute('placeholder'));
            [backupSettings, shy_setting].forEach(_ => eval(`_.${keysPath} = v`))
            backupSettingsAfter()
          }]
        ]
      }
      function toggleOtherBtn(fromElem, idStartStr, toggleCheckTo = false, ignoreOff = true) {
        if (fromElem.localName !== 'dt' || fromElem.parentNode._eaching || ignoreOff && !fromElem.indicator.checked) return
        fromElem.parentNode._eaching = true
        fromElem.parentNode.querySelectorAll(`[id^=${idStartStr}]`).forEach(dt => dt !== fromElem &&
          dt.dispatchEvent(new CustomEvent('check', {
            detail: {
              toggleByOtherBtn: true, checked: dt.indicator.checked = toggleCheckTo
            }
          })))
        delete fromElem.parentNode._eaching
      }
      function checkRangeSetDark(dd) {
        if (backupSettings.uiPrefs.darkThemeTime.disabled || !dd.dt.indicator.checked) return backupSettingsAfter()
        setTimeout(() => console.log(translate(['Timed dark theme ', 'applied', '. ', '(', `${document.documentElement.dataset.theme} theme`, ')'])))
        const rangeSet = [...dd.querySelectorAll('code')].map(v =>
          [...v.querySelectorAll('input')].map(v => v.value || v.placeholder).join(':'))
        if (rangeSet[0] >= rangeSet[1]) rangeSet.overnight = true
        switchTheme(isHHMMInRange(rangeSet) ? 'dark' : 'light')
        backupSettingsAfter()
      }
      setting.id = 'setting'
      switchLang(setting)
      observerFor_switchLang.addObserve(setting.shadowRoot)
      setting.style.setProperty('--sym-x', 'none')
      gear.addEventListener('click', e => {
        if (e.target !== gear) return
        _sidebar.show()
        setting.classList.toggle('show')
        _sidebar.setAttribute('setting-show', '')
        globalOverlay.classList.replace('fadein', 'fadeout')
        body.style.overflow = 'hidden'
        nav.classList.contains('before') &&
          globalStyle.set('--nav-visible-height',
            `${globalStyle.get('--nav-initial-height', true) - scrollY}px`
          )
        menuKey.classList.add('force-show')
        removeEventListener('keydown', keydownClose)
        addEventListener('keydown', keydownClose)
      })
      const keydownClose = ({ key }) => {
        if (!(key === 'Escape' && menuKey.classList.contains('after'))) return
        _sidebar.hide()
        setTimeout(() => menuKey.click())
        removeEventListener('keydown', keydownClose)
      }
      setting.addEventListener('close', () => _sidebar.hide())
      setting.addEventListener('transitionend', function () {
        this.classList.contains('show') && nav.show()
      })
      setting.idValues = new Map
      let value
      Object.keys(backupSettings).forEach(name => {
        value = backupSettings[name].value
        setting.idValues.set(name, value)
        eval(`if (${backupSettings[name].path}) ${backupSettings[name].path} = '${value}'`)
      })
      gear.append(setting)
      setTimeout(syncThemeToOtherElems)
      SliMen.setwrapWithSpan(ADQTList)
      SliMen.iterEach(
        ADQTList.find(v => v.id === 'ors').list, item =>
        SliMen.detect.intrPage(item) && (item.style = { listContainer: 'padding-top: unset' })
      )
      SliMen.iterEach(
        ADQTList.find(v => v.id === 'Proxy_Software_Providers').list,
        SliMen.eval.string
      )
      setTimeout(() => setting.shadowRoot.querySelector('[list-container]').appendd(...ADQTList))
    })
    qForm.__keyDelay = Date.now()
    function checkCodeClass(silent = true) {
      qForm.__keyDelay = Date.now()
      qBox.classList[_inCodeMode || [/^\s*(:|```)/, /^\$/, /`$/].some(reg => reg.test(qBox.value))
        ? (inCodeMode = true, qBtn.setAttribute('mode', 'code'), qBtn.querySelector('[run]').setAttribute('text-content', translate`Run`), qBox.setAttribute('placeholder', translate(qBox.getAttribute('placeholder-en'))), 'add')
        : (inCodeMode = false, qBtn.setAttribute('mode', 'search'), qBox.removeAttribute('placeholder'), 'remove')
      ]('code')
      qBtn.alignHeightWithBox()
      if (!silent && _inCodeMode !== inCodeMode && !window._Toast_inCodeMode) msg(removeBlankInHTML(`
    <span>
      <span>Please </span>
      <span orig-dom-idx=0>
        <span orig-dom-idx=1 tran-dom-idx=2>
          <span>remove </span>
          <span orig-dom-idx=0>
            <span orig-dom-idx=1 tran-dom-idx=2><span translate-hide>the </span><b style='cursor:pointer;text-decoration:underline' onclick=this.getRootNode().querySelector('[onclick-handler]').scrollIntoView({behavior:'smooth'})>identifier</b><span translate-plural>s </span></span>
            <span orig-dom-idx=2 tran-dom-idx=1>used to mark the code or command </span>
          </span>
        </span>
        <span orig-dom-idx=2 tran-dom-idx=1 translate-retain-length=1>first</span>
      </span>
      !
    </span>
    <p><i-🍛 onclick=removeCodeClass.call(this)>Do it for me</i-🍛></p>
    <p style="padding-left:4rem;text-indent:-4rem">
      ➤ <b onclick-handler>identifier</b>:<br>
      <span>A </span>
      <span>pair </span>
      <span translate-hide>of </span>
      <span translate-as=measure-word>three </span>
      <span>backtick<span translate-plural>s </span></span>
      <span>(</span><code>\`\`\` \`\`\`</code><span>)</span>
      <span translate-copula='is'> or </span>
      <span orig-dom-idx=0>
        <span orig-dom-idx=1 tran-dom-idx=2>
          <span translate-as=measure-word>a</span> colon <span>(</span><code>:</code><span>) </span><span translate-retain-length=1>or </span>
          <span>dollar </span>sign <span>(</span><code>$</code><span>) </span>
        </span>
        <span orig-dom-idx=2 tran-dom-idx=1>at the beginning</span>
      </span>
      .
    </p>
  `), 1000, { id: '_Toast_inCodeMode', showXBtn: true })
      codeMode.querySelector('i-🔘').setAttribute('checked', _inCodeMode = inCodeMode)
      if (inCodeMode) _gP && _gP.clear()
    }
    window.removeCodeClass = function () {
      if (!_inCodeMode) return hintToClickXBtn.call(this)
      qBox.value = qBox.value.replace(/^\s*(```\s*|:)|\s*```\s*$/g, '')
      if (qBox.value.startsWith('$') || qBox.value.endsWith('`')) qBox.value = ` ${qBox.value} `
      codeMode.click()
      if (this) {
        this.textContent = translate(['Done', '!'])
        this.removeAttribute('onclick')
        setTimeout(hintToClickXBtn.bind(this), 2000)
      }
      delete window._Toast_inCodeMode
      function hintToClickXBtn() {
        doItTimes(
          () => flash(this.getRootNode().querySelector('.xBtnWrapper')),
          2, 2000
        )
      }
    }
    qForm.oninput = () => {
      if (qForm._composing) return
      (Date.now() - qForm.__keyDelay > 500) && checkCodeClass()
      if (window.CORSViaGM && CORSViaGM.initiated) {
        clearTimeout(qForm._tid)
        qForm._tid = !inCodeMode && _gP && setTimeout(() => qInputUpdated ? _api.googleSearchPredictions(qInput).then(pd => _gP.replaceItems(pd)) : _gP.show(), 200)
      }
      qForm._record()
    }
    qForm.addEventListener('compositionstart', () => qForm._composing = true)
    qForm.addEventListener('compositionend', () => delete qForm._composing)
    qForm._record = () => {
      qInput = qBox.value.trim()
      qInputRawOld === qInput
        ? qInputUpdated = false
        : (qInputRawOld = qInput, qInputUpdated = true)
      qCaret = qBox.selectionStart
      setItem('qAutofills', { qInput, qCaret })
    }
    qForm._relayKey = e => _gP && _gP.dispatchEvent(new e.constructor(e.type, e))
    qForm.addEventListener('keydown', e => {
      switch (true) {
        default:
          qForm._relayKey(e)
          qBox._redoVals(e); break
        case e.key.startsWith('Arrow'):
        case e.key === 'Enter':
          qForm._relayKey(e); break
        case e.altKey && e.key === 'c':
          _inCodeMode = !_inCodeMode; checkCodeClass(0); break
      }
    })
    qBox.addEventListener('keydown', () => qBox.style['font-style'] = '', { once: true })
    qBox._prevVals = [qBox.value]
    qBox._prevVals._idx = 0
    qBox._prevVals._record = v => {
      if (v === qBox._prevVals[qBox._prevVals._idx]) return
      const idx = ++qBox._prevVals._idx
      if (idx < qBox._prevVals.length - 1) qBox._prevVals.splice(idx)
      qBox._prevVals.push(v)
    }
    qBox._redoVals = e => {
      if (!e.ctrlKey) return
      const { key } = e
      let plus = 0
      switch (key) {
        case 'z': plus = -1; break
        case 'y': plus = 1; break
        default: return
      }
      plus = qBox._prevVals._idx + plus
      if (plus > qBox._prevVals.length - 1 || plus < 0) return
      qBox.value = qBox._prevVals[qBox._prevVals._idx = plus]
    }
    qBtn.alignHeightWithBox = function () {
      this.style.cssText += `height:${qBox.clientHeight + (inCodeMode ? 1 : 0)}px; padding-top:unset; padding-bottom:unset`
    }
    const isCmd = val => /^\s*:/.test(val)
    qForm.onsubmit = async e => {
      e.preventDefault()
      if (_gP && _gP.selected && _gP.selected.text && _gP.selected.text.toLowerCase() !== qBox.value.toLowerCase()) return changeInputWithSelectedIn_gP()
      const val = e.detail && e.detail.eval || qBox.value
      const _isCmd = isCmd(val)
      if (inCodeMode && !_isCmd) {
        if (!qBox.value.trim()) {
          _console.querySelectorAll('[input]>[info]:not([collapsed=true])').forEach(info => info.eval())
          return
        }
        qBox._value = /^\s*```/.test(val) ? val : '```' + val + '```'
        noReturn = undefined
        const evaled = await evalFencedJSCode(qBox._value)
        noReturn = noReturn !== undefined
          ? noReturn : /```\s*_console|\s*\.\s*```/.test(qBox._value) || false
        !noReturn && _console.log(evaled)
        return
      }
      if (!_isCmd) return window._allHTMLCompLoaded === true && typeof idRe === 'object'
        ? show()
        : (
          flash((_console.querySelector('[id=waiting-modules]') || Object.assign(
            (
              _console._options.setOnce('translate'),
              _console.log('Please wait for the module loading to complete first!')
            ),
            { id: 'waiting-modules' }
          )).firstElementChild),
          setTimeout(() => switchLang($id('waiting-modules'), true), 1500),
          !window._allHTMLCompLoaded && (window._allHTMLCompLoaded =
            new Promise(r => window._allHTMLCompLoaded_subscribe = r).then(() => {
              let waitingModules = $id('waiting-modules')
              waitingModules && waitingModules.remove()
            })
          )
        )
      else {
        startedBrowsing && refreshLocalStorage()
        _console._options.setOnce('translate', 'noReturn')
        const msg = qBox.value
          .replace(/^\s*:+\s*|\..*/g, '')
          .split(/[^\w-]+/)
          .map(cmd => cmds[cmd] && typeof cmds[cmd] === 'function' ? cmds[cmd]() : cmds[cmd])
          .filter(v => typeof v !== 'undefined' && v[Symbol.toStringTag] !== 'Promise')
          .join('\n')
        msg && _console.log(msg)
      }
      rememberPageState()
    }
    qForm.addEventListener('click', () => {
      qBox.focus()
      window._allHTMLCompLoaded && qBtn.alignHeightWithBox()
    })
    qForm.addEventListener('focusin', () => {
      qForm.inFocus = true
      qForm.classListTree.replace('after', 'before', 'focus')
      nav.dataset.focusOn = 'q-form'
      qBox.removeAttribute('style')
    })
    qFormPlus.addEventListener('focusout', e => {
      clearTimeout(qFormPlus._focusoutTimeout)
      qFormPlus._focusoutTimeout = setTimeout(() => {
        if (qFormPlus.cssLock && qFormPlus.cssLock.locking || sel.type === 'Range') return
        if (e.detail.refocus || qFormPlus.contains(e.relatedTarget) || _gP && _gP.isShow) return qBox.focus()
        qForm.classListTree.remove('focus')
        lockAndReleaseNav()
        delete nav.dataset.focusOn
        if (scrollY > nav._initialOffsetHeight) nav.classListTree.remove('before').add('after')
        if (nav.classList.contains('after')) qForm.classListTree.remove('before').add('after')
        qForm.inFocus = false
      }, 100)
    })
    customElements.whenDefined('i-💭').then(() => {
      _gP = new googlePredictions()
      _gP.appendToElem = qFormPlus
      _gP.responseToElems = [qBox, qForm]
      new MutationObserver(([m]) => {
        if (m.target.classList.contains('after') && !m.target.classList.contains('focus')) _gP.hide()
        _gP.shadowRoot.querySelector('ul').classList[nav.classList.contains('after') ? 'add' : 'remove']('flex')
      }).observe(document.querySelector('[data-icon=find]'), { attributeFilter: ['class'] })
      _gP.addEventListener('click', () => {
        if (sel.type === 'Range') return
        if (!_gP.selected.item) {
          _gP.hide()
          qFormPlus.dispatchEvent(new CustomEvent('focusout', { detail: { refocus: true } }))
          return
        }
        changeInputWithSelectedIn_gP()
      })
      qForm.addEventListener('focusin', _gP.show.bind(_gP))
      body.addEventListener('click', e => !qFormPlus.contains(e.target) && _gP.hide())
    })
    function changeInputWithSelectedIn_gP() {
      const idx = _gP.selected.text.toLowerCase().search(qBox.value.toLowerCase())
      ~idx ? qBox.value += _gP.selected.text.substring(idx + qBox.value.length) : qBox.value = _gP.selected.text
      qForm._record()
      qBox._prevVals._record(qBox.value)
      delete _gP.selected
    }
    tabGroup.addEventListener('click', e => {
      if (e.target.tagName !== 'LI') return
      const tab = e.target
        , panel = contentPanel.childrens.get(tab.dataset.targetId)
      !tab.className.includes('active')
        ? (tab.setAttribute('class', 'tab active'), panel && (
          panel._scrollY && setTimeout(() => {
            window.scroll(0, panel._scrollY)
            inftyScroll.softLock(1200)
          }),
          panel.classList.add('active')
        ))
        : (tab.removeAttribute('class'), panel && (
          panel._scrollY = scrollY,
          panel.removeAttribute('class')
        ))
      imgPanel.className.includes('active') && ['imgPanel', 'shyBtn'].every(
        tab => tabGroup.childrens.get(tab).className.includes('active')
      ) ? (imgPanelMask('add'), window._currVid && (_currVid.muted = true))
        : imgPanelMask('remove')
      lockAndReleaseNav()
    });
    [tabGroup, contentPanel].forEach(v => v.childrens =
      new Map([...v.children].map(c => [c.dataset.targetId || c.id, c]))
    )
    showBtn._neverClicked = true
    showBtn.addEventListener('click', function () {
      clearInterval(this._tid_clickMe)
      delete this._neverClicked
      this._msg_clickMe && this._msg_clickMe.scat()
    })
    function imgPanelMask(op) {
      imgPanel.classList[op]('mask')
      !CSSSupports.hostContext &&
        imgPanel.querySelectorAll('i-🎞️').forEach(v => v.classList[op]('mask'))
      if (op === 'add') {
        window._currVid && window._currVid.pause()
      }
    }
    const observer = new MutationObserver(() => {
      startedBrowsing = true
      timeStartAt = Date.now()
      observer.disconnect()
    })
    observer.observe(imgPanel, { attributeFilter: ['open'], subtree: true })
    const setReactEmotions = {
      add(emo, ID) {
        if (window[`${emo}List`].has(ID)) return
        this.setAttribute('data-emotions', (
          this.getAttribute('data-emotions') + ' ' + emo
        ).trim())
        window[`${emo}List`].add(ID)
      },
      del(emo, ID) {
        if (emo) {
          this.setAttribute('data-emotions',
            this.getAttribute('data-emotions').replace(` ${emo}`, '')
          )
          window[`${emo}List`].delete(ID)
        }
        imgPool.remove(ID)
        checkPool.remove(ID)
      }
    }
    function execEvt(eventTarget, { init = false } = {}) {
      const state = eventTarget._state || (Object.defineProperty(eventTarget, '_state', { value: {} }))
        , d = eventTarget.closest('details')
        , [summary, imgSec, emotions] =
          'summary, section, [data-emotions]'
            .split(', ').map(s => d.querySelector(s))
        , reactEmotions = new Proxy({}, {
          get(_t, k) {
            return Reflect.get(setReactEmotions, k).bind(emotions)
          }
        })
        , ID = summary.textContent
        , toggleIndicateNeg = text => {
          imgSec.dataset.neg = text ? true : ''
          imgSec.indicateNegElem.classList[imgSec.classList.contains('tmp-hide') ? 'remove' : 'add']('tmp-hide')
          imgSec.indicateNegElem.innerHTML = `<p tc>${text || '<span>Reload</span><span>?</span>↘'}</p>`
        }
        , indicateNeg = toggleIndicateNeg
        , indicateReloading = toggleIndicateNeg
      const exec = {
        collapse: () => d.removeAttribute('open'),
        collapseAll: () => Array.prototype.forEach.call(imgPanel.children, c => c.removeAttribute('open')),
        reload: () => loadImgSec(ID, imgSec, { evt: 'reload' }),
        favorite: () => say('fav', '💗', {
          invoke(state, igniting) {
            if (igniting) {
              reactEmotions.add('awesome', ID)
              reactEmotions.del('fav', ID)
            }
            else {
              reactEmotions.add('fav', ID)
              state.ignite = true
              state.upgradeText = '😍'
              setTimeout(() => state.ignite = false, 500)
            }
            if (init && awesomeList.has(ID)) execEvt(eventTarget)
          },
          revoke() {
            reactEmotions.del('awesome', ID)
            reactEmotions.del('fav', ID)
          }
        }),
        like: () => say('like', '👍', {
          invoke() { reactEmotions.add(reaction, ID) },
          revoke() { reactEmotions.del(reaction, ID) }
        }),
        pass: () => say('pass', null, {
          invoke() {
            indicateNeg('<span>(</span><span>Passed</span><span>)</span>')
            recalcImgLoading(imgSec)
            reactEmotions.del(undefined, ID)
          },
          revoke() { indicateReloading() }
        }),
        dislike: () => say('dislike', '👎', {
          invoke(state, igniting) {
            if (!igniting) {
              indicateNeg('<span>(</span><span>Marked as dislike</span><span>)</span>')
              recalcImgLoading(imgSec)
              !state._has && reactEmotions.add(reaction, ID)
              delete state._has
              state.ignite = true
              state.upgradeText = '🤮'
              setTimeout(() => state.ignite = false, 500)
            }
          },
          revoke() {
            reactEmotions.del(reaction, ID)
            indicateReloading()
          }
        })
      }
      const reaction = eventTarget.dataset.eventKey
      exec[reaction]();
      ['favorite', 'like'].includes(reaction)
        ? refreshLocalStorage()
        : ['pass', 'dislike'].includes(reaction)
        && d._checkUnwillView(imgSec.dataset.neg);
      ['pass', 'dislike', 'collapse', 'collapseAll'].includes(reaction) && (
        inftyScroll.softLock(),
        setTimeout(() => d.scrollIntoView({ block: 'nearest' }), ['collapse'].includes(reaction) && 80),
        concurrency.delete(ID),
        checkPool.remove(ID)
      )
      function say(word, contentChange, { invoke, revoke } = {}) {
        if (!state[word] || state.ignite) {
          if (!state.ignite) state[`${word}Text`] = eventTarget._enText
          state[word] = word
          eventTarget.textContent = state.ignite
            ? state.upgradeText
            : typeof contentChange === 'string'
              ? contentChange : eventTarget._enText + '~'
          evoke(invoke, state, state.ignite)
        }
        else {
          evoke(revoke)
          delete state[word]
          eventTarget.textContent = state[`${word}Text`]
        }
        function evoke(f, ...args) {
          if (typeof f === 'function') return f(...args)
        }
      }
    }
    imgPanel.addEventListener('error', e => {
      if (!(e.target.localName === 'img' && e.target.closest('[img-sec]'))) return
      const d = e.target.closest('details')
      if (!d) return
      if (!d._autoReloadTimes) d._autoReloadTimes = 1
      if (d._autoReloadTimes++ > 2) return
      clearTimeout(d._autoReload)
      d._autoReload = setTimeout(() => {
        concurrency.delete(d.ID)
        d.open && loadImgSec.reload(d)
      }, 1000)
    }, true)
    imgPanel.addEventListener('load', async e => {
      const T = e.target
      if (T.localName !== 'img' || !T.parentNode.hasAttribute('img-sec')) return
      const imgSec = T.closest('section'), d = imgSec.parentNode, ID = d.ID
      const isLastChild = T === T.parentNode.lastElementChild
      if (await isImgPlac(T)) {
        const isSubImg = T.parentNode.getAttribute('img-sec') === 'sub'
        if (isSubImg) {
          imgSec._idInfo.cIDP = padCID(imgSec._idInfo.cID, 5)
          if (imgSec._idInfo.cIDP !== imgSec._idInfo.cID) {
            imgSec._idInfo.cIDs[0] = imgSec._idInfo.cIDP
            loadImg(T)
            return
          }
        }
        concurrency.delete(ID)
        while (T.nextSibling) T.nextSibling.remove()
        if (imgSec.querySelector('img')) {
          imgSecLoaded(imgSec, ID)
        }
        isSubImg
          && T === T.parentNode.firstElementChild
          && T.parentNode.remove()
        T.remove()
        imgSec.clear()
        imgPool.loadNext()
      }
      else if (_pPerID < pPerID && imgSec.loadedCount + 1 === _pPerID) {
        imgSec.clear()
        imgPool.loadNext()
      }
      else {
        if (T.nextElementSibling && T.nextElementSibling.getAttribute('img-sec') === 'sub') return
        T.nextElementSibling
          ? T.closest('details').open && loadImg(T.nextElementSibling)
          : imgSec.clear()
        if (T === imgSec.firstElementChild) {
          if (!imgSec.dataset.loadingStoppedManually) {
            imgSec._foldUp = Object.assign(document.createElement('div'), { className: 'unrevealed' })
            setAttributes(imgSec._foldUp, 'img-sec=sub')
            imgSec._foldUp.append(...Array.prototype.slice.call(imgSec.children, 1))
            imgSec._foldUp.addEventListener('click', function () {
              this._h = this.clientHeight / 2
              this.addEventListener('dblclick', function () { css_collapseOrExpandSmoothly(this, { collapsedHeight: this._h, collapsedClass: 'unrevealed-' }) })
              this.removeAttribute('class')
            }, { once: true })
            imgSec.insertAdjacentElement('beforeend', imgSec._foldUp);
            [
              ['text-content', 'show all (+'],
              ['text-content-end', ')']
            ].forEach(
              ([k, v]) => [k, `${k}-en`].forEach(
                k => imgSec._foldUp.setAttribute(k, v)
              )
            )
            !d._checkUnwillView() && imgSec.classList.contains('tmp-hide') && d.restore()
            setTimeout(async () => {
              if (!window.CORSViaGM || imgSec._fetching_vid_inf) return
              if (d._checkUnwillView(1)) return console.log('Cancel fetching vid_inf.')
              devMode && console.log('Start fetching vid_inf!')
              imgSec._fetching_vid_inf = true
              const { url, info, review } = await vii.JAVLibrary.q(ID)
              delete imgSec._fetching_vid_inf
              info && d.otherInfo.append(html`<a class='flr sml' href=${url}>JAVLibrary ${translate`${'page'} link`}</a>`, info, review)
            }, _delayForQuery)
          }
        } else {
          imgSec._foldUp = T.parentNode
          if (T === imgSec._foldUp.firstElementChild) {
            imgSec._foldUp.style.setProperty('--img-width', `${T.width}px`)
          }
        }
      }
      if (!T.dataset.src) return
      imgs_LTT.trace(T.src)
      calcImgLoading({ evtSrc: { img: T, imgSec } })
      delete T.dataset.src
      if (imgSec.loadedCount > 1) {
        imgSec.lastElementChild.setAttribute('subsec-img-count', imgSec.loadedCount - 1)
      }
      if (imgSec.loadedCount === _pPerID || isLastChild) {
        imgSecLoaded(imgSec, ID)
      }
    }, true)
    function imgSecLoaded(imgSec, ID) {
      imgSec.dataset.loaded = true
      imgPool.remove(ID)
      const { nextSibling: nextSec } = imgSec.parentNode
      if (nextSec && nextSec.localName === 'details' && nextSec.querySelector('i-ꔹ')) {
        const { current, concurrencyLimit } = iLoadStat()
        if (current < concurrencyLimit) {
          loadImgSec.reload(nextSec)
        }
      }
    }
    imgPanel.addEventListener('click', e => {
      inftyScroll.softLock()
      const T = e.target
      if (T.dataset.eventKey) return execEvt(T)
      if (T.localName === 'summary') {
        const d = T.closest('details')
        d.open
          ? restartAnimation(d.querySelector('i-ꔹ'))
          : !T.nextElementSibling.hasAttribute('data-loaded')
          && !T.nextElementSibling.hasAttribute('data-not-found')
          && T.nextElementSibling.querySelector('[data-src]')
          && loadImg(T.nextElementSibling.querySelector('[data-src]'))
      }
    })
    let imgLoading = 0, imgToLoad = 0
    const imgLoadAdd = num => (imgLoading += num, imgToLoad += num)
      , iLoadStat = () => ({
        imgLoading, imgToLoad,
        ...(
          ({ current, limit, ongoingSet, totalSet }) =>
            ({ current, concurrencyLimit: limit, ongoing: [...ongoingSet], all: [...totalSet] })
        )(concurrency),
        checkPool: { all: [...checkPool.Set], waiting: [...checkPool.waitingSet] },
        imgPool: imgPool.map(v => v.ID)
      })
    const imgPool = Object.defineProperties([],
      {
        loadNext: {
          value() {
            if (!this.length) {
              if (concurrency.totalSet.size) {
                const fst = Array.from(concurrency.totalSet)[0]
                concurrency.delete(fst)
                this.add(fst)
              }
              else return
            }
            const { img, poolHint } = this.shift()
            if (poolHint) {
              poolHint.parentNode.querySelector('[loading]').removeAttribute('hide')
              poolHint.closest('details').imgSec.dataset.loadingStoppedManually && (
                poolHint.closest('[loading-indicator-text]').innerText =
                'The loading has been cancelled by you.'
              )
              poolHint.remove()
            }
            launchImg(img)
            this.updateCountText()
          }
        },
        _add: {
          value({ ID, img, poolHint }) {
            const toAdd = { ID, img, poolHint };
            (this.Map || (this.Map = new Map)).set(ID,
              (removeFromArr(this, '', ID, toAdd) || this.push(toAdd)) - 1
            )
            if (poolHint) {
              poolHint.removeAttribute('hide')
              this.updateCountText()
            }
          }
        },
        add: {
          value(info) {
            let ID, imgSec
            switch (true) {
              case typeof arguments[0] === 'string' && arguments[1] && arguments[1].localName === 'section':
                [ID, imgSec] = arguments
                break
              case typeof info === 'string':
                ID = info
                imgSec = $id(ID)
                imgSec = imgSec && imgSec.querySelector('[top-img-sec]')
                break
              case info.localName === 'section':
                imgSec = info
                ID = imgSec.closest('details').id
                break
              default: return
            }
            if (!imgSec) return
            this._add({
              ID,
              img: imgSec.firstElementChild,
              poolHint: imgSec.parentNode.querySelector('[loading-indicator-text] > [waiting]')
            })
          }
        },
        remove: {
          value(ID) {
            concurrency.delete(ID)
            this.Map && this.Map.delete(ID)
            removeFromArr(this, '', ID)
          }
        },
        updateCountText: {
          value() {
            this.forEach(({ poolHint }, i) => {
              poolHint.querySelector('[count]').textContent = i + 1
            })
          }
        }
      }
    )
    const checkPool = Object.defineProperties([],
      {
        limit: { get() { return concurrency.limit } },
        Set: { value: new Set() },
        waitingSet: { value: new Set() },
        remove: {
          value(ID) {
            removeFromArr(checkPool, v => v.for === ID);
            ['Set', 'waitingSet'].forEach(Set => checkPool[Set].delete(ID))
          }
        }
      }
    )
    class ImgSec {
      constructor(ID) {
        Object.assign(
          this.details = document.createElement('details'), { ID }
        ).appendChild(
          document.createElement('summary')
        ).innerHTML = ID
        this.details.setAttribute('ID', ID)
        this.section = this.details.appendChild(document.createElement('section'))
        this.otherInfo = this.details.appendChild(document.createElement('div'))
        setAttributes(this.otherInfo, 'other-info translate=no')
        Object.assign(this.details, {
          imgSec: this.section,
          otherInfo: this.otherInfo,
          _checkUnwillView(v) {
            if (v === undefined || typeof v === 'number') {
              !v && this._unwillView && this.tmpHide('[data-clear-on~=neg]')
              return this._unwillView
            }
            return (this._unwillView = v) && this._checkUnwillView()
          }
        })
        Object.defineProperties(this.section, {
          clear: {
            get() { return this.closest('details').clear.bind(this.closest('details')) }
          },
          loadedCount: {
            get() { return this.querySelectorAll('[img-sec] > img:not([data-src])').length }
          },
          indicateNegElem: {
            get() {
              if (this._indicateNegElem) return this._indicateNegElem
              this._indicateNegElem = this.insertAdjacentElement('afterend', document.createElement('div'))
              this._indicateNegElem.setAttribute('indicate-neg', '')
              return this._indicateNegElem
            }
          },
          stopLoading: {
            value(e) {
              const T = e.target
              T.removeAttribute('onclick')
              T.innerText = 'The remaining pictures have been cancelled.'
              this.dataset.loadingStoppedManually = true
              const _imgsCanceled = this.querySelectorAll('[img-sec] > img[data-src]:not([src])')
              _imgsCanceled.forEach(v => v.remove())
              this._imgsCanceledCount = _imgsCanceled.length
              imgPool.remove(ID)
              checkPool.remove(ID)
              concurrency.delete(ID)
            }
          },
          stopPreflighting: {
            value(statusElem) {
              this._isInStopPreflighting = true
              statusElem.remove()
              const selector = '[data-querying], i-ꔹ'.split(', ').find(_ => statusElem.matches(_))
              switch (selector) {
                case '[data-querying]':
                  resolvingSSNs.delete(this._idInfo.SSN); break
                case 'i-ꔹ':
                  delete this.dataset.checked
              }
            }
          },
          isInStopPreflighting: {
            get() {
              return this._isInStopPreflighting && delete this._isInStopPreflighting
            }
          }
        })
        Object.defineProperties(this.details, {
          clear: {
            value(selector = '', remove = true) {
              inftyScroll.softLock()
              const op = remove ? el => el.remove() : el => el.classList.add('tmp-hide')
              this.querySelectorAll(
                '[data-elems-can-be-cleared]' + (selector ? `, ${selector}` : '')
              ).forEach(op)
            }
          },
          tmpHide: {
            value(selector = '') {
              this.imgSec.dataset.tmpHide = true
              this.toggleTmpHide()
              this.clear(selector, false)
            }
          },
          restore: {
            value() {
              delete this.imgSec.dataset.tmpHide
              this.toggleTmpHide()
              this.querySelectorAll('[tmp-hide]').forEach(el => el.removeAttribute('tmp-hide'))
            }
          },
          toggleTmpHide: {
            value() {
              ['imgSec', 'otherInfo', 'vidSec'].forEach(el =>
                this[el] && this[el].classList.toggle(
                  ...this.toggleTmpHide_args()
                )
              )
              this.imgSec._indicateNegElem.classList.toggle(
                ...this.toggleTmpHide_args(!this.imgSec.dataset.tmpHide)
              )
            }
          },
          toggleTmpHide_args: {
            value(cond) {
              return ['tmp-hide', !!(cond === undefined ? this.imgSec.dataset.tmpHide : cond)]
            }
          }
        });
        ['img-sec', 'top-img-sec'].forEach(attr => this.section.setAttribute(attr, ''))
        return this
          .append({
            favorite: { text: 'Fav', stateHint: favList.has(ID) || awesomeList.has(ID) },
            like: { text: 'Like', stateHint: likeList.has(ID) },
            pass: { text: 'Pass' },
            dislike: { text: 'Dislike', stateHint: dislikeList.has(ID) }
          }, { cssClass: ['bottom-sticky'], attrs: ['data-emotions'] })
          .append({
            collapse: { text: 'Collapse', class: 'big-click' },
            collapseAll: { text: 'Collapse all', class: 'big-click' },
            reload: { text: 'Reload', class: 'big-click' }
          }, { cssClass: ['tc'] })
      }
      get ok() {
        return this.details
      }
      append(childOpts, { cssClass = [], attrs = [] } = {}) {
        const parentNode = this.details.appendChild(document.createElement('div'))
        attrs.forEach(attrPair => parentNode.setAttribute(...(attrPair + ':').split(/\s*:\s*/)))
        parentNode.classList.add(...cssClass)
        Object.entries(childOpts).forEach(([key, detail]) => {
          const opt = parentNode.appendChild(document.createElement('span'))
          {
            opt.dataset.eventKey = key
            opt.innerText = detail.text
            opt._enText = detail.enText || detail.text
            opt.setAttribute('translate', 'always')
            Object.defineProperty(opt, '_state', { value: { ...detail.stateHint && { _has: true } } })
            detail.class && opt.classList.add(detail.class)
          }
        })
        return this
      }
    }
    const openObsr = new class {
      constructor() {
        this.Set = new Set()
        const op = new Proxy(this, {
          get: function (_, p) {
            return ID => [this.Set, concurrency].forEach(v => v[p](ID))
          }.bind(this)
        })
        let ID
        return new MutationObserver(([m]) => {
          ID = m.target.ID
          m.target.hasAttribute('open')
            ? (
              !['loaded', 'neg'].find(state => m.target.querySelector('section').dataset[state])
              && op.add(ID),
              this.Set.size
              && proBar.classList.replace('fadeout', 'fadein')
            )
            : (
              this.Set.has(ID)
              && op.delete(ID),
              !this.Set.size
              && (proBar.classList.replace('fadein', 'fadeout') || proBar.classList.add('fadeout'))
            )
        })
      }
    }
    async function loadImgSec(ID, imgSec, { evt } = {}) {
      if (body.firstElementChild.localName.includes('err')) return
      if (ID instanceof HTMLElement) {
        ({ evt } = imgSec || {})
        imgSec = ID
        ID = imgSec.previousElementSibling.textContent
      }
      if (!(imgSec instanceof HTMLElement)) {
        if (!favList && !dbUnavailable) {
          body.insertAdjacentElement('afterbegin', new errSec('idb-problem'))
          throw Error(translate('Unable to use indexedDB.'))
        }
        imgSec = imgPanel.appendChild(new ImgSec(ID).ok).querySelector('[top-img-sec]')
      }
      const d = imgSec.closest('details')
      d.setAttribute('open', '')
      let lastBing = d.querySelector('[data-querying], i-ꔹ')
      if (lastBing) {
        imgSec.stopPreflighting(lastBing)
        loadImgSec(ID, imgSec, { evt })
        return
      }
      if (evt === 'reload') {
        if (d._gettingFullVidSrc) return msg('Already searching for online resources, don\'t rush!')
        if (imgSec.dataset.nonexistent) return msg(imgSec.innerText, { showXBtn: false })
        imgSec.indicateNegElem.classList.add('tmp-hide')
        if (imgSec.querySelector('img') || imgSec.dataset.notFound) {
          if (imgSec.dataset.tmpHide) d.restore()
          if (imgSec.dataset.loaded || imgSec.dataset.notFound) {
            if (!imgSec.dataset.notFound && !d._hasFullVidSrced) {
              d._gettingFullVidSrc = true
              await getFullVidSrcsAsTable(ID, imgSec)
              d._hasFullVidSrced = delete d._gettingFullVidSrc
              return
            }
            return msg(imgSec.dataset.notFound ? 'Checked, nothing more' : 'Not needed')
          }
        }
        recalcImgLoading(imgSec)
        switchSites.ifNecessary(imgSec)
        imgSec.innerHTML = ''
        imgSec.clear('[data-clear-on~=reload]', false)
        'checked loadingStoppedManually'.split(' ').forEach(k => delete imgSec.dataset[k])
        checkPool.remove(ID)
      }
      [...imgSec.parentNode.querySelectorAll('[data-emotions] > [data-event-key]')]
        .filter(k => Reflect.has(k._state, '_has')).forEach(k => execEvt(k, { init: true }))
      if (imgSec.dataset.neg && evt !== 'reload') return
      concurrency.add(ID)
      let canLaunch = concurrency.ongoingSet.has(ID) || concurrency.current + 1 <= concurrency.limit
      canLaunch && concurrency.launch(ID)
      imgSec.insertAdjacentHTML('afterend', '<i-ꔹ data-clear-on="neg reload"></i-ꔹ>')
      if (checkPool.waitingSet.has(ID)) return
      inftyScroll._locking = inftyScroll.locking
      inftyScroll.locking = true
      imgSec.scrollIntoView()
      whenScrollStop(() => inftyScroll.locking = inftyScroll._locking)
      let { imgUrls, cIDs } = genImgUrls(ID, { pSize: 'small', try1: 1 })
      const { boot, go, ready } = checkImgsExist(imgUrls, cIDs);
      [imgSec._imgUrl] = imgUrls
      checkPool.Set.add(ID).size <= checkPool.limit
        || evt === 'reload' && checkPool.Set.size === checkPool.waitingSet.size + 1
        ? boot.start()
        : (
          checkPool.waitingSet.add(ID),
          await checkPool[checkPool.push(Object.assign(ready, { go: boot.waitToGo, for: ID })) - 1]
        )
      const imgg = await go
      imgSec.dataset.checked = true
      imgSec.clear('i-ꔹ')
      checkPool.Set.delete(ID)
      delete imgSec._imgUrl
      if (imgSec.isInStopPreflighting) return
      if (imgSec.dataset.tmpHide) d.restore(true)
      cIDs = imgg.filter(v => v.img).map(v => v.cID)
      imgSec._idInfo = { ID, cIDs, ...(({ 'Series Short Name': SSN, 'Serial Number': SN }) => ({ SSN, SN }))(idInfo(ID)) }
      if (!isSNInRange(imgSec._idInfo.SN) && !cIDs.length) {
        imgPool.remove(ID)
        remove(d, 'details>:nth-child(n+3):nth-last-child(n+2)')
        imgSec.innerHTML = '<p tc><span>Nonexistent</span> 🙂</p>'
        imgSec.dataset.nonexistent = true
        return
      }
      if (!d._underObservation) {
        openObsr.observe(d, { attributeFilter: ['open'] })
        d._underObservation = true
      }
      Object.defineProperty(imgSec._idInfo, 'cID', {
        get() { return this.cIDs.length ? this.cIDs[0]['Content ID'] || this.cIDs[0] : '' }
      })
      switch (cIDs.length) {
        case 0:
          cIDs = (await findIDExistences(imgSec)) || []
          if (imgSec.isInStopPreflighting) return
          if (!cIDs.length || cIDs === 'foreignError') {
            const specErrText = { foreignError: 'Sorry! This content is not available in your region.<br><span sml>(<span>The implication is that it\'s not open to your IP,<br>it can be accessed by changing to a Japanese proxy node</span>)</span>' }[cIDs]
            idNotFound(imgSec, { specErrText })
            getFullVidSrcsAsTable(ID, imgSec)
            imgPool.remove(ID)
            return
          }
          if (cIDs.length > 1) await showChoose(imgSec, cIDs)
          else {
            d.querySelector('[data-querying]').remove()
            imgSec._idInfo.cIDs = cIDs = [cIDs[0]['Content ID']]
          }
          break
        case 1:
          break
        default:
          await showChoose(imgSec, cIDs)
      }
      let img
      imgSec.dataset.loadAtTime = proBar.dataset.times || (proBar.dataset.times = '0')
      genImgUrls(ID, { to: devMode ? 2 || 3 : shy_setting.imgs.numPerGroup }).imgUrls.forEach(url => {
        img = imgSec.appendChild(document.createElement('img'))
        img.dataset.src = url
        shy_setting.imgs.lazyLoad && (img.loading = 'lazy')
      })
      imgSec.insertAdjacentHTML('afterend', `
    <p tc loading-indicator-text data-elems-can-be-cleared>
      <span current-loading-p></span><br>
      <span waiting hide>Wait for the previous <span count></span> sets of pictures.</span>
      <span loading hide>Loading<span></span>＃<span group-loading-count num-pad></span><span translate-prefix=measure-word> image</span>${typeDots}</span>
      <span stop class=big-click onclick=this.closest('details').imgSec.stopLoading(event)>Stop loading</span>
    </p>
    <div container-of=i-🎞️ data-clear-on='neg reload' hide></div>
  `)
      canLaunch = canLaunch || concurrency.current + 1 <= concurrency.limit
      canLaunch
        ? (
          removeChilds(imgSec, ':not(img)'),
          launchImg(imgSec.firstElementChild, ID),
          imgSec.parentNode.querySelector('[loading-indicator-text] > [loading]').removeAttribute('hide'),
          showBtn._neverClicked && remindUsersToClick(showBtn, 'You can click the "Show" button to view the resources.')
        )
        : imgPool.add(ID || imgSec)
      return imgSec
    }
    loadImgSec.reload = elem => {
      if (elem.localName !== 'details') elem = elem.closest('details')
      elem.querySelector('[data-event-key=reload]').click()
    }
    function remindUsersToClick(elem, msgStr = '') {
      clearInterval(elem._tid_clickMe)
      elem._tid_clickMe = setInterval(() => {
        elem._msg_clickMe = msg(msgStr, 'remindUsersToClick')
        setTimeout(() => flash(elem), 2222)
      }, 7777)
    }
    function launchImg(img, ID) {
      if (!img.isConnected) return
      if (!ID) ID = img.closest('details').ID
      concurrency.launch(ID)
      imgLoadAdd(img.closest('section').querySelectorAll('img[data-src]').length)
      loadImg(img)
    }
    function checkImgsExist(imgUrls, cIDs) {
      const imgSrc = imgUrls[0]
      const boot = {}
      return {
        boot,
        ready: new Promise(r => boot.waitToGo = r).then(() => boot.start()),
        go: new Promise(r => boot.start = r).then(() =>
          Promise.all(cIDs.map(cID => {
            const p = new Promise(res =>
              Object.assign(document.createElement('img'), {
                src: evalStr(imgSrc, { cID })
              }).addEventListener(
                'load',
                async function loaded() {
                  this.removeEventListener('load', loaded)
                  res({ cID, img: await isImgPlac(this) ? null : this })
                  if (checkPool.length) {
                    const { go, for: ID } = checkPool.shift()
                    checkPool.waitingSet.delete(ID)
                    go()
                  }
                  const blockedInfo = _console.querySelector('[id=connection-blocked]')
                  if (blockedInfo) {
                    const typeText = blockedInfo.querySelector('i-🖨️')
                    if (_userLangInCJK) {
                      typeText._charWidth = 2
                      typeText._speed = 6
                    }
                    typeText._start()
                  }
                }
              )
            )
            timeoutIn(shy_setting.judgeBlockTime, {
              rival: p, log: false,
              fallback: () => {
                let info = _console.querySelector('[id=connection-blocked]'); info
                  ? flash(info.querySelector('[info]'))
                  : (
                    _console._options.setOnce('no_extra_close', 'translate'),
                    info = Object.assign(_console.logFromTop(
                      '<p tc>🚫 <span></span>The connection '
                      + '<i-🖨️ wait mode=del speed=10 alternate times=1 delay=2 on-style=\'font-weight: bold\'\
                onstartdelay=-1 onend=\'this.textContent = "is too slow"\' '+
                      (_userLangInCJK ? 'style="--font-family: Microsoft YaHei UI"' : '') +
                      '>seems to be blocked</i-🖨️><span>,</span> '
                      + 'maybe you need a proxy software or a better provider.' +
                      '</p>' +
                      '<div class=dual-opts onclick="event.target.localName===\'span\'&&foldToTopAndRemove(this.closest(\'[info-block]\'))">'
                      + '<a class=big-click onclick=clickOut("Proxy_Software_Providers")>[<span>Take One</span>]</a>'
                      + '<a class=big-click>[<span>Dismiss</span>]</a>' +
                      '</div>'
                    ), { id: 'connection-blocked' })
                  )
              }
            })
            return p
          }))
        )
      }
    }
    window.clickOut = (...settingItemIDs) => {
      setting.goHome().then(() => click(
        ..._sidebar.classList.contains('show') ? [] : [menuKey],
        ...setting.classList.contains('show') ? [] : [gear],
        ...settingItemIDs.map(id => function willClick() { return $id(setting, id) })
      ))
    }
    async function findIDExistences(imgSec) {
      const ID = imgSec.previousSibling.textContent
      imgSec.innerHTML = ''
      imgSec.insertAdjacentHTML('beforeend', `
    <p tc data-querying>
      An exception ID rule was encountered.<br>
      Now querying from the server${typeDots}
    </p>
  `)
      return (await tryTwice(async found => {
        found = await resolveID(ID)
        if (found === 'foreignError') found = { founds: 'foreignError' }
        else if (found === 'try again') found = await resolveID(ID)
        return found
      })).founds
    }
    function idNotFound(imgSec, { specErrText } = {}) {
      imgSec.setAttribute('data-not-found', true)
      imgSec.innerHTML = typeof specErrText === 'string' && specErrText
        ? `<p tc>${specErrText}</p>`
        : '<p tc>(<span orig-dom-idx=0><span tran-dom-idx=2,1 judge>Not Found</span><span translate-as=prep translate-merge=on tran-dom-idx=1,2 translate-shift translate-add-space="`${kw} `"> on <span translate-as=prep-at>FANZA</span></span></span>)</p>'
      if (testMode) _console.log(
        `(${'Img'}_ID_${'Not_Found'}:) ${ID} → ${imgSec._idInfo.cID}`
      )
      if (debug) debugger
    }
    function showChoose(imgSec, cIDs) {
      let cID
      imgSec.innerHTML = `<div data-to-choose><p tc><span>Choose</span>:</p><div class=card-list>${cIDs.map(cIDInfo => {
        cID = cIDInfo['Content ID'] || cIDInfo
        return `
    <figure>
      <img data-cID='${cID}' src='${genImgUrl('', { cID })}'>
      <figcaption>
        ${`<span>(${cID})</span>` + (cIDInfo.title ? `<span>${cIDInfo.title}</span>` : '')}
      </figcaption>
    </figure>`
      }).join('')}</div></div>`
      let chosen, T
      imgSec.querySelector('[data-to-choose] > .card-list').addEventListener('click', function (e) {
        T = e.target.closest('figure')
        if (!T) return
        cIDs.length = 0
        cIDs.push(T.querySelector('img').dataset.cid)
        chosen()
        this.parentNode.remove()
      })
      return new Promise(r => chosen = r)
    }
    function loadImg(imgNode) {
      if (!imgNode || imgNode.localName !== 'img') {
        console.error(imgNode, 'is not an imgNode.')
        debugger; return
      }
      const [d, s] = ['details', 'section'].map(v => imgNode.closest(v))
      if (!s) debugger
      imgNode.src = evalStr(imgNode.dataset.src || imgNode.src, { cID: s._idInfo.cID })
      let [pName, pOrd] = ['current-loading-p', 'group-loading-count'].map(attr => d.querySelector(`[loading-indicator-text] [${attr}]`))
      if (!pName) return
      pName.textContent = imgNode.src.replace(regex.dn_n_file, "$1...$2")
      pOrd.textContent = s.querySelectorAll('[src]').length
      imgs_LTT.trace(imgNode.src)
      imgNode.parentNode.getAttribute('img-sec') === ''
        && imgNode === imgNode.parentNode.firstElementChild
        && shy_setting.video && !imgNode.closest('details')._triedVideoSrc && getTrailerSrcs(imgNode.parentNode)
    }
    function isAttrTheSame(attr, ...elems) {
      const attrOf = elem => String(elem[attr] || !!(elem.hasAttribute && elem.hasAttribute(attr)))
      return elems.every((elem, i) => !i || attrOf(elem) === attrOf(elems[i - 1]))
    }
    const vIDSrcRecs = new Map()
    function getTrailerSrcs(imgSec, { vidUrls } = {}) {
      if (imgSec.parentNode.vidSec && imgSec.parentNode.vidSec.querySelector('i-🎞️') || imgSec.dataset.neg) return
      imgSec.parentNode._triedVideoSrc = true
      const { _idInfo } = imgSec
      const { ID } = _idInfo
      const vidSet = new VidSet({ preset: 'attrs' })
      let gotVidUrls = vidUrls || genVidUrlsForTrial(_idInfo.cID)
      if (!gotVidUrls) return
      const currentSrc = () => vidSet.video.currentSrc
      const handleNoSrcs = () => {
        vids_LTT.siteRecs[regex.matchDN(currentSrc())].hasNoSrcsForTheseIDs.add(_idInfo.cID)
        gotVidUrls = genVidUrlsForTrial(_idInfo.cID)
        if (gotVidUrls) return getTrailerSrcs(imgSec, { vidUrls: gotVidUrls })
        imgSec.parentNode.querySelector('div[container-of=i-🎞️]').remove()
        getFullVidSrcsAsTable(ID, imgSec)
      }
      const e_detail = {}
      const handleSrced = showVidSet.bind(vidSet, imgSec, e_detail)
      vidSet.addEventListener('sourced', function (e) {
        Object.assign(e_detail, e.detail)
        if (e.detail.asAssert) {
          this.removeEventListener('no source', handleNoSrcs)
          this.appendSrc(
            gotVidUrls.find(src => isAttrTheSame('asSrcForTry', e.detail.srcElem, src))
          )
          this.addEventListener('no source', () => {
            vIDSrcRecs.delete(_idInfo.SSN)
            getTrailerSrcs(imgSec)
          })
          this.addEventListener('sourced', handleSrced)
        }
        else handleSrced()
      }, { once: true })
      vidSet.addEventListener('no source', handleNoSrcs, { once: true })
      vIDSrcRecs.has(_idInfo.SSN)
        ? vidSet.dispatchEvent(new CustomEvent('sourced', {
          detail: { asAssert: true, srcElem: { asSrcForTry: vIDSrcRecs.get(_idInfo.SSN).asSrcForTry } }
        }))
        : (
          vidSet.appendSrc(
            ...gotVidUrls.filter(src => src.quality === videoPlay.quality.pref)
          ),
          setTimeout(() => vids_LTT.trace(currentSrc()))
        )
      devMode && !checkRemoteFetch.doneAt
        && !devTold['!checkRemoteFetch.doneAt'] && (devTold['!checkRemoteFetch.doneAt'] = 1) &&
        setTimeout(() => console.log(`checkRemoteFetch is not finished yet but the video ${vidSet.shadowRoot.querySelector('video').querySelector('source').src.replace(/https:\/\/([^/]*)\/.*\/(.*)/, '($2 from $1)')} have been successfully fetched.`), 1000)
    }
    async function getFullVidSrcsAsTable(ID, imgSec) {
      const srcsToInsert = findVidSrcs(ID, { tag: 'td' })
      const table = html`
    <div class=table-wrap dont-touch-sidebar>
      <table class=table>
        <tr>
          <th scope=row>Watch Full Movie</th>
          <td src-type=stream via=se></td>
        <tr>
          <th scope=row>Also Downloadable</th>
          <td src-type=download via=se></td>
        <tr>
          <th scope=row>BT Magnet</th>
          <td src-type=bt via=a-link></td>
      </table>
    </div>
    `
      imgSec.parentNode.otherInfo.prepend(table)
      await Promise.all(
        [
          ['td[src-type][via=se]', td => srcsToInsert(td.getAttribute('src-type'))({ listContainer: td.parentNode })],
          ['td[src-type][via=a-link]', td => btSites.forEach(site => td.parentNode.insertAdjacentHTML('beforeend', `<td><a href='${site.q(ID)}'>${icoImg(site)} ${site.name}</a></td>`))]
        ]
          .flatMap(([td, fn]) => Array.prototype.map.call(table.querySelectorAll(td), fn))
      )
      table.querySelectorAll('tr').forEach(tr =>
        Array.prototype.every.call(tr.querySelectorAll('td'), td => !td.innerText)
        && tr.querySelector('td').insertAdjacentHTML('afterend', '<td data-not-found>(<span>Not found</span>)</td>')
      )
      if (table.querySelector('[via=se]+:not([data-not-found])')) (imgSec.querySelector('[judge]') || {}).innerText = 'Not included'
      if (table.querySelector('[src-type=download]+:not([data-not-found])')) (table.querySelector('[src-type=stream]+[data-not-found]') || {}).innerText = '(See below)'
    }
    function showVidSet(imgSec, e_detail) {
      if (!(this instanceof VidSet) || !imgSec) return
      const { _idInfo, vidSrcs } = imgSec
      const vidSetContainer = imgSec.parentNode.vidSec = imgSec.parentNode.querySelector('[container-of=i-🎞️]')
      const vid = $id(this, 'video')
      vidSetContainer.append(this);
      [...this.attributes].forEach(({ name, value }) => this.setAttribute(name, value))
      vid.querySelectorAll('source').forEach(src => src.remove())
      this.appendSrc(...vidSrcs ||
        genVidUrlsForTrial(_idInfo.cID)
          .filter(src => isAttrTheSame('asSrcForTry', src, e_detail.srcElem))
          .sort(({ quality: a }, { quality: b }) => videoPlay.quality.opts.indexOf(a) - videoPlay.quality.opts.indexOf(b))
      )
      !vIDSrcRecs.has(_idInfo.SSN) &&
        vIDSrcRecs.set(_idInfo.SSN, { asSrcForTry: e_detail.srcElem.hasAttribute('asSrcForTry') })
      vid._presetQuality = videoPlay.quality.pref
      vidSetContainer.removeAttribute('hide')
      imgPanel.classList.contains('mask') && imgPanelMask('add')
      genVidMenu.call(this, imgSec.closest('details').id)
    }
    function searchVidSrcs(id, { tag, justBt } = {}) {
      const srcs = [], invals = []
      outsideSrc.vid.forEach(vSrc => {
        if (!(typeof vSrc.domain === 'string' && vSrc.domain.includes('.'))) return
        typeof vSrc.type === 'string'
          ? srcs.push({ elem: getFullVidSrcsAsElem(vSrc, { id, tag, justBt }), types: vSrc.type.split(','), id })
          : invals.push(vSrc.domain)
      })
      invals.length && !devTold.usrAddSrc && (devTold.usrAddSrc = !console.error(translate(['You want to add other website sources, but in the configuration file `./configs/config.js`, ', translateInterp(`the domain '${invals}' is missing a required field "type", e.g.`, /'(.+?)'/, '${domain}'), '\n  ', "type: 'stream'\n     || 'stream,download'\n     || 'stream(fast),download(BT)'"])))
      return srcs
    }
    function insertVidSrcs(srcType, srcs, { dt, listContainer = dt._ownListContainer, noneText = '' }) {
      let [typeTestR, typeTestBT, typeTestBTDedic]
        = [`${srcType}(?!\\(nr)`, 'download\\(BT\\)', '^bt']
          .map(type => RegExp.prototype.test.bind(RegExp(type, 'i')))
      return Promise.all(srcs.map(async src => {
        const elem = await src.elem
        if (!elem) return
        if (!src.types.every(typeTestBTDedic)) $id(src.id)._hasFullVidSrced = true
        if (src.types.some(typeTestR)) {
          (typeof listContainer === 'function' ? listContainer() : listContainer).append(
            (/bt/i.test(srcType) && src.types.some(typeTestBT) ? elem.cloneNode(true) : elem) || noneText
          )
        }
        if (dt && listContainer.childElementCount) {
          dt.classList.remove('hide')
          dt.nextElementSibling.classList.remove('hide')
        }
      }))
    }
    function findVidSrcs(id, { tag, justBt } = {}) {
      const foundVidSrcs = searchVidSrcs(id, { tag, justBt })
      return srcType => (...args) => insertVidSrcs.bind(null, srcType, foundVidSrcs)(...args)
    }
    let throttledFetching = Promise.resolve()
    const throttledFetching_queue = []
    throttledFetching_queue.next = f => (f = throttledFetching_queue.shift(), f && f.nextFetch())
    throttledFetching_queue.interval = 1
    let lastTimePrompt429
    async function getFullVidSrcsAsElem(
      { domain, name: siteName, icon, q } = {},
      { id, tag = 'dt', justBt } = {},
      { sEs = [se.gg, se.ddg] } = {},
      { immediateRetry } = {}
    ) {
      if (!window.CORSViaGM) return _promptAboutInstallGM('Unable to search online source because the specified plug-in script is not loaded.')
      if (typeof domain !== 'string') return
      const discard = (stage, unwilled) => (unwilled = unwillView(id)) && (
        console.log(translateInterp(`ID '${id}' also makes you feel {${unwilled}}, so skip the fetching of resources.`, /(?<=').+?(?=')|(?<={).+?(?=})/g, ['${id}', '${uw}'])),
        !immediateRetry && throttledFetching_queue.next(),
        true
      )
      let discarded
      if (discarded = discard('entry')) return
      let link, title
      if (typeof q === 'function') link = q(id)
      else {
        if (justBt) sEs = []
        if (!sEs.length) return throttledFetching_queue.next()
        const se = sEs.shift()
        link = se.q(id, { site: domain })
        if (!immediateRetry) throttledFetching = throttledFetching.then(() => {
          const thatTime = Date.now()
          return new Promise(nextFetching => {
            throttledFetching_queue.push({
              async nextFetch() {
                !throttledFetching_queue.firstTime && await sleep(throttledFetching_queue.interval)
                discarded = discard('delaying')
                !discarded && devMode && console.log(`${reqAbout} is now sent (after ${Date.now() - thatTime}ms in the queue)`)
                nextFetching(discarded)
              }, for: { id, site: siteName }
            })
            const reqAbout = JSON.stringify(throttledFetching_queue.last.for)
          })
        })
        if (!throttledFetching_queue.banging) {
          throttledFetching_queue.banging = true
          throttledFetching_queue.firstTime = true
          await sleep(throttledFetching_queue.interval + 0.3)
          throttledFetching_queue.next()
        }
        else if (!immediateRetry) discarded = await throttledFetching
        if (discarded) return console.log(`ID ${id} fetching discarded.` + ` (${siteName.replaceAll(' ', '')})`)
        const res = await fetch(link)
        const tryNextSE = () => getFullVidSrcsAsElem(...Array.prototype.slice.call(arguments, 0, 2), { sEs }, { immediateRetry: true })
        if (!res.ok) {
          if (res.status === 429) {
            if (!lastTimePrompt429 || Date.now() - lastTimePrompt429 > 60_000) {
              lastTimePrompt429 = Date.now()
              _console.logFromTop(`Please <span orig-dom-idx=0><span tran-dom-idx=2,1>click </span><a href=${link} tran-dom-idx=3,2><span translate-pron=link>this </span><span>Google </span><span>search </span>link</a><span tran-dom-idx=1,3> manually</span></span>.`).dataset.dupId = 'lastTimePrompt429'
            }
          }
          else console.warn(res)
          return tryNextSE()
        }
        const resText = await res.text()
        if (resText.startsWith(se.rejected_prompt)) return tryNextSE();
        ({ link, title } = se.result.first(resText))
        if (![link, title].some(str => str && str.toLowerCase().includes(id.toLowerCase()))) return tryNextSE()
        console.log(`✌️ An online source for "${id}" was found via ${se.basicUrls.name}`, `(on ${siteName})`)
        throttledFetching_queue.firstTime && delete throttledFetching_queue.firstTime && await sleep(throttledFetching_queue.interval + 0.3)
        throttledFetching_queue.next()
      }
      return html`
    <${tag}>
      <a href="${link.startsWith('http') ? '' : 'https://'}${link}" ${!title ? '' : `title='${title.trim().replace(/'/g, '\\$&')}'`}>${icoImg(domain, icon)} ${siteName}</a>
    </${tag}>
  `
    }
    function unwillView(id) {
      id = id.toUpperCase()
      return dislikeList.has(id)
        ? 'detested' : (id = $id(id)) && id._checkUnwillView(1) && id._hasFullVidSrced && !id._gettingFullVidSrc
          ? 'passed' : false
    }
    function genVidMenu(id) {
      if (!(this instanceof VidSet)) return
      const vid = $id(this, 'video')
      const placeholder = { list: ' ', preload: true, style: { dt: 'hide', dd: 'hide' } }
      const sM = new SliMen({
        term: 'src control',
        listFlavor: 'flex',
        list: Object.assign([
          {
            term: '<span translate-about=video>Quality</span>',
            preload: true,
            list: [...vid.querySelectorAll('source')].map(v => getAttributes(v, ['quality', 'src'])).map(o => Object.assign({ term: videoPlay.quality.pixels[o.quality] + 'p', id: o.quality }, o)),
            async func({ listContainer }) {
              listContainer.addEventListener('click', function (e) {
                if (e.target === this) return
                const dt = e.target.closest('dt')
                this._currSelect && this._currSelect.classList.remove('pink')
                const currentTime = vid.currentTime
                vid.autoplay = !vid.paused
                vid.src = dt.dataItem.src
                vid.currentTime = currentTime
                dt.classList.add('pink')
                this._currSelect = dt
              })
              await tryTwice(() => listContainer.querySelector(`#${vid._presetQuality}`).click())
            }
          }
        ], { attrs: 'list-style=compact' }),
        style: { header: 'hide' },
      })
      sM.style.setProperty('--sym-x', '"\\a0"')
      $id(this, 'menu').append(sM)
      setTimeout(() => {
        const justBt = this.closest('details')._checkUnwillView(1)
        if (justBt) console.log('Cancel fetching vid_src.')
        else devMode && console.log('Start fetching vid_src!')
        const insSrcs = findVidSrcs(id, { justBt }), l = sM.shadowRoot.querySelector('[list-container]')
        l.appendd(
          {
            term: 'Watch Full Movie',
            ...placeholder,
            func: insSrcs('stream')
          },
          {
            term: 'Also Downloadable',
            ...placeholder,
            func: insSrcs('download')
          },
          {
            term: 'BT Magnet',
            ...placeholder,
            func: insSrcs('bt')
          }
        )
        switchLang(l, true)
      }, _delayForQuery)
    }
    async function show(_qInputRaw) {
      const qVal = qBox.value.trim()
      if (banR18._checked || qVal.endsWith(':')) return search(qVal.replace(/:$/, ''))
      if (qInputRaw === qVal + window.location.search) return
      qInputRaw = (_qInputRaw || qVal) + ' ' + window.location.search
      qInput = extractIDs(qVal)
      qInputNew = arrayMoreThan(qInput, qInputOld)
      if (!qInput.length) {
        qInput.rawOld !== qVal && !isCmd(qVal) && search(qVal)
        qInput.rawOld = qVal
        return
      }
      if (!qInputNew.length) return
      qInputOld = qInput
      const goToLoadImgSec = inputArr => inputArr.forEach(ID => {
        if (ID.includes('..')) {
          const { 'Series Short Name': s } = idInfo(ID)
          return goToLoadImgSec(parseStrToNumRange(ID.replace(/^(?:.(?!\.{2}))*-/, '')).map(n => `${s}-${n}`))
        }
        ID = normID(ID)
        if (qSet.has(ID)) return
        qSet.add(ID)
        loadImgSec(ID)
        if (!lastID) lastID = ID
      })
      goToLoadImgSec(qInputNew)
    }
    async function search(str, { _misspell, _remiss } = {}) {
      if (!(str && typeof str === 'string' && str.trim())) return
      _gP.hide()
      let resultPanel, searchText, resultCountEl, resultCount
      if (search.hist[str] || _misspell) {
        if (_misspell) {
          delete search.hist[_misspell._weird]
          search.hist[str] = _misspell
        }
        ({ resultPanel, searchHeading, searchText, resultCountEl, resultCount } = search.hist[str])
        if (_misspell) {
          resultCountEl.classList.add('hide')
          searchText.innerText = str
          replaceChildNodes(resultPanel, searchHeading)
        }
        else if (!search.hist[str]._netErr) return resultPanel.scrollIntoView()
      }
      else {
        resultPanel = searchPanel.appendChild(Object.assign(document.createElement('div'), { className: 'search-result' }))
        resultPanel.insertAdjacentHTML('afterbegin', `<p translate-merge=@hold><span>Search results for "<span translate-id=text translate-hold translate=no></span>"</span> <span result-count class=hide>(top <span translate-id=count translate-hold translate=no></span>)</span>:</p>`);
        [searchHeading, searchText, resultCount] = resultPanel.querySelectorAll('[translate-merge],[translate-hold]')
        resultCountEl = resultCount.closest('[result-count]')
        search.hist[str] = { resultPanel, searchHeading, searchText, resultCountEl, resultCount }
        searchText.innerText = str
        searchText.scrollIntoView()
        switchLang(searchText)
      }
      const bub = resultPanel.insertAdjacentElement('beforeend', new cfBubbles())
      const res = await _api.googleSearch(str).catch(e => {
        search.hist[str]._netErr = true
        _console.log(e).id = 'ggsNetErr'
        _promptAboutInstallGM && _promptAboutInstallGM(!window.CORSViaGM)
      })
      bub.remove()
      if (_misspell && !_remiss) {
        searchHeading.insertAdjacentHTML('beforeend', '<span undo style=\'cursor:pointer\'>[Undo]</span>')
        searchHeading.querySelector('[undo]').addEventListener('click', function () {
          this.remove()
          search(_misspell._weird, { _misspell: search.hist[str], _remiss: true })
        })
      }
      if (!res) return
      delete search.hist[str]._netErr
      removeChilds(_console, '#ggsNetErr')
      resultCountEl.classList.remove('hide')
      resultCount.innerText = res.length
      if (res.otherInfo.taw) {
        resultPanel.insertAdjacentElement('afterbegin', res.otherInfo.taw)
        search.hist[str]._weird = str
        resultPanel.querySelector('#taw').addEventListener('click', ({ target: a }) => {
          if (a.localName !== 'a') return
          search(qBox.value = a.innerText, { _misspell: search.hist[str] })
        })
      }
      res.forEach(([link, title, excerpt], i) => setTimeout(() => {
        resultPanel.insertAdjacentHTML('beforeend', `
      <div class=search-card>
        <a link href=${link}>${decodeURI(link)
            .replace(/(?<=\/\/)[^/]+(?=\/)/, `<span domain>$&</span>`)
            .replace(/(?<=\/\/)(<span domain>)(www\d*\.)/, '$2$1')
            .replace(/\/$/, '')}</a>
        <span title>${title}</span>
        <span excerpt>${excerpt}</span>
      </div>
    `)
      }, i * 100))
    }
    search.hist = {}
    const isSNInRange = SN => 0 < SN && SN < 1000
    const observe_sentinel = () => {
      const ob = new IntersectionObserver(([inter]) => {
        inftyScroll.able && inter.isIntersecting && lastID && loadImgSec(lastID)
        ob.disconnect()
        new IntersectionObserver(async ([inter]) => {
          if (banR18._checked
            || qBox.classList.contains('code')
            || !inftyScroll.able || inftyScroll.locking
            || window._something_is_fadeouting
            || !imgPanel.className.includes('active')
            || inter.intersectionRatio <= 0
          ) return
          if (!(lastID && isSNInRange(idInfo(lastID)['Serial Number']))) return lastID !== undefined && msg('The current series is exhausted (the serial number is out of range)', 'series-exhausted')
          incrLastID()
          imgPanel.childElementCount && lastID === imgPanel.lastElementChild.id && incrLastID()
          qInputOld.push(lastID)
          loadImgSec(lastID)
          imgPanel.lastElementChild.scrollIntoView(false)
          inftyScroll.softLock(300)
        }).observe(sentinel)
      })
      ob.observe(sentinel)
    }
    tabGroup.addEventListener('click', observe_sentinel, { once: true })
    console.log('Program started!')
  }()
}