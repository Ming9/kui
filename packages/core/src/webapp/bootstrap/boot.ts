/*
 * Copyright 2018 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// we don't want to treat this file as a script;
// adding this bit tells tsc to treat this source as a module, rather than a script
// otherwise, we'd get conflicts with electron.ts, which *is* a script, rather than a module
// https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files

function catastrophe(err: Error) {
  console.error('restart needed')
  console.error(err)
  document.body.classList.add('oops-total-catastrophe')
}

async function initCommandRegistrar() {
  const { init } = await import('../../commands/tree')
  await init()
}

/* function rels() {
  const links = document.querySelectorAll('link')
  for (let idx = 0; idx < links.length; idx++) {
    const link = links[idx]
    const rel = link.getAttribute('rel')
    if (rel === 'preload' || rel === 'prefetch') {
      link.rel = 'stylesheet'
    }
  }
} */

// note: the q npm doesn't like functions called "bootstrap"!
const domReady = () => async () => {
  const initializer = import('./init')
  const plugins = import('../../plugins/plugins')
  const cli = import('../../webapp/cli-init')
  const sidecarInit = import('../views/sidecar-init')
  const events = import('../../core/events')
  // const query = import('../query')

  try {
    const waitForThese: Promise<void>[] = []

    const commands = initCommandRegistrar()

    waitForThese.push(
      plugins.then(async _ => {
        await _.init()
        await commands
        await _.preload()
      })
    )

    waitForThese.push(
      (document.body.classList.contains('in-electron')
        ? import(/* webpackChunkName: "electron" */ /* webpackMode: "lazy" */ '../electron-events').then(_ => _.init())
        : Promise.resolve()
      )
        .then(() => cli)
        .then(_ => _.default())
    )

    sidecarInit.then(_ => _.default())

    waitForThese.push(waitForThese[1].then(() => initializer).then(_ => _.init()))

    // await query.then(_ => _.init())

    await Promise.all(waitForThese)

    document.body.classList.remove('still-loading')
    events.then(eventBus => eventBus.default.emit('/init/done'))
  } catch (err) {
    catastrophe(err)
  }
}

export default async () => {
  // rels()
  import('./init').then(_ => _.preinit())

  window.addEventListener('load', domReady(), { once: true })
}
