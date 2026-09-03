// Иконка сайта из эмблемы логотипа. Границы эмблемы сняты замером ink-профиля
// (колонки 0..51, строки 0..65), а не на глаз: правее — чистый разрыв в 7 колонок,
// дальше начинается текст «МАЛМЫЖСКИЙ РЕМЗАВОД».
import sharp from 'sharp'
import fs from 'fs/promises'

const SRC = 'public/images/logo.png'
const EMB = { left: 0, top: 0, width: 52, height: 66 }
const PAD = 4 // поля вокруг эмблемы, чтобы не липла к краям тайла

// Квадрат: эмблема выше, чем шире, — добираем по бокам, а не режем по высоте.
const side = EMB.height + PAD * 2
const sideways = Math.round((side - EMB.width) / 2)

const square = await sharp(SRC)
  .extract(EMB)
  .extend({
    top: PAD,
    bottom: side - EMB.height - PAD,
    left: sideways,
    right: side - EMB.width - sideways,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  // Фон белый, а не прозрачный: эмблема тёмная, и на тёмной панели вкладок
  // прозрачный вариант сливался бы с фоном.
  .flatten({ background: '#ffffff' })
  .png()
  .toBuffer()

const png = async (size) =>
  sharp(square).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()

const icon = await png(64)
await fs.writeFile('src/app/icon.png', icon)

// ICO-контейнер с PNG внутри (поддерживается всеми живыми браузерами): 6 байт
// заголовка + 16 байт записи каталога + сам PNG. Нужен ради запроса /favicon.ico,
// который клиенты шлют сами, не глядя на <link>.
const ico32 = await png(32)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // count
const entry = Buffer.alloc(16)
entry[0] = 32 // width
entry[1] = 32 // height
entry[2] = 0 // палитра не используется
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(ico32.length, 8)
entry.writeUInt32LE(header.length + entry.length, 12)
await fs.writeFile('src/app/favicon.ico', Buffer.concat([header, entry, ico32]))

console.log(`квадрат ${side}x${side}; icon.png 64x64 — ${icon.length} Б; favicon.ico 32x32 — ${ico32.length + 22} Б`)
