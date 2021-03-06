/*
 * Copyright 2018-19 IBM Corporation
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

import Debug from 'debug'
import { basename, dirname } from 'path'

import { isHeadless, findFile, expandHomeDir, i18n, Arguments, Registrar, KResponse } from '@kui-shell/core'

import { FStat } from './fstat'
import markdownify from './markdown'
import { localFilepath } from './usage-helpers'

const strings = i18n('plugin-bash-like')
const debug = Debug('plugins/bash-like/cmds/open')

/**
 * Decide how to display a given filepath
 *
 */
async function open({ tab, argvNoOptions, REPL }: Arguments): Promise<KResponse> {
  const filepath = argvNoOptions[argvNoOptions.indexOf('open') + 1]
  debug('open', filepath)

  const fullpath = findFile(expandHomeDir(filepath))
  const suffix = filepath.substring(filepath.lastIndexOf('.') + 1)

  if (
    suffix === 'js' ||
    suffix === 'ts' ||
    suffix === 'go' ||
    suffix === 'txt' ||
    suffix === 'swift' ||
    suffix === 'py' ||
    suffix === 'json' ||
    suffix === 'yaml'
  ) {
    // open json and javascript files in the editor
    return REPL.qexec(`edit "${filepath}"`)
  } else if (
    suffix === 'png' ||
    suffix === 'jpg' ||
    suffix === 'jpeg' ||
    suffix === 'tiff' ||
    suffix === 'tif' ||
    suffix === 'gif' ||
    suffix === 'icns' ||
    suffix === 'ico' ||
    suffix === 'webp' ||
    suffix === 'bpg' ||
    suffix === 'svg' ||
    suffix === 'mov' ||
    suffix === 'mp4' ||
    suffix === 'ogg' ||
    suffix === 'mp3'
  ) {
    // open binary/imag fields in a separate window
    window.open(fullpath, 'target=_blank')
    return true
  } else if (suffix === 'pkl' || suffix === 'sab') {
    throw new Error('Opening of binary files not supported')
  } else {
    const stats = (await REPL.rexec<FStat>(`fstat ${REPL.encodeComponent(filepath)} --with-data`)).content

    if (stats.isDirectory) {
      debug('trying to open a directory; delegating to ls')
      return REPL.qexec(`ls ${REPL.encodeComponent(filepath)}`)
    } else {
      const enclosingDirectory = dirname(filepath)

      let data: string | Element = stats.data
      let name = basename(filepath)
      let packageName = enclosingDirectory === '.' ? undefined : enclosingDirectory

      if ((suffix === 'adoc' || suffix === 'md') && !isHeadless()) {
        const { title, body } = await markdownify(tab, suffix, data, fullpath)

        data = body

        if (title) {
          // use the first <h1> as the sidecar title
          // and use the filename as the "packageName" subtitle
          packageName = name
          name = title.innerText
        }
      }

      return {
        type: 'custom',
        kind: 'file',
        metadata: {
          name,
          namespace: packageName
        },
        contentType: suffix === 'sh' ? 'shell' : suffix,
        content: data
      }
    }
  }
}

const usage = {
  strict: 'open',
  command: 'open',
  title: strings('openUsageTitle'),
  header: strings('openUsageHeader'),
  optional: localFilepath
}

/**
 * Register command handlers
 *
 */
export default (registrar: Registrar) => {
  registrar.listen('/open', open, { usage, needsUI: true, inBrowserOk: true })
}
