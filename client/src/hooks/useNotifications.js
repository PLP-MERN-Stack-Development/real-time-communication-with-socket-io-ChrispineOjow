import { useCallback, useEffect, useRef } from 'react';

const SOUND_SRC =
  'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgP/7EMwDsA4AD4AAgAEABAAAAAAAf/7EMwDiw4AAD4AAggEABAAAAAAAf/7EMwDjA4AAD4AAggEABAAAAAAAf/7EMwDmQ4AAD4AAggEABAAAAAAAf/7EMA=';

export const useNotifications = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(SOUND_SRC);
  }, []);

  const playSound = useCallback(() => {
    try {
      audioRef.current?.play?.();
    } catch {
      // ignored
    }
  }, []);

  const triggerBrowserNotification = useCallback((title, options) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, options);
        }
      });
    }
  }, []);

  return { playSound, triggerBrowserNotification };
};


