import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdfDocument(element: ReactElement): Promise<Buffer> {
  const buf = await renderToBuffer(element);
  return Buffer.from(buf);
}
