/**
 * WebMap — versão web (browser).
 * Usa <iframe> com srcDoc para renderizar HTML interativo.
 * Comunicação bidirecional via window.postMessage.
 */
import React, { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";

export interface WebMapRef {
  postMessage: (data: string) => void;
}

interface Props {
  html: string;
  onMessage?: (data: string) => void;
  onLoadEnd?: () => void;
  style?: StyleProp<ViewStyle>;
}

const WebMap = forwardRef<WebMapRef, Props>((props, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    postMessage: (data: string) => {
      iframeRef.current?.contentWindow?.postMessage(data, "*");
    },
  }));

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data === "string" && props.onMessage) {
        props.onMessage(event.data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [props.onMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={props.html}
      onLoad={props.onLoadEnd}
      style={{ width: "100%", height: "100%", border: "none" }}
      sandbox="allow-scripts"
    />
  );
});

WebMap.displayName = "WebMap";
export default WebMap;
