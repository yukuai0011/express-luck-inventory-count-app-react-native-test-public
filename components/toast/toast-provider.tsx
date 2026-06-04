import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type ToastEntry = { id: number; message: string };

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string) => {
    setToasts((prev) => {
      if (prev.some((t) => t.message === message)) return prev;
      const id = Date.now() + Math.random();
      const next = [...prev, { id, message }].slice(-3);
      setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      }, 2000);
      return next;
    });
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-12 items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(180)}
            className={cn(
              "rounded-md bg-gray-900 px-3 py-2 dark:bg-gray-100"
            )}
          >
            <Text className="text-sm text-white dark:text-gray-900">{t.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
