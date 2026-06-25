import {
  type AppRuntimeCtx,
  type Dispose,
  defineApp,
  makeTranslator,
  RuntimeProvider,
} from "@tokimo/sdk";
import {
  ConfigProvider,
  ToastProvider,
  enUS as uiEnUS,
  zhCN as uiZhCN,
} from "@tokimo/ui";
import { Brain } from "lucide-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { enUS, zhCN } from "./i18n";
import "./index.css";
import { AnalyzePanel } from "./components/AnalyzePanel";
import { HealthStatus } from "./components/HealthStatus";
import { SettingsPanel } from "./components/SettingsPanel";

type Tab = "analyze" | "health" | "settings";

function ImageCortexWindow({ ctx }: { ctx: AppRuntimeCtx }) {
  const t = makeTranslator({ "zh-CN": zhCN, "en-US": enUS }, ctx.locale);
  const [tab, setTab] = useState<Tab>("analyze");

  return (
    <div className="flex h-full w-full flex-col bg-surface-base text-fg-primary">
      <header className="flex items-center gap-3 border-b border-base px-4 py-3">
        <Brain size={20} className="text-accent-text" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{t("title")}</span>
          <span className="text-xs text-fg-secondary">{t("subtitle")}</span>
        </div>
        <nav className="ml-auto flex gap-1">
          {(["analyze", "health", "settings"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`cursor-pointer rounded px-3 py-1.5 text-xs transition ${
                tab === id
                  ? "bg-accent-subtle text-accent-text"
                  : "text-fg-secondary hover:bg-fill-secondary hover:text-fg-primary"
              }`}
            >
              {t(id)}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {tab === "analyze" && <AnalyzePanel t={t} ctx={ctx} />}
        {tab === "health" && <HealthStatus t={t} />}
        {tab === "settings" && <SettingsPanel t={t} />}
      </main>
    </div>
  );
}

export default defineApp({
  id: "image-cortex",
  manifest: {
    id: "image-cortex",
    appName: "Image Cortex",
    icon: "Brain",
    color: "#6366f1",
    windowType: "image-cortex",
    defaultSize: { width: 900, height: 700 },
    category: "app",
  },
  translations: { "zh-CN": zhCN, "en-US": enUS },
  mount(container, ctx): Dispose {
    const root = createRoot(container);
    const locale = ctx.locale.startsWith("zh") ? uiZhCN : uiEnUS;
    root.render(
      <StrictMode>
        <ConfigProvider locale={locale}>
          <ToastProvider>
            <RuntimeProvider value={ctx}>
              <ImageCortexWindow ctx={ctx} />
            </RuntimeProvider>
          </ToastProvider>
        </ConfigProvider>
      </StrictMode>,
    );
    return () => root.unmount();
  },
});
