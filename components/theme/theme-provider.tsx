import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { loadTheme, saveTheme } from "@/lib/storage";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    void (async () => {
      const t = await loadTheme();
      if (t) Uniwind.setTheme(t);
    })();
  }, []);
  return <>{children}</>;
};

export const setAndPersistTheme = (theme: "light" | "dark" | "system") => {
  Uniwind.setTheme(theme);
  void saveTheme(theme);
};
