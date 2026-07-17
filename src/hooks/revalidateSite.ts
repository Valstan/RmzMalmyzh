import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: сайт маленький (128 страниц) и целиком строится из pages/faq,
// поэтому после любой правки контента сбрасываем кэш всего дерева разом —
// это дешевле и надёжнее, чем адресная инвалидация по путям.
const revalidateAll = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] content changed → всё дерево')
  safeRevalidatePath('/', 'layout')
}

export const revalidateSite: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateAll(payload)
  return doc
}

export const revalidateSiteDelete: CollectionAfterDeleteHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateAll(payload)
  return doc
}
