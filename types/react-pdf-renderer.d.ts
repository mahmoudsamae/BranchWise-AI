declare module "@react-pdf/renderer" {
  import type { ReactElement, ReactNode } from "react";

  export const Document: (props: { children?: ReactNode }) => ReactElement;
  export const Page: (props: { size?: string; style?: object; children?: ReactNode }) => ReactElement;
  export const Text: (props: { style?: object; children?: ReactNode }) => ReactElement;
  export const View: (props: { style?: object; children?: ReactNode }) => ReactElement;

  export const StyleSheet: {
    create: <T extends Record<string, object>>(styles: T) => T;
  };

  export function renderToBuffer(element: ReactElement): Promise<Uint8Array>;
}
