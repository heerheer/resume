/**
 * 纯 TS 实现的 MD5（RFC 1321），浏览器端可用（无 Node crypto 依赖）。
 * 用于云同步时对简历 JSON 数据计算摘要，与服务端（node:crypto）结果保持一致。
 */

// 每轮循环左移位数表
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

// 常量表 K[i] = floor(abs(sin(i+1)) * 2^32)
const K = new Int32Array(64)
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)
}

function toHexLE(x: number): string {
  let h = ""
  for (let i = 0; i < 4; i++) {
    h += ((x >>> (i * 8)) & 0xff).toString(16).padStart(2, "0")
  }
  return h
}

export function md5(input: string): string {
  const msg = new TextEncoder().encode(input)
  const bitLen = msg.length * 8

  // 填充至 64 字节对齐：0x80 + 0 填充 + 8 字节小端长度
  const padded = new Uint8Array((((msg.length + 8) >> 6) + 1) << 6)
  padded.set(msg)
  padded[msg.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, bitLen >>> 0, true)
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const M = new Int32Array(16)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getInt32(off + i * 4, true)

    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F: number, g: number
      if (i < 16) {
        F = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        F = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        F = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      F = (F + A + K[i] + M[g]) | 0
      A = D
      D = C
      C = B
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0
    }

    a0 = (a0 + A) | 0
    b0 = (b0 + B) | 0
    c0 = (c0 + C) | 0
    d0 = (d0 + D) | 0
  }

  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0)
}
