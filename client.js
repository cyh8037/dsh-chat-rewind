/**
 * dsh-chat-rewind — client half.
 *
 * Double-click one of your own messages to edit it. Confirming creates a new
 * conversation branch cut right before that message and sends the edited text
 * there, so the following turns are regenerated. Files are never touched.
 */
window.__ModuleLoader__.load({
  id: 'dsh-chat-rewind',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    let ReactDOM
    try {
      ReactDOM = require('react-dom')
    } catch {
      ReactDOM = undefined
    }

    const NS = 'chat-rewind'
    const ARCHIVE_KEY = 'dsh-chat-rewind:archive-source'
    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

    const DICT = {
      en: {
        editTitle: 'Edit this message',
        cancel: 'Cancel',
        send: 'Send',
        sending: 'Sending…',
        empty: 'Type something first.',
        edit: 'Edit',
        copy: 'Copy',
        copied: 'Copied',
        archiveSource: 'Archive original',
        forkFailed: 'Could not start a branch here',
        sendFailed: 'Branch created, but the message could not be sent',
        removeImage: 'Remove image',
        imageLoadFailed: 'Could not read an image from the original message',
        tooManyImages: 'Too many images for one message.',
        imageTooLarge: 'One image is larger than the limit.',
        totalImagesTooLarge: 'The images together exceed the size limit.',
      },
      zh: {
        editTitle: '编辑消息',
        cancel: '取消',
        send: '发送',
        sending: '发送中…',
        empty: '内容不能为空。',
        edit: '编辑',
        copy: '复制',
        copied: '已复制',
        archiveSource: '归档原会话',
        forkFailed: '无法在此处创建分支',
        sendFailed: '分支已创建，但消息发送失败',
        removeImage: '移除图片',
        imageLoadFailed: '读取图片失败',
        tooManyImages: '图片数量超过单条消息的上限。',
        imageTooLarge: '有图片超过单张大小上限。',
        totalImagesTooLarge: '图片总大小超过上限。',
      },
    }

    function readArchivePreference() {
      try {
        const stored = window.localStorage.getItem(ARCHIVE_KEY)
        return stored === null ? true : stored === '1'
      } catch {
        return true
      }
    }

    function writeArchivePreference(value) {
      try {
        window.localStorage.setItem(ARCHIVE_KEY, value ? '1' : '0')
      } catch {
        /* storage is best effort */
      }
    }

    /** Base64 payload of one blob, without the data-URL prefix. */
    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result : ''
          const comma = text.indexOf(',')
          resolve(comma < 0 ? '' : text.slice(comma + 1))
        }
        reader.onerror = () => reject(reader.error || new Error('read failed'))
        reader.readAsDataURL(blob)
      })
    }

    function isImageMediaType(value) {
      return IMAGE_TYPES.includes(value)
    }

    /* Tokens, sizes, and paddings follow the host Button, Switch, Tooltip, and
       message-action rules so the row keeps the shipped visual language. */
    const CSS = `
.dshcr-row{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:0}
.dshcr-row.is-editing{align-items:flex-end;width:100%}
.dshcr-editor{display:flex;flex-direction:column;gap:8px;width:100%;max-width:min(calc(var(--dsh-chat-content-width,748px) * .702),82%);box-sizing:border-box;padding:11px 12px 10px;border-radius:14px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 1px 0 rgba(0,0,0,.12)}
.dshcr-ta{display:block;width:100%;box-sizing:border-box;min-height:44px;max-height:none;overflow-y:hidden;resize:none;padding:2px;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.55}
.dshcr-ta::placeholder{color:var(--dsw-alias-label-tertiary)}
.dshcr-attach{display:flex;align-items:stretch;gap:10px;overflow:auto hidden;scrollbar-width:none;padding:2px 0 0}
.dshcr-thumb-wrap{position:relative;flex:none;box-sizing:border-box;width:64px;height:64px;padding:0;border:.5px solid var(--dsw-alias-border-l2-darkmode-thin,var(--dsw-alias-border-l2));border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-interactive-bg-hover);overflow:hidden}
.dshcr-thumb{display:block;width:100%;height:100%;object-fit:cover;padding:0;border:0;border-radius:0;background:transparent}
.dshcr-thumb-x{position:absolute;top:4px;right:4px;z-index:1;corner-shape:round;display:grid;place-items:center;width:18px;height:18px;padding:0;border:none;border-radius:50%;background:var(--dsw-alias-button-contrast-fill,#000000b8);color:var(--dsw-alias-label-primary-inverted,#fff);line-height:0;cursor:pointer;opacity:0;transition:opacity .2s ease-in-out}
.dshcr-thumb-wrap:hover .dshcr-thumb-x,.dshcr-thumb-x:focus-visible{opacity:1}
@media (hover:none){.dshcr-thumb-x{opacity:1}}
.dshcr-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dshcr-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.dshcr-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:none;border-radius:var(--dsw-radius-sm);cursor:pointer;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:transparent;box-shadow:inset 0 0 0 var(--dsh-hairline-width,.5px) var(--dsh-button-outline-color,var(--dsw-alias-border-l3))}
.dshcr-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dshcr-btn.is-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);box-shadow:none}
.dshcr-btn.is-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.dshcr-btn:disabled{opacity:.5;cursor:default}
.dshcr-btn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dshcr-switch{display:inline-flex;align-items:center;gap:7px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}
.dshcr-switch:hover{color:var(--dsw-alias-label-primary)}
.dshcr-track{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:none;border-radius:999px;background:var(--dsw-alias-border-l3);transition:background .12s}
.dshcr-switch.is-on .dshcr-track{background:var(--dsw-alias-brand-primary)}
.dshcr-knob{display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb,var(--dsw-alias-label-secondary));transition:transform .12s ease}
.dshcr-switch.is-on .dshcr-knob{transform:translate(16px);background:var(--dsw-alias-label-primary-foreground)}
.dshcr-switch:focus-visible .dshcr-track{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dshcr-err{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:17px;word-break:break-word}
.dshcr-plain{max-width:100%;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
.dshcr-meta{display:flex;align-items:center;gap:8px;height:calc(28px + var(--dsh-content-font-delta,0px));opacity:1;transition:opacity 80ms}
@media (hover:hover){
:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~ :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])) .dshcr-meta{opacity:0}
:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~ :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):hover .dshcr-meta,:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~ :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):focus-within .dshcr-meta{opacity:1}
}
.dshcr-time{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);white-space:nowrap;padding-right:12px}
.dshcr-action{box-sizing:border-box;width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));padding:6px;border:none;border-radius:var(--dsw-radius-sm);display:inline-flex;align-items:center;justify-content:center;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dshcr-action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}
.dshcr-action:hover,.dshcr-action:focus-visible{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshcr-anchor{display:inline-flex;flex:0 0 auto;position:relative}
.dshcr-tip.is-local{position:absolute;left:auto;top:auto;right:0;bottom:calc(100% + 6px);transform:none}
.dshcr-tip{position:fixed;z-index:1100;left:0;top:0;width:max-content;box-sizing:border-box;max-width:min(50vw,calc(100vw - 24px));max-height:calc(100vh - 24px);padding:3px 7px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg,#2b2b2b);color:var(--dsw-static-neutral-bluish-00,#fff);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:dshcr-tip-in .15s var(--ds-ease-in-out)}
@keyframes dshcr-tip-in{0%{opacity:0}100%{opacity:1}}
`

    /** Split user content into text, attachments, and any other blocks. */
    function contentParts(content) {
      const texts = []
      const attachments = []
      const rest = []
      for (const block of Array.isArray(content) ? content : []) {
        if (block && block.type === 'text' && typeof block.text === 'string') texts.push(block.text)
        else if (block && block.type === 'image' && block.attachment !== undefined) attachments.push({ type: 'image', image: { attachment: block.attachment }, offloaded: block.offloaded === true })
        else if (block && block.type === 'file' && block.attachment !== undefined) attachments.push({ type: 'file', file: block.attachment })
        else rest.push(block)
      }
      return { text: texts.join(''), attachments, rest }
    }

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    /** Timestamp label matching the shipped message clock: 24h, locale date. */
    function formatClock(time, localeId) {
      if (typeof time !== 'number' || !Number.isFinite(time)) return ''
      const date = new Date(time)
      const now = new Date()
      const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
      const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      if (sameDay) return clock
      const options =
        date.getFullYear() === now.getFullYear()
          ? { month: 'short', day: 'numeric' }
          : { year: 'numeric', month: 'short', day: 'numeric' }
      try {
        return `${date.toLocaleDateString(localeId === 'zh' ? 'zh-CN' : 'en-US', options)} ${clock}`
      } catch {
        return `${date.getMonth() + 1}/${date.getDate()} ${clock}`
      }
    }

    /** Clipboard write with the legacy execCommand fallback. */
    async function writeClipboard(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {
        /* fall through to the legacy path */
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.top = '0'
        area.style.left = '0'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      } catch {
        return false
      }
    }

    function IconCopy() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false', fill: 'none' },
        h('rect', { x: '1.52075', y: '4.07373', width: '10.3932', height: '10.3932', rx: 2, stroke: 'currentColor', strokeWidth: 1 }),
        h('path', {
          d: 'M11.9792 1.53296C13.36 1.53296 14.4792 2.65225 14.4792 4.03296V9.42847C14.4792 10.3756 13.9521 11.1987 13.1755 11.6228V10.3298C13.3652 10.0787 13.4792 9.7674 13.4792 9.42847V4.03296C13.4792 3.20453 12.8077 2.53296 11.9792 2.53296H6.58374C6.27966 2.53301 5.99684 2.6235 5.7605 2.77905H4.42358C4.85652 2.03463 5.66056 1.53304 6.58374 1.53296H11.9792Z',
          fill: 'currentColor',
        }),
      )
    }

    function IconCheck() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false', fill: 'none' },
        h('path', {
          d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4',
          stroke: 'currentColor',
          strokeWidth: 1,
        }),
      )
    }

    function IconEdit() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false', fill: 'none' },
        h('path', { d: 'M9.2 3.6 10.7 2a1.9 1.9 0 0 1 2.7 0l.6.6a1.9 1.9 0 0 1 0 2.7L12.4 6.8M9.2 3.6 3 9.8l-.8 3.4c-.1.5.3.9.8.8L6.4 13l6.2-6.2M9.2 3.6l3.2 3.2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function IconClose() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M3.5 3.5L12.5 12.5', stroke: 'currentColor', strokeWidth: 1 }),
        h('path', { d: 'M12.5 3.5L3.5 12.5', stroke: 'currentColor', strokeWidth: 1 }),
      )
    }

    /**
     * Host-style tooltip: fixed bubble below the trigger, portaled so the
     * transcript's overflow cannot clip it.
     */
    function Tip(props) {
      const wrapRef = React.useRef(null)
      const bubbleRef = React.useRef(null)
      const [anchor, setAnchor] = React.useState(null)
      const show = React.useCallback(() => {
        const element = wrapRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        setAnchor({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
      }, [])
      const hide = React.useCallback(() => setAnchor(null), [])
      React.useEffect(() => {
        if (anchor === null) return undefined
        window.addEventListener('scroll', hide, true)
        window.addEventListener('resize', hide)
        return () => {
          window.removeEventListener('scroll', hide, true)
          window.removeEventListener('resize', hide)
        }
      }, [anchor, hide])
      React.useLayoutEffect(() => {
        const element = bubbleRef.current
        if (anchor === null || !element) return
        const rect = element.getBoundingClientRect()
        const pad = 8
        const half = rect.width / 2
        const left = Math.min(Math.max(anchor.x, half + pad), Math.max(half + pad, window.innerWidth - half - pad))
        let top = anchor.bottom + 6
        if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, anchor.top - 6 - rect.height)
        element.style.left = `${left}px`
        element.style.top = `${top}px`
      }, [anchor])
      const canPortal = anchor !== null && typeof document !== 'undefined' && ReactDOM && typeof ReactDOM.createPortal === 'function'
      const bubble =
        anchor === null
          ? null
          : !canPortal
            ? h('div', { className: 'dshcr-tip is-local' }, props.label)
            : ReactDOM.createPortal(
              h(
                'div',
                {
                  ref: bubbleRef,
                  className: 'dshcr-tip',
                  style: { left: `${anchor.x}px`, top: `${anchor.bottom + 6}px`, transform: 'translate(-50%,0)' },
                },
                props.label,
              ),
              document.body,
            )
      return h(
        'span',
        {
          ref: wrapRef,
          className: 'dshcr-anchor',
          onMouseEnter: show,
          onMouseLeave: hide,
          onFocus: show,
          onBlur: hide,
        },
        props.children,
        bubble,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const normalizeLocale = (value) => (typeof value === 'string' && value.toLowerCase().startsWith('zh') ? 'zh' : 'en')
        const localeState = { id: 'zh', listeners: new Set() }
        let tr = (key) => DICT.zh[key] || DICT.en[key] || key
        let locale = null
        try {
          locale = ctx.get('locale')
        } catch {
          locale = null
        }
        if (locale) {
          // Register inside an effect: a client-plugin reload must dispose the
          // previous namespace instead of colliding with it.
          ctx.effect(() => {
            try {
              const dispose = locale.register(NS, { en: DICT.en, zh: DICT.zh })
              return typeof dispose === 'function' ? dispose : () => {}
            } catch (error) {
              console.warn('[chat-rewind] locale namespace already registered; reusing it', error)
              return () => {}
            }
          })
          try {
            const bound = locale.bind(NS)
            const snapshot = locale.getLocale ? locale.getLocale() : undefined
            if (snapshot && typeof snapshot.id === 'string') localeState.id = normalizeLocale(snapshot.id)
            if (typeof bound === 'function') {
              tr = (key) => {
                const value = bound(key)
                if (typeof value === 'string' && value !== key) return value
                const dict = DICT[localeState.id]
                return dict && dict[key] !== undefined ? dict[key] : DICT.en[key] || key
              }
            }
          } catch (error) {
            console.warn('[chat-rewind] locale binding failed', error)
          }
        }
        ctx.effect(() =>
          ctx.on('locale/change', (snapshot) => {
            const next = snapshot && typeof snapshot.id === 'string' ? normalizeLocale(snapshot.id) : localeState.id
            if (next === localeState.id) return
            localeState.id = next
            for (const listener of localeState.listeners) listener()
          }),
        )
        let disposeEntry = null
        let bailed = false
        function bail(reason) {
          if (bailed) return
          bailed = true
          console.warn(`[chat-rewind] slot contract check failed (${reason}); restoring the official user renderer`)
          const dispose = disposeEntry
          disposeEntry = null
          if (typeof dispose === 'function') {
            try {
              dispose()
            } catch (error) {
              console.error('chat-rewind: could not restore the official renderer', error)
            }
          }
        }

        function useLocaleId() {
          const [id, setId] = React.useState(localeState.id)
          React.useEffect(() => {
            const listener = () => setId(localeState.id)
            localeState.listeners.add(listener)
            setId(localeState.id)
            return () => {
              localeState.listeners.delete(listener)
            }
          }, [])
          return id
        }

        if (typeof document !== 'undefined') {
          const tag = document.createElement('style')
          tag.dataset.plugin = 'dsh-chat-rewind'
          tag.textContent = CSS
          document.head.appendChild(tag)
          ctx.effect(() => () => {
            tag.remove()
          })
        }

        const sessionsOf = () => ctx.get('sessions')
        const uiOf = () => ctx.get('uiWorkspace')

        /** Encode the carried durable images and the newly added files. */
        async function encodeImages(refs, files, loadImage) {
          const fromRefs = await Promise.all(
            (Array.isArray(refs) ? refs : []).map(async (ref) => {
              if (!ref || typeof ref.attachmentId !== 'string') return null
              try {
                if (typeof loadImage !== 'function') throw new Error('no loader')
                const url = await loadImage(ref)
                if (!url) throw new Error('no url')
                const blob = await (await fetch(url)).blob()
                const data = await blobToBase64(blob)
                if (!data) throw new Error('empty image')
                return { type: 'image', mediaType: ref.mediaType, data, ...(ref.name === undefined ? {} : { name: ref.name }) }
              } catch {
                throw new Error(tr('imageLoadFailed'))
              }
            }),
          )
          const fromFiles = await Promise.all(
            (Array.isArray(files) ? files : []).map(async (file) => {
              try {
                if (!file || !isImageMediaType(file.type)) throw new Error('type')
                const data = await blobToBase64(file)
                if (!data) throw new Error('empty image')
                return { type: 'image', mediaType: file.type, data, ...(file.name ? { name: file.name } : {}) }
              } catch {
                throw new Error(tr('imageLoadFailed'))
              }
            }),
          )
          return [...fromRefs, ...fromFiles].filter((part) => part !== null)
        }

        /**
         * Cut a branch right before `seq`, open it, send `text` there, and
         * optionally archive the source once the message is admitted.
         * @returns the new session id.
         */
        async function restartFrom(sessionId, seq, text, archiveSource, imageRefs, imageFiles, loadImage) {
          const sessions = sessionsOf()
          if (!sessions || typeof sessions.fork !== 'function') throw new Error(tr('forkFailed'))
          const seqNumber = Number(seq)
          if (!Number.isFinite(seqNumber) || seqNumber < 0) throw new Error(tr('forkFailed'))
          // Encode images before cutting a branch, so a read failure never
          // leaves the user on an empty branch.
          const carried = await encodeImages(imageRefs, imageFiles, loadImage)
          const atSeq = Math.max(0, Math.floor(seqNumber) - 1)
          let childId
          try {
            childId = await sessions.fork({ sessionId, atSeq, increaseTitle: false })
          } catch (error) {
            throw new Error(`${tr('forkFailed')}: ${error && error.message ? error.message : error}`)
          }
          if (!childId) throw new Error(tr('forkFailed'))
          const ui = uiOf()
          // Admit the message first: a refusal must reach the still-mounted
          // editor instead of leaving the user on an empty branch.
          try {
            await sessions.using(
              // Ordinary sessions must be addressed by id: passing an address
              // object makes the client treat the child as a subagent and route
              // the prompt through subagents/prompt.
              childId,
              { source: NS },
              async (reference) => {
                const target = reference && reference.binding ? reference.binding.session : undefined
                if (!target || typeof target.prompt !== 'function') throw new Error(tr('sendFailed'))
                const content = [...carried, { type: 'text', text }]
                const result = await target.prompt(content, 'queue')
                if (!result || result.ok !== true) {
                  const detail = result && result.error ? result.error.message || result.error.code : ''
                  throw new Error(detail || tr('sendFailed'))
                }
              },
            )
          } catch (error) {
            // The branch exists but never received the message: archive it so
            // the sidebar does not accumulate duplicate empty branches.
            if (ui && typeof ui.archiveSession === 'function') {
              try {
                await ui.archiveSession(childId)
              } catch (archiveError) {
                console.error('chat-rewind: could not archive the unused branch', archiveError)
              }
            }
            throw new Error(`${tr('sendFailed')}: ${error && error.message ? error.message : error}`)
          }
          let opened = false
          if (ui && typeof ui.openSession === 'function') {
            try {
              ui.openSession(childId)
              opened = true
            } catch (error) {
              console.error('chat-rewind: could not open the new branch', error)
            }
          }
          // Never archive the source while it is still the main view: that
          // would clear the view and leave the user without the new branch.
          if (opened && archiveSource && ui && typeof ui.archiveSession === 'function') {
            try {
              await ui.archiveSession(sessionId, { stopActivity: true })
            } catch (error) {
              console.error('chat-rewind: could not archive the source session', error)
            }
          }
          return childId
        }

        /** One inline editor at a time across the whole transcript. */
        const activeEditor = { key: null, listeners: new Set() }
        function setActiveEditor(key) {
          if (activeEditor.key === key) return
          activeEditor.key = key
          for (const listener of activeEditor.listeners) listener()
        }
        function useActiveEditor() {
          const [key, setKey] = React.useState(activeEditor.key)
          React.useEffect(() => {
            const listener = () => setKey(activeEditor.key)
            activeEditor.listeners.add(listener)
            setKey(activeEditor.key)
            return () => {
              activeEditor.listeners.delete(listener)
            }
          }, [])
          return key
        }

        /** Editable image strip: carried durable images plus newly added files. */
        function EditorImages(props) {
          const refs = props.refs
          const [urls, setUrls] = React.useState([])
          const loadRef = React.useRef(props.loadImage)
          loadRef.current = props.loadImage
          React.useEffect(() => {
            if (!Array.isArray(refs) || refs.length === 0 || typeof loadRef.current !== 'function') {
              setUrls([])
              return undefined
            }
            let alive = true
            Promise.all(
              refs.map((ref) =>
                Promise.resolve()
                  .then(() => loadRef.current(ref))
                  .catch(() => null),
              ),
            ).then((list) => {
              if (alive) setUrls(list)
            })
            return () => {
              alive = false
            }
          }, [refs])
          const items = []
          refs.forEach((ref, index) => {
            const url = urls[index]
            if (typeof url !== 'string' || url === '') return
            items.push(
              h(
                'div',
                { key: `ref:${ref.attachmentId}`, className: 'dshcr-thumb-wrap' },
                h('img', { className: 'dshcr-thumb', src: url, alt: '' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshcr-thumb-x',
                    'aria-label': tr('removeImage'),
                    onClick: () => props.onRemoveRef(ref),
                  },
                  h(IconClose),
                ),
              ),
            )
          })
          for (const item of props.added) {
            items.push(
              h(
                'div',
                { key: `add:${item.key}`, className: 'dshcr-thumb-wrap' },
                h('img', { className: 'dshcr-thumb', src: item.url, alt: '' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshcr-thumb-x',
                    'aria-label': tr('removeImage'),
                    onClick: () => props.onRemoveAdded(item),
                  },
                  h(IconClose),
                ),
              ),
            )
          }
          if (items.length === 0) return null
          return h('div', { className: 'dshcr-attach' }, items)
        }

        function UserMessageRowBody(props) {
          const node = props.node
          const data = (node && node.data) || {}
          const parts = React.useMemo(() => contentParts(data.content), [data.content])
          const prepared = React.useMemo(
            () => ({
              text: parts.text,
              attachments: parts.attachments,
              extraBlocks: parts.rest,
              ...(data.referenceLabels === undefined ? {} : { referenceLabels: data.referenceLabels }),
            }),
            [parts, data.referenceLabels],
          )
          const imageRefs = React.useMemo(
            () =>
              parts.attachments
                .filter((part) => part.type === 'image' && part.offloaded !== true && part.image && part.image.attachment)
                .map((part) => part.image.attachment),
            [parts],
          )
          const fileCount = React.useMemo(() => parts.attachments.filter((part) => part.type === 'file').length, [parts])
          const facts = React.useMemo(
            () => ({
              ...(data.referenceLabels === undefined ? {} : { sessionLabels: data.referenceLabels }),
              ...(data.skillNames === undefined ? {} : { skillNames: data.skillNames }),
            }),
            [data.referenceLabels, data.skillNames],
          )

          const [editing, setEditing] = React.useState(false)
          const [draft, setDraft] = React.useState('')
          const [busy, setBusy] = React.useState(false)
          const [error, setError] = React.useState('')
          const [copied, setCopied] = React.useState(false)
          const [archive, setArchive] = React.useState(() => readArchivePreference())
          const [removedKeys, setRemovedKeys] = React.useState([])
          const [added, setAdded] = React.useState([])
          const areaRef = React.useRef(null)
          const aliveRef = React.useRef(true)
          const addedRef = React.useRef(added)
          const copyTimer = React.useRef(null)
          const copyingRef = React.useRef(false)
          addedRef.current = added

          const userHasFiles = fileCount > 0
          const localeId = useLocaleId()
          const limits = props.useProjection('imageLimits')
          const myKey = `${props.sessionId}:${node ? node.key : ''}`
          const activeKey = useActiveEditor()
          const inFlight = React.useRef(false)
          const editorRef = React.useRef(null)
          const carriedRefs = React.useMemo(
            () => imageRefs.filter((ref) => !removedKeys.includes(ref.attachmentId)),
            [imageRefs, removedKeys],
          )
          const pendingCount = props.useSession((snapshot) => (snapshot && Array.isArray(snapshot.pendingSubmissions) ? snapshot.pendingSubmissions.length : 0))
          const isSubagent = props.useSession((snapshot) => Boolean(snapshot && snapshot.subagent))
          const editBlocked = userHasFiles || isSubagent
          const pendingAtOpen = React.useRef(pendingCount)

          React.useEffect(
            () => () => {
              aliveRef.current = false
              if (activeEditor.key === myKey) setActiveEditor(null)
              if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
              for (const item of addedRef.current) {
                try {
                  URL.revokeObjectURL(item.url)
                } catch {
                  /* revoke is best effort */
                }
              }
            },
            [],
          )

          React.useLayoutEffect(() => {
            if (!editing || !areaRef.current) return undefined
            const area = areaRef.current
            area.style.height = 'auto'
            area.style.height = `${area.scrollHeight}px`
            return undefined
          }, [editing, draft])

          React.useLayoutEffect(() => {
            if (!editing || !areaRef.current) return undefined
            const area = areaRef.current
            area.focus()
            const end = area.value.length
            try {
              area.setSelectionRange(end, end)
            } catch {
              /* selection is best effort */
            }
            return undefined
          }, [editing])

          const releaseAdded = React.useCallback(() => {
            for (const item of addedRef.current) {
              try {
                URL.revokeObjectURL(item.url)
              } catch {
                /* revoke is best effort */
              }
            }
            addedRef.current = []
            setAdded([])
          }, [])

          const checkImageLimits = React.useCallback(
            (incoming) => {
              if (!limits) return ''
              const maxImages = Number(limits.maxImagesPerMessage)
              const maxBytes = Number(limits.maxImageBytes)
              const maxTotal = Number(limits.maxMessageImageBytes)
              const count = carriedRefs.length + added.length + incoming.length
              if (Number.isFinite(maxImages) && maxImages > 0 && count > maxImages) return tr('tooManyImages')
              let total = 0
              for (const ref of carriedRefs) total += Number(ref.bytes) || 0
              for (const item of added) total += Number(item.file.size) || 0
              for (const file of incoming) {
                if (Number.isFinite(maxBytes) && maxBytes > 0 && file.size > maxBytes) return tr('imageTooLarge')
                total += Number(file.size) || 0
              }
              if (Number.isFinite(maxTotal) && maxTotal > 0 && total > maxTotal) return tr('totalImagesTooLarge')
              return ''
            },
            [limits, carriedRefs, added],
          )

          const beginEdit = React.useCallback(
            (event) => {
              if (busy || editing) return
              if (editBlocked) return
              const target = event && event.target
              if (target && typeof target.closest === 'function' && target.closest('a,button,input,textarea,select,[role="button"],[contenteditable="true"]')) return
              // Nothing textual to edit (image-only messages) — no starting text.
              if (!parts.text.trim()) return
              releaseAdded()
              setRemovedKeys([])
              setDraft(parts.text)
              setError('')
              pendingAtOpen.current = pendingCount
              setActiveEditor(myKey)
              setEditing(true)
            },
            [busy, editing, parts, editBlocked, pendingCount, myKey, releaseAdded],
          )

          const cancel = React.useCallback(() => {
            if (busy) return
            releaseAdded()
            setRemovedKeys([])
            setEditing(false)
            setError('')
            if (activeEditor.key === myKey) setActiveEditor(null)
          }, [busy, myKey, releaseAdded])

          React.useEffect(() => {
            if (!editing) return undefined
            const onMouseDown = (event) => {
              const element = editorRef.current
              if (!element) return
              const target = event.target
              if (target instanceof Node && element.contains(target)) return
              cancel()
            }
            document.addEventListener('mousedown', onMouseDown, true)
            return () => document.removeEventListener('mousedown', onMouseDown, true)
          }, [editing, cancel])

          React.useEffect(() => {
            if (!editing || busy) return
            if (activeKey === myKey) return
            releaseAdded()
            setRemovedKeys([])
            setEditing(false)
            setError('')
          }, [activeKey, editing, busy, myKey, releaseAdded])

          React.useEffect(() => {
            if (!editing || busy) return
            if (pendingCount <= pendingAtOpen.current) return
            // A message went out from the composer: leave the inline editor.
            releaseAdded()
            setRemovedKeys([])
            setEditing(false)
            setError('')
            if (activeEditor.key === myKey) setActiveEditor(null)
          }, [pendingCount, editing, busy, myKey, releaseAdded])

          const submit = React.useCallback(async () => {
            if (inFlight.current || busy) return
            const text = draft.trim()
            if (!text) {
              setError(tr('empty'))
              return
            }
            const problem = checkImageLimits([])
            if (problem) {
              setError(problem)
              return
            }
            inFlight.current = true
            setBusy(true)
            setError('')
            const addedFiles = added.map((item) => item.file)
            try {
              await restartFrom(props.sessionId, data.seq, text, archive, carriedRefs, addedFiles, props.loadImage)
              if (!aliveRef.current) return
              releaseAdded()
              setRemovedKeys([])
              setEditing(false)
              setBusy(false)
              if (activeEditor.key === myKey) setActiveEditor(null)
            } catch (failure) {
              if (!aliveRef.current) return
              setBusy(false)
              setError(failure && failure.message ? failure.message : String(failure))
            } finally {
              inFlight.current = false
            }
          }, [busy, draft, data.seq, props.sessionId, archive, carriedRefs, added, props.loadImage, releaseAdded, checkImageLimits, myKey])

          const onKeyDown = React.useCallback(
            (event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
                return
              }
              if (event.key !== 'Enter') return
              const native = event.nativeEvent
              if (native && native.isComposing) return
              if (event.shiftKey || event.altKey) return
              event.preventDefault()
              submit()
            },
            [cancel, submit],
          )

          const onCopy = React.useCallback(async () => {
            if (copied || copyingRef.current) return
            copyingRef.current = true
            const ok = await writeClipboard(parts.text)
            copyingRef.current = false
            if (!ok || !aliveRef.current) return
            setCopied(true)
            if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
            copyTimer.current = window.setTimeout(() => {
              copyTimer.current = null
              if (aliveRef.current) setCopied(false)
            }, 1000)
          }, [copied, parts.text])

          const toggleArchive = React.useCallback(() => {
            setArchive((current) => {
              const next = !current
              writeArchivePreference(next)
              return next
            })
          }, [])

          const removeRef = React.useCallback((ref) => {
            setRemovedKeys((keys) => (keys.includes(ref.attachmentId) ? keys : [...keys, ref.attachmentId]))
          }, [])

          const removeAdded = React.useCallback((item) => {
            try {
              URL.revokeObjectURL(item.url)
            } catch {
              /* revoke is best effort */
            }
            setAdded((list) => list.filter((entry) => entry.key !== item.key))
          }, [])

          const allowedImageTypes = limits && Array.isArray(limits.mediaTypes) && limits.mediaTypes.length > 0 ? limits.mediaTypes : IMAGE_TYPES

          const addPicked = React.useCallback(
            (files) => {
              const picked = []
              for (const file of files) {
                if (file && allowedImageTypes.includes(file.type)) picked.push(file)
              }
              if (picked.length === 0) return
              const problem = checkImageLimits(picked)
              if (problem) {
                setError(problem)
                return
              }
              const next = picked.map((file, index) => ({
                key: `${Date.now()}:${Math.random().toString(36).slice(2)}:${index}`,
                file,
                url: URL.createObjectURL(file),
              }))
              setError('')
              setAdded((list) => [...list, ...next])
            },
            [checkImageLimits, allowedImageTypes],
          )

          const onPaste = React.useCallback(
            (event) => {
              const clipboard = event.clipboardData
              if (!clipboard) return
              const files = Array.from(clipboard.files || []).filter((file) => isImageMediaType(file.type))
              if (files.length === 0) return
              event.preventDefault()
              addPicked(files)
            },
            [addPicked],
          )

          const onDragOver = React.useCallback((event) => {
            if (!event.dataTransfer) return
            if (Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault()
          }, [])

          const onDrop = React.useCallback(
            (event) => {
              if (!event.dataTransfer) return
              if (!Array.from(event.dataTransfer.types || []).includes('Files')) return
              // Any file drop must be cancelled here: letting a non-image file
              // through makes the browser navigate away from the app.
              event.preventDefault()
              const files = Array.from(event.dataTransfer.files || []).filter((file) => isImageMediaType(file.type))
              if (files.length > 0) addPicked(files)
            },
            [addPicked],
          )

          if (!node) return null

          if (editing) {
            return h(
              'div',
              { className: 'dshcr-row is-editing', 'data-chat-rewind': 'editor' },
              h(
                'div',
                { className: 'dshcr-editor', ref: editorRef, onDragOver, onDrop },
                h(EditorImages, {
                  refs: carriedRefs,
                  added,
                  loadImage: props.loadImage,
                  onRemoveRef: removeRef,
                  onRemoveAdded: removeAdded,
                }),
                h('textarea', {
                  ref: areaRef,
                  className: 'dshcr-ta',
                  value: draft,
                  rows: Math.min(12, Math.max(2, draft.split('\n').length)),
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown,
                  onPaste,
                  spellCheck: false,
                  placeholder: tr('editTitle'),
                  'aria-label': tr('editTitle'),
                }),
                error ? h('div', { className: 'dshcr-err' }, error) : null,
                h(
                  'div',
                  { className: 'dshcr-foot' },
                  h(
                    'button',
                    {
                      type: 'button',
                      role: 'switch',
                      'aria-checked': archive ? 'true' : 'false',
                      className: `dshcr-switch${archive ? ' is-on' : ''}`,
                      onClick: toggleArchive,
                    },
                    h('span', { className: 'dshcr-track' }, h('span', { className: 'dshcr-knob' })),
                    h('span', null, tr('archiveSource')),
                  ),
                  h(
                    'div',
                    { className: 'dshcr-actions' },
                    h('button', { type: 'button', className: 'dshcr-btn', onClick: cancel, disabled: busy }, tr('cancel')),
                    h(
                      'button',
                      { type: 'button', className: 'dshcr-btn is-primary', onClick: submit, disabled: busy || !draft.trim() },
                      busy ? tr('sending') : tr('send'),
                    ),
                  ),
                ),
              ),
            )
          }

          return h(
            'div',
            { className: 'dshcr-row', 'data-chat-rewind': 'user', onDoubleClick: beginEdit },
            props.renderSlotChain
              ? props.renderSlotChain('conversation.chat.user.before', { source: data.source, kind: node.kind }, { fallback: null })
              : null,
            typeof props.renderFactorySlot === 'function'
              ? props.renderFactorySlot('conversation.chat.user.content', {
                  content: prepared,
                  loadImage: props.loadImage,
                  facts,
                  interactive: true,
                })
              : h('div', { className: 'dshcr-plain' }, prepared.text),
            h(
              'div',
              { className: 'dshcr-meta' },
              h('span', { className: 'dshcr-time' }, formatClock(data.time, localeId)),
              h(
                Tip,
                { label: copied ? tr('copied') : tr('copy') },
                h(
                  'button',
                  { type: 'button', className: 'dshcr-action', onClick: onCopy, 'aria-label': copied ? tr('copied') : tr('copy') },
                  copied ? h(IconCheck) : h(IconCopy),
                ),
              ),
              editBlocked
                ? null
                : h(
                    Tip,
                    { label: tr('edit') },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dshcr-action',
                        'aria-label': tr('edit'),
                        onClick: (event) => {
                          event.stopPropagation()
                          beginEdit()
                        },
                      },
                      h(IconEdit),
                    ),
                  ),
            ),
          )
        }

        function UnsupportedRow(props) {
          React.useEffect(() => {
            bail(props.reason)
          }, [props.reason])
          return null
        }

        function UserMessageRow(props) {
          const supported =
            typeof props.renderFactorySlot === 'function' &&
            typeof props.useSession === 'function' &&
            typeof props.useProjection === 'function' &&
            typeof props.sessionId === 'string' &&
            props.node !== undefined &&
            props.node !== null &&
            props.node.data !== undefined
          if (!supported) return h(UnsupportedRow, { reason: 'missing slot props' })
          return h(UserMessageRowBody, props)
        }

        console.info('[chat-rewind] client module applied')
        ctx.effect(() =>
          ctx.slots.inject('conversation.chat.node', () => {
            if (bailed) return () => {}
            try {
              disposeEntry = ctx.slots.register(
                {
                  name: 'conversation.chat.node',
                  key: 'user',
                  priority: -1,
                },
                UserMessageRow,
              )
              return disposeEntry
            } catch (error) {
              console.warn('[chat-rewind] the user renderer is already registered; keeping the existing entry', error)
              return () => {}
            }
          }),
        )
      },
    }
  },
})
