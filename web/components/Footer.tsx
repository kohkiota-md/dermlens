import ModelDetailsPanel from "@/components/ModelDetailsPanel";

type ModelTab = "v3a" | "v10";

interface Props {
  activeTab: ModelTab;
  modelDescription: string;
}

export default function Footer({ activeTab, modelDescription }: Props) {
  return (
    <footer className="pt-6 pb-8 border-t border-slate-200 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs text-slate-400">{modelDescription}</p>
        <p className="text-xs text-slate-400">Built by a dermatologist.</p>
        <p className="text-xs text-slate-300">
          This tool is for demonstration purposes only and is not a medical
          device.
        </p>
      </div>

      <ModelDetailsPanel activeTab={activeTab} />
    </footer>
  );
}
