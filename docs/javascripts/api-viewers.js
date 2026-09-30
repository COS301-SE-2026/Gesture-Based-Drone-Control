/* Gesture-Based Drone Control — api-viewers.js
 *
 * Mounts Swagger UI and the AsyncAPI renderer on the pages that ask for them,
 * reading the published contracts from <site>/api/{openapi,asyncapi}.yaml.
 *
 * Two constraints shape this file:
 *
 *  1. Material's instant navigation swaps page content without a reload, so
 *     inline <script> tags in a page body are not reliably re-run. Material
 *     exposes the `document$` observable, which emits on every navigation —
 *     that is the supported hook, so mounting happens there.
 *
 *  2. The Swagger UI and AsyncAPI stylesheets are heavy and contain rules that
 *     would fight the site theme on every other page. They are therefore
 *     injected on demand, only when a mount point is actually present.
 */

;(function () {
  "use strict"

  const CDN = {
    swaggerCss:
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0/swagger-ui.css",
    swaggerJs:
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0/swagger-ui-bundle.js",
    asyncapiCss:
      "https://cdn.jsdelivr.net/npm/@asyncapi/react-component@3.2.1/styles/default.min.css",
    asyncapiJs:
      "https://cdn.jsdelivr.net/npm/@asyncapi/react-component@3.2.1/browser/standalone/index.js",
  }

  const pending = {}

  /* The spec URL is read from the page's download link rather than hardcoded:
   * MkDocs rewrites that link for us, so it stays correct whatever
   * `use_directory_urls` is set to and wherever the site is mounted. */
  function specUrl(el) {
    const link = document.getElementById(el.dataset.specLink || "")
    return link ? link.getAttribute("href") : el.dataset.spec
  }

  function loadStyles(href) {
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }

  function loadScript(src) {
    if (pending[src]) return pending[src]
    pending[src] = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = src
      script.crossOrigin = "anonymous"
      script.onload = resolve
      script.onerror = () => reject(new Error(`Failed to load ${src}`))
      document.head.appendChild(script)
    })
    return pending[src]
  }

  function fail(el, label, error) {
    console.error(`[api-viewers] ${label}`, error)
    const href = specUrl(el)
    el.innerHTML =
      '<p class="tx-api-error">The interactive viewer could not be loaded ' +
      "(it is fetched from a CDN, so an offline or restricted network will " +
      'block it). The raw contract is still available: <a href="' +
      href +
      '">download the specification</a>.</p>'
  }

  function mountSwagger(el) {
    if (el.dataset.mounted) return
    el.dataset.mounted = "1"

    loadStyles(CDN.swaggerCss)
    loadScript(CDN.swaggerJs)
      .then(() => {
        window.SwaggerUIBundle({
          url: specUrl(el),
          domNode: el,
          deepLinking: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 3,
          displayRequestDuration: true,
          filter: true,
          persistAuthorization: true,
          tryItOutEnabled: true,
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
        })
      })
      .catch((error) => fail(el, "Swagger UI failed to mount", error))
  }

  function mountAsyncApi(el) {
    if (el.dataset.mounted) return
    el.dataset.mounted = "1"

    loadStyles(CDN.asyncapiCss)
    loadScript(CDN.asyncapiJs)
      .then(() => {
        window.AsyncApiStandalone.render(
          {
            schema: { url: specUrl(el) },
            config: {
              show: { sidebar: false, errors: true },
              expand: { messageExamples: false },
            },
          },
          el
        )
      })
      .catch((error) => fail(el, "AsyncAPI viewer failed to mount", error))
  }

  function mountAll() {
    const swagger = document.querySelector("[data-api-viewer='swagger']")
    if (swagger) mountSwagger(swagger)

    const asyncapi = document.querySelector("[data-api-viewer='asyncapi']")
    if (asyncapi) mountAsyncApi(asyncapi)
  }

  if (typeof window.document$ !== "undefined") {
    window.document$.subscribe(mountAll)
  } else {
    document.addEventListener("DOMContentLoaded", mountAll)
  }
})()