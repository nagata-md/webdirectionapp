import type { KeyboardEvent } from "react";

// IME（日本語入力）の変換確定時のEnterと、項目追加のEnterを区別する。
// isComposing中のEnterは無視しないと、変換途中の文字列で追加が発火してしまう。
export function onEnterKey(callback: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      callback();
    }
  };
}
