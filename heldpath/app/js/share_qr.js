import qrcode from "qrcode-generator";

/** SVG QR code for a share URL. Medium error correction, auto version. */
export function qrSvg(text, { cell = 4, margin = 2 } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(text || ""), "Byte");
  qr.make();
  return qr.createSvgTag(cell, margin);
}
