/**
 * WebMap — versão nativa (Android / iOS).
 * Wrapper fino sobre react-native-webview para normalizar a API.
 */
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import RNWebView, { WebView } from "react-native-webview";

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
  const webRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    postMessage: (data: string) => {
      webRef.current?.postMessage(data);
    },
  }));

  return (
    <RNWebView
      ref={webRef}
      source={{ html: props.html }}
      onMessage={(event) => props.onMessage?.(event.nativeEvent.data)}
      onLoadEnd={props.onLoadEnd}
      javaScriptEnabled
      domStorageEnabled
      style={props.style}
    />
  );
});

WebMap.displayName = "WebMap";
export default WebMap;
